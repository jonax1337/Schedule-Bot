/**
 * Generic mapper utilities for consistent data transformation across repositories
 */

/**
 * Maps an entity with Date timestamps to one with ISO string timestamps
 */
export function mapTimestamps<T extends { createdAt: Date; updatedAt: Date }>(
  entity: T
): Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } {
  const { createdAt, updatedAt, ...rest } = entity;
  return {
    ...rest,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

/**
 * Maps an array of entities with Date timestamps to ISO string timestamps
 */
export function mapTimestampsArray<T extends { createdAt: Date; updatedAt: Date }>(
  entities: T[]
): Array<Omit<T, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }> {
  return entities.map(mapTimestamps);
}

/**
 * Picks only specified fields from an object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omits specified fields from an object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
