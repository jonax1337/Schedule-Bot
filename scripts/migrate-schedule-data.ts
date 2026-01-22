/**
 * Migration Script: Alte Schedule Daten zu dynamischen SchedulePlayer migrieren
 * 
 * Dieses Script:
 * 1. Liest alte Schedule Daten (player1-5, sub1-2, coach)
 * 2. Erstellt SchedulePlayer Einträge für jeden Player
 * 3. Migriert UserMappings (sheetColumnName -> displayName)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface OldSchedule {
  id: number;
  date: string;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  player5: string;
  sub1: string;
  sub2: string;
  coach: string;
  reason: string;
  focus: string;
}

interface OldUserMapping {
  id: number;
  discordId: string;
  discordUsername: string;
  sheetColumnName: string;
  role: 'MAIN' | 'SUB' | 'COACH';
}

async function migrateScheduleData() {
  console.log('🚀 Starting migration...');
  
  try {
    // Schritt 1: Alte Schedules aus Backup lesen
    console.log('📖 Reading old schedule data...');
    const oldSchedules = await prisma.$queryRaw<OldSchedule[]>`
      SELECT * FROM schedules_backup ORDER BY date
    `;
    console.log(`Found ${oldSchedules.length} schedules to migrate`);

    // Schritt 2: UserMappings lesen und migrieren
    console.log('📖 Reading user mappings...');
    const oldMappings = await prisma.$queryRaw<OldUserMapping[]>`
      SELECT * FROM user_mappings
    `;
    console.log(`Found ${oldMappings.length} user mappings`);

    // Mapping von alten Column Namen zu neuen Display Namen
    const columnToDisplayName: { [key: string]: string } = {
      'Player 1': 'Player 1',
      'Player 2': 'Player 2',
      'Player 3': 'Player 3',
      'Player 4': 'Player 4',
      'Player 5': 'Player 5',
      'Sub 1': 'Sub 1',
      'Sub 2': 'Sub 2',
      'Coach': 'Coach',
    };

    // UserMapping Update: sheetColumnName -> displayName
    console.log('🔄 Updating user mappings with displayName...');
    for (const mapping of oldMappings) {
      const displayName = columnToDisplayName[mapping.sheetColumnName] || mapping.sheetColumnName;
      const sortOrder = getSortOrder(mapping.sheetColumnName, mapping.role);
      
      await prisma.userMapping.update({
        where: { id: mapping.id },
        data: {
          displayName,
          sortOrder,
        },
      });
    }
    console.log('✅ User mappings updated');

    // Schritt 3: Für jeden Schedule, erstelle SchedulePlayer Einträge
    console.log('🔄 Migrating schedule data to dynamic players...');
    
    let migratedCount = 0;
    let skippedCount = 0;

    for (const oldSchedule of oldSchedules) {
      // Prüfe ob Schedule schon existiert
      const existingSchedule = await prisma.schedule.findUnique({
        where: { date: oldSchedule.date },
      });

      let scheduleId: number;

      if (existingSchedule) {
        scheduleId = existingSchedule.id;
        console.log(`Schedule for ${oldSchedule.date} already exists, using existing`);
      } else {
        // Erstelle neuen Schedule
        const newSchedule = await prisma.schedule.create({
          data: {
            date: oldSchedule.date,
            reason: oldSchedule.reason,
            focus: oldSchedule.focus,
          },
        });
        scheduleId = newSchedule.id;
      }

      // Definiere alle Player Fields
      const playerFields = [
        { field: 'player1', columnName: 'Player 1', role: 'MAIN' as const, sortOrder: 1 },
        { field: 'player2', columnName: 'Player 2', role: 'MAIN' as const, sortOrder: 2 },
        { field: 'player3', columnName: 'Player 3', role: 'MAIN' as const, sortOrder: 3 },
        { field: 'player4', columnName: 'Player 4', role: 'MAIN' as const, sortOrder: 4 },
        { field: 'player5', columnName: 'Player 5', role: 'MAIN' as const, sortOrder: 5 },
        { field: 'sub1', columnName: 'Sub 1', role: 'SUB' as const, sortOrder: 6 },
        { field: 'sub2', columnName: 'Sub 2', role: 'SUB' as const, sortOrder: 7 },
        { field: 'coach', columnName: 'Coach', role: 'COACH' as const, sortOrder: 8 },
      ];

      // Für jeden Player Field
      for (const playerField of playerFields) {
        const availability = (oldSchedule as any)[playerField.field] || '';
        
        // Finde UserMapping für diesen Column
        const mapping = oldMappings.find(m => m.sheetColumnName === playerField.columnName);
        
        if (mapping) {
          // Erstelle SchedulePlayer mit UserMapping
          await prisma.schedulePlayer.create({
            data: {
              scheduleId,
              userId: mapping.discordId,
              displayName: columnToDisplayName[playerField.columnName] || playerField.columnName,
              role: playerField.role,
              availability,
              sortOrder: playerField.sortOrder,
            },
          });
        } else if (availability) {
          // Kein Mapping gefunden, aber Availability vorhanden
          // Erstelle SchedulePlayer mit Default Namen
          await prisma.schedulePlayer.create({
            data: {
              scheduleId,
              userId: '', // Kein User zugeordnet
              displayName: playerField.columnName,
              role: playerField.role,
              availability,
              sortOrder: playerField.sortOrder,
            },
          });
        }
      }

      migratedCount++;
      if (migratedCount % 10 === 0) {
        console.log(`Migrated ${migratedCount}/${oldSchedules.length} schedules...`);
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   - Schedules migrated: ${migratedCount}`);
    console.log(`   - Schedules skipped: ${skippedCount}`);
    console.log(`   - User mappings updated: ${oldMappings.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function getSortOrder(columnName: string, role: 'MAIN' | 'SUB' | 'COACH'): number {
  const sortOrders: { [key: string]: number } = {
    'Player 1': 1,
    'Player 2': 2,
    'Player 3': 3,
    'Player 4': 4,
    'Player 5': 5,
    'Sub 1': 6,
    'Sub 2': 7,
    'Coach': 8,
  };
  
  return sortOrders[columnName] || 0;
}

// Run migration
migrateScheduleData()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
