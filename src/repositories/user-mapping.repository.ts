import { prisma } from './database.repository.js';

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

async function calculateSortOrder(role: 'main' | 'sub' | 'coach'): Promise<number> {
  const mappings = await getUserMappings();
  
  // Count existing mappings by role
  const mainCount = mappings.filter(m => m.role === 'main').length;
  const subCount = mappings.filter(m => m.role === 'sub').length;
  
  // Main players: 0, 1, 2, 3, 4...
  if (role === 'main') {
    return mainCount;
  }
  
  // Subs: after last main player
  if (role === 'sub') {
    return mainCount + subCount;
  }
  
  // Coach: after last sub
  return mainCount + subCount;
}

async function reorderMappings(): Promise<void> {
  const mappings = await getUserMappings();
  
  let mainIndex = 0;
  let subIndex = 0;
  let coachIndex = 0;
  
  for (const mapping of mappings) {
    let newSortOrder = 0;
    
    if (mapping.role === 'main') {
      newSortOrder = mainIndex++;
    } else if (mapping.role === 'sub') {
      const mainCount = mappings.filter(m => m.role === 'main').length;
      newSortOrder = mainCount + subIndex++;
    } else if (mapping.role === 'coach') {
      const mainCount = mappings.filter(m => m.role === 'main').length;
      const subCount = mappings.filter(m => m.role === 'sub').length;
      newSortOrder = mainCount + subCount + coachIndex++;
    }
    
    if (mapping.sortOrder !== newSortOrder) {
      await prisma.userMapping.update({
        where: { discordId: mapping.discordId },
        data: { sortOrder: newSortOrder },
      });
    }
  }
}

export async function addUserMapping(mapping: Omit<UserMapping, 'sortOrder'>): Promise<void> {
  const roleEnum = mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH';
  const sortOrder = await calculateSortOrder(mapping.role);
  
  await prisma.userMapping.create({
    data: {
      discordId: mapping.discordId,
      discordUsername: mapping.discordUsername,
      displayName: mapping.displayName,
      role: roleEnum,
      sortOrder,
    },
  });
  
  // Reorder all mappings to ensure correct order
  await reorderMappings();
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
  
  // If role changed, reorder all mappings
  if (updates.role) {
    await reorderMappings();
  }
}

export async function removeUserMapping(discordId: string): Promise<boolean> {
  try {
    await prisma.userMapping.delete({
      where: { discordId },
    });
    
    // Reorder remaining mappings
    await reorderMappings();
    
    return true;
  } catch (error) {
    return false;
  }
}

