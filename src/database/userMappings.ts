import { prisma } from './client.js';

export interface UserMapping {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: 'main' | 'sub' | 'coach';
  sortOrder: number;
}

export async function getUserMappings(): Promise<UserMapping[]> {
  const mappings = await prisma.userMapping.findMany({
    orderBy: [
      { role: 'asc' },
      { sortOrder: 'asc' },
    ],
  });

  return mappings.map(m => ({
    discordId: m.discordId,
    discordUsername: m.discordUsername,
    displayName: m.displayName,
    role: m.role.toLowerCase() as 'main' | 'sub' | 'coach',
    sortOrder: m.sortOrder,
  }));
}

export async function addUserMapping(mapping: UserMapping): Promise<void> {
  const roleEnum = mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH';
  
  await prisma.userMapping.create({
    data: {
      discordId: mapping.discordId,
      discordUsername: mapping.discordUsername,
      displayName: mapping.displayName,
      role: roleEnum,
      sortOrder: mapping.sortOrder,
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
    displayName: mapping.displayName,
    role: mapping.role.toLowerCase() as 'main' | 'sub' | 'coach',
    sortOrder: mapping.sortOrder,
  };
}

export async function updateUserMapping(discordId: string, updates: Partial<UserMapping>): Promise<void> {
  const data: any = {};
  
  if (updates.discordUsername) data.discordUsername = updates.discordUsername;
  if (updates.displayName) data.displayName = updates.displayName;
  if (updates.role) data.role = updates.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH';
  if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder;
  
  await prisma.userMapping.update({
    where: { discordId },
    data,
  });
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
