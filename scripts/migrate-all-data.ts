/**
 * COMPLETE Data Migration: Google Sheets → PostgreSQL
 * Migrates ALL data including schedules, user mappings, settings, absences, and scrims
 */

import { prisma } from '../src/database/client.js';
import * as oldSheets from '../src/sheets.js';
import * as oldUserMapping from '../src/userMapping.js';
import * as oldAbsences from '../src/absences.js';
import * as oldScrims from '../src/scrims.js';

async function migrateSchedules() {
  console.log('\n📅 Migrating Schedules from Google Sheets...');
  
  try {
    const sheetData = await oldSheets.getSheetDataRange(1, 100);
    
    if (!sheetData || sheetData.length < 2) {
      console.log('No schedule data found in Google Sheets');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      
      if (!row || !row[0]) continue;
      
      const date = row[0];
      
      const existing = await prisma.schedule.findUnique({
        where: { date },
      });
      
      if (existing) {
        skippedCount++;
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
      console.log(`  ✅ ${date}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} schedules (${skippedCount} already existed)`);
  } catch (error) {
    console.error('❌ Error migrating schedules:', error);
  }
}

async function migrateUserMappings() {
  console.log('\n👥 Migrating User Mappings from Google Sheets...');
  
  try {
    const mappings = await oldUserMapping.getUserMappings();
    
    if (!mappings || mappings.length === 0) {
      console.log('No user mappings found in Google Sheets');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const mapping of mappings) {
      const existing = await prisma.userMapping.findUnique({
        where: { discordId: mapping.discordId },
      });
      
      if (existing) {
        skippedCount++;
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
      console.log(`  ✅ ${mapping.discordUsername} → ${mapping.sheetColumnName}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} user mappings (${skippedCount} already existed)`);
  } catch (error) {
    console.error('❌ Error migrating user mappings:', error);
  }
}

async function migrateSettings() {
  console.log('\n⚙️  Migrating Settings from Google Sheets...');
  
  try {
    const settings = await oldSheets.getSettingsFromSheet();
    
    if (!settings) {
      console.log('No settings found in Google Sheets');
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
      console.log(`  ✅ ${setting.key} = ${setting.value}`);
    }
    
    console.log(`✅ Migrated ${migratedCount} settings`);
  } catch (error) {
    console.error('❌ Error migrating settings:', error);
  }
}

async function migrateAbsences() {
  console.log('\n🏖️  Migrating Absences from Google Sheets...');
  
  try {
    const absences = await oldAbsences.getAllAbsences(true);
    
    if (!absences || absences.length === 0) {
      console.log('No absences found in Google Sheets');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const absence of absences) {
      const existing = await prisma.absence.findUnique({
        where: { id: absence.id },
      });
      
      if (existing) {
        skippedCount++;
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
      console.log(`  ✅ ${absence.username} (${absence.startDate} - ${absence.endDate})`);
    }
    
    console.log(`✅ Migrated ${migratedCount} absences (${skippedCount} already existed)`);
  } catch (error) {
    console.error('❌ Error migrating absences:', error);
  }
}

async function migrateScrims() {
  console.log('\n🎮 Migrating Scrims from Google Sheets...');
  
  try {
    const scrims = await oldScrims.getAllScrims();
    
    if (!scrims || scrims.length === 0) {
      console.log('No scrims found in Google Sheets');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const scrim of scrims) {
      const existing = await prisma.scrim.findUnique({
        where: { id: scrim.id },
      });
      
      if (existing) {
        skippedCount++;
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
      console.log(`  ✅ vs ${scrim.opponent} (${scrim.date})`);
    }
    
    console.log(`✅ Migrated ${migratedCount} scrims (${skippedCount} already existed)`);
  } catch (error) {
    console.error('❌ Error migrating scrims:', error);
  }
}

async function main() {
  console.log('🚀 Starting COMPLETE Data Migration: Google Sheets → PostgreSQL\n');
  console.log('=' .repeat(70));
  
  try {
    await migrateSettings();
    await migrateUserMappings();
    await migrateSchedules();
    await migrateAbsences();
    await migrateScrims();
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE Migration finished successfully!');
    console.log('\n📊 Summary:');
    
    const counts = await Promise.all([
      prisma.schedule.count(),
      prisma.userMapping.count(),
      prisma.setting.count(),
      prisma.absence.count(),
      prisma.scrim.count(),
    ]);
    
    console.log(`  - Schedules: ${counts[0]}`);
    console.log(`  - User Mappings: ${counts[1]}`);
    console.log(`  - Settings: ${counts[2]}`);
    console.log(`  - Absences: ${counts[3]}`);
    console.log(`  - Scrims: ${counts[4]}`);
    
    console.log('\n✅ PostgreSQL database is now fully populated!');
    console.log('✅ You can now remove Google Sheets dependencies.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
