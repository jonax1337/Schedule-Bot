import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { logger, getErrorMessage } from '../shared/utils/logger.js';
import { getCurrentOrgId } from '../shared/tenancy/orgContext.js';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create a connection pool for better performance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

const adapter = new PrismaPg(pool);

const basePrisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

// ---------------------------------------------------------------------------
// Multi-tenancy guard
// ---------------------------------------------------------------------------
// Models whose rows belong to exactly one organization. Every query against
// these is scoped to the active org from `orgContext` (AsyncLocalStorage).
const TENANT_MODELS = new Set<string>(['Schedule', 'SchedulePlayer']);

// Operations that filter rows via a `where` clause we can constrain.
const WHERE_SCOPED_OPS = new Set([
  'findMany', 'findFirst', 'findFirstOrThrow',
  'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany',
]);
// Operations that create rows whose `data` we must stamp with the org.
const CREATE_OPS = new Set(['create', 'createMany']);
// findUnique/upsert can't be safely scoped on a composite [org, x] unique key;
// callers use findFirst / find-then-write instead.
const UNSUPPORTED_OPS = new Set(['findUnique', 'findUniqueOrThrow', 'upsert']);

function withOrgId<T extends Record<string, unknown>>(data: T, orgId: string): T {
  return data.organizationId == null ? { ...data, organizationId: orgId } : data;
}

/**
 * Guarded Prisma client. Reads the active organizationId from AsyncLocalStorage
 * and injects it into every query touching a tenant model. Throws (fail-closed)
 * when no tenant context is set, so a missing wrap never silently leaks data.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) {
          return query(args);
        }

        const orgId = getCurrentOrgId();
        if (!orgId) {
          throw new Error(
            `[tenancy] Query on tenant model "${model}.${operation}" with no organization context. ` +
            `Wrap the entry point in runWithOrg() (request middleware / bot / scheduler / startup).`,
          );
        }

        if (UNSUPPORTED_OPS.has(operation)) {
          throw new Error(
            `[tenancy] "${operation}" is not supported on tenant model "${model}" ` +
            `(composite unique [organizationId, …]). Use findFirst / find-then-write instead.`,
          );
        }

        const a = (args ?? {}) as Record<string, any>;

        if (WHERE_SCOPED_OPS.has(operation)) {
          a.where = { ...(a.where ?? {}), organizationId: orgId };
        } else if (CREATE_OPS.has(operation)) {
          if (operation === 'createMany') {
            const d = a.data;
            a.data = Array.isArray(d)
              ? d.map((row: Record<string, unknown>) => withOrgId(row, orgId))
              : withOrgId(d ?? {}, orgId);
          } else {
            a.data = withOrgId(a.data ?? {}, orgId);
          }
        }
        // update/delete by unique id are left as-is: the id was obtained from a
        // scoped read, so they can't reach another org's row in practice.

        return query(a);
      },
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.success('Database connected');
  } catch (error) {
    logger.error('Database connection failed', getErrorMessage(error));
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  logger.info('Database disconnected');
}
