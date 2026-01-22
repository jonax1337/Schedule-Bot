import { prisma } from './client.js';

export interface UserMapping {
  discordId: string;
  discordUsername: string;
  sheetColumnName: string;
  role: 'main' | 'sub' | 'coach';
}

export async function getUserMappings(): Promise<UserMapping[]> {
  const mappings = await prisma.userMapping.findMany({
    orderBy: { id: 'asc' },
  });

  return mappings.map(m => ({
    discordId: m.discordId,
    discordUsername: m.discordUsername,
    sheetColumnName: m.sheetColumnName,
    role: m.role.toLowerCase() as 'main' | 'sub' | 'coach',
  }));
}

export async function addUserMapping(mapping: UserMapping): Promise<void> {
  const roleEnum = mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH';
  
  await prisma.userMapping.create({
    data: {
      discordId: mapping.discordId,
      discordUsername: mapping.discordUsername,
      sheetColumnName: mapping.sheetColumnName,
      role: roleEnum,
    },
  });
}

export async function getUserMapping(discordId: string): Promise<UserMapping | null> {
  const mapping = await prisma.userMapping.findUnique({
    where: { discordId },
  });

  if (!mapping) return null;

  return {
    discordId: mapping.discordId,
    discordUsername: mapping.discordUsername,
    sheetColumnName: mapping.sheetColumnName,
    role: mapping.role.toLowerCase() as 'main' | 'sub' | 'coach',
  };
}

export async function removeUserMapping(discordId: string): Promise<boolean> {
  try {
    await prisma.userMapping.delete({
      where: { discordId },
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function initializeUserMappingSheet(): Promise<void> {
  console.log('User mappings table initialized (PostgreSQL)');
}
