/**
 * Data Migration Script: Google Sheets → PostgreSQL
 * 
 * This script migrates existing data from Google Sheets to PostgreSQL.
 * Run this ONCE after setting up the PostgreSQL database.
 * 
 * Usage:
 *   1. Ensure both Google Sheets credentials and DATABASE_URL are configured
 *   2. npm run build
 *   3. node dist/scripts/migrate-data.js
 */

import { prisma } from '../src/database/client.js';

// Import OLD Google Sheets functions
import * as oldSheets from '../src/sheets.js';
import * as oldUserMapping from '../src/userMapping.js';
import * as oldAbsences from '../src/absences.js';
import * as oldScrims from '../src/scrims.js';

async function migrateSchedules() {
  console.log('\n📅 Migrating Schedules...');
  
  try {
    const sheetData = await oldSheets.getSheetDataRange(1, 100);
    
    if (!sheetData || sheetData.length < 2) {
      console.log('No schedule data found');
      return;
    }

    let migratedCount = 0;
    
    // Skip header row (index 0)
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      
      if (!row || !row[0]) continue; // Skip empty rows
      
      const date = row[0];
      
      // Check if already exists
      const existing = await prisma.schedule.findUnique({
        where: { date },
      });
      
      if (existing) {
        console.log(`  ⏭️  Schedule for ${date} already exists, skipping`);
        continue;
      }
      
      await prisma.schedule.create({
        data: {
          date: date,
          player1: row[1] || '',
          player2: row[2] || '',
          player3: row[3] || '',
          player4: row[4] || '',
          player5: row[5] || '',
          sub1: row[6] || '',
          sub2: row[7] || '',
          coach: row[8] || '',
          reason: row[9] || '',
          focus: row[10] || '',
        },
      });
      
      migratedCount++;
      console.log(`  ✅ Migrated schedule for ${date}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} schedules`);
  } catch (error) {
    console.error('❌ Error migrating schedules:', error);
    throw error;
  }
}

async function migrateUserMappings() {
  console.log('\n👥 Migrating User Mappings...');
  
  try {
    const mappings = await oldUserMapping.getUserMappings();
    
    if (!mappings || mappings.length === 0) {
      console.log('No user mappings found');
      return;
    }

    let migratedCount = 0;
    
    for (const mapping of mappings) {
      // Check if already exists
      const existing = await prisma.userMapping.findUnique({
        where: { discordId: mapping.discordId },
      });
      
      if (existing) {
        console.log(`  ⏭️  Mapping for ${mapping.discordUsername} already exists, skipping`);
        continue;
      }
      
      const roleEnum = mapping.role.toUpperCase() as 'MAIN' | 'SUB' | 'COACH';
      
      await prisma.userMapping.create({
        data: {
          discordId: mapping.discordId,
          discordUsername: mapping.discordUsername,
          sheetColumnName: mapping.sheetColumnName,
          role: roleEnum,
        },
      });
      
      migratedCount++;
      console.log(`  ✅ Migrated mapping for ${mapping.discordUsername}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} user mappings`);
  } catch (error) {
    console.error('❌ Error migrating user mappings:', error);
    throw error;
  }
}

async function migrateAbsences() {
  console.log('\n🏖️  Migrating Absences...');
  
  try {
    const absences = await oldAbsences.getAllAbsences(true);
    
    if (!absences || absences.length === 0) {
      console.log('No absences found');
      return;
    }

    let migratedCount = 0;
    
    for (const absence of absences) {
      // Check if already exists
      const existing = await prisma.absence.findUnique({
        where: { id: absence.id },
      });
      
      if (existing) {
        console.log(`  ⏭️  Absence ${absence.id} already exists, skipping`);
        continue;
      }
      
      await prisma.absence.create({
        data: {
          id: absence.id,
          userId: absence.discordId,
          username: absence.username,
          startDate: absence.startDate,
          endDate: absence.endDate,
          reason: absence.reason || null,
          createdAt: new Date(absence.createdAt),
        },
      });
      
      migratedCount++;
      console.log(`  ✅ Migrated absence for ${absence.username} (${absence.startDate} - ${absence.endDate})`);
    }
    
    console.log(`✅ Migrated ${migratedCount} absences`);
  } catch (error) {
    console.error('❌ Error migrating absences:', error);
    throw error;
  }
}

async function migrateScrims() {
  console.log('\n🎮 Migrating Scrims/Matches...');
  
  try {
    const scrims = await oldScrims.getAllScrims();
    
    if (!scrims || scrims.length === 0) {
      console.log('No scrims found');
      return;
    }

    let migratedCount = 0;
    
    for (const scrim of scrims) {
      // Check if already exists
      const existing = await prisma.scrim.findUnique({
        where: { id: scrim.id },
      });
      
      if (existing) {
        console.log(`  ⏭️  Scrim ${scrim.id} already exists, skipping`);
        continue;
      }
      
      const resultEnum = scrim.result.toUpperCase() as 'WIN' | 'LOSS' | 'DRAW';
      
      await prisma.scrim.create({
        data: {
          id: scrim.id,
          date: scrim.date,
          opponent: scrim.opponent,
          result: resultEnum,
          scoreUs: scrim.scoreUs,
          scoreThem: scrim.scoreThem,
          map: scrim.map || '',
          matchType: scrim.matchType || '',
          ourAgents: scrim.ourAgents.join(','),
          theirAgents: scrim.theirAgents.join(','),
          vodUrl: scrim.vodUrl || '',
          notes: scrim.notes || '',
          createdAt: new Date(scrim.createdAt),
          updatedAt: new Date(scrim.updatedAt),
        },
      });
      
      migratedCount++;
      console.log(`  ✅ Migrated scrim vs ${scrim.opponent} (${scrim.date})`);
    }
    
    console.log(`✅ Migrated ${migratedCount} scrims`);
  } catch (error) {
    console.error('❌ Error migrating scrims:', error);
    throw error;
  }
}

async function migrateSettings() {
  console.log('\n⚙️  Migrating Settings...');
  
  try {
    const settings = await oldSheets.getSettingsFromSheet();
    
    if (!settings) {
      console.log('No settings found');
      return;
    }

    const settingsData = [
      { key: 'discord.channelId', value: settings.discord.channelId },
      { key: 'discord.pingRoleId', value: settings.discord.pingRoleId || '' },
      { key: 'discord.allowDiscordAuth', value: settings.discord.allowDiscordAuth.toString() },
      { key: 'scheduling.dailyPostTime', value: settings.scheduling.dailyPostTime },
      { key: 'scheduling.reminderHoursBefore', value: settings.scheduling.reminderHoursBefore.toString() },
      { key: 'scheduling.trainingStartPollEnabled', value: settings.scheduling.trainingStartPollEnabled.toString() },
      { key: 'scheduling.timezone', value: settings.scheduling.timezone },
      { key: 'scheduling.cleanChannelBeforePost', value: settings.scheduling.cleanChannelBeforePost.toString() },
    ];

    let migratedCount = 0;
    
    for (const setting of settingsData) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
      
      migratedCount++;
      console.log(`  ✅ Migrated setting: ${setting.key}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} settings`);
  } catch (error) {
    console.error('❌ Error migrating settings:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Data Migration: Google Sheets → PostgreSQL\n');
  console.log('=' .repeat(60));
  
  try {
    await migrateSettings();
    await migrateUserMappings();
    await migrateSchedules();
    await migrateAbsences();
    await migrateScrims();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify data in Prisma Studio: npm run db:studio');
    console.log('2. Test the application: npm run dev');
    console.log('3. Once verified, you can remove Google Sheets dependencies');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
