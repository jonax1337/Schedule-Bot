import * as XLSXNamespace from 'xlsx';
import { PrismaClient, UserRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const XLSX = XLSXNamespace.default || XLSXNamespace;
const prisma = new PrismaClient();

/**
 * Import data from Legacy Google Sheets Excel format into PostgreSQL
 */
async function importFromExcelLegacy(filePath: string) {
  console.log('='.repeat(60));
  console.log('Legacy Excel Import - Google Sheets to PostgreSQL');
  console.log('='.repeat(60));
  console.log();

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    process.exit(1);
  }

  console.log(`📂 Reading Excel file: ${filePath}`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    console.log(`✅ Excel file loaded successfully`);
    console.log(`📊 Available sheets: ${workbook.SheetNames.join(', ')}`);
    console.log();

    // Import User Mappings first
    if (workbook.SheetNames.includes('UserMapping')) {
      await importUserMappingsLegacy(workbook);
    } else {
      console.log('⚠️  Warning: "UserMapping" sheet not found.');
      console.log();
    }

    // Import Schedule data
    if (workbook.SheetNames.includes('Schedule')) {
      await importScheduleLegacy(workbook);
    } else {
      console.log('⚠️  Warning: "Schedule" sheet not found.');
      console.log();
    }

    // Import Settings
    if (workbook.SheetNames.includes('Settings')) {
      await importSettingsLegacy(workbook);
    } else {
      console.log('ℹ️  Info: "Settings" sheet not found.');
      console.log();
    }

    // Import Scrims/Matches
    if (workbook.SheetNames.includes('Matches')) {
      await importMatchesLegacy(workbook);
    } else {
      console.log('ℹ️  Info: "Matches" sheet not found.');
      console.log();
    }

    console.log('='.repeat(60));
    console.log('✅ Import completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Import User Mappings from Legacy format
 */
async function importUserMappingsLegacy(workbook: any) {
  console.log('👥 Importing User Mappings...');
  
  const sheet = workbook.Sheets['UserMapping'];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} user mapping(s)`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    const discordId = String(row['Discord ID'] || '').trim();
    const discordUsername = String(row['Discord Username'] || '').trim();
    const displayName = String(row['Sheet Column Name'] || '').trim();
    const role = String(row['Role'] || 'main').toLowerCase();

    if (!discordId || !displayName) {
      console.log(`   ⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    try {
      const userRole = role === 'sub' ? UserRole.SUB : 
                       role === 'coach' ? UserRole.COACH : 
                       UserRole.MAIN;

      const existing = await prisma.userMapping.findUnique({
        where: { discordId },
      });

      if (existing) {
        await prisma.userMapping.update({
          where: { discordId },
          data: {
            displayName,
            role: userRole,
            discordUsername: discordUsername || displayName,
          },
        });
        console.log(`   ✏️  Updated: ${displayName} (${discordId})`);
        updated++;
      } else {
        await prisma.userMapping.create({
          data: {
            discordId,
            displayName,
            role: userRole,
            discordUsername: discordUsername || displayName,
          },
        });
        console.log(`   ✅ Created: ${displayName} (${discordId})`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${displayName}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Import Schedule from Legacy format
 */
async function importScheduleLegacy(workbook: any) {
  console.log('📅 Importing Schedule Data...');
  
  const sheet = workbook.Sheets['Schedule'];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} schedule row(s)`);

  // Get all user mappings
  const userMappings = await prisma.userMapping.findMany();
  const displayNameToIdMap = new Map(
    userMappings.map(m => [m.displayName, m.discordId])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    if (!row['Date']) {
      console.log(`   ⚠️  Skipping row without date`);
      skipped++;
      continue;
    }

    try {
      // Convert Excel serial date to DD.MM.YYYY
      const date = excelDateToString(row['Date']);
      
      // Get reason
      const reason = String(row['Reason'] || '').trim();

      // Check if schedule exists
      const existing = await prisma.schedule.findUnique({
        where: { date },
      });

      let schedule;
      if (existing) {
        schedule = await prisma.schedule.update({
          where: { date },
          data: { reason: reason || '' },
        });
        updated++;
      } else {
        schedule = await prisma.schedule.create({
          data: { 
            date,
            reason: reason || '',
            focus: '',
          },
        });
        created++;
      }

      // Process all player columns
      for (const [columnName, availability] of Object.entries(row)) {
        if (columnName === 'Date' || columnName === 'Reason' || columnName === 'Focus') {
          continue;
        }

        if (!availability || availability === '') continue;

        const discordId = displayNameToIdMap.get(columnName);
        if (!discordId) {
          continue; // Skip unknown players
        }

        const userMapping = userMappings.find(m => m.discordId === discordId);
        if (!userMapping) continue;

        // Check if player entry exists
        const existingPlayer = await prisma.schedulePlayer.findFirst({
          where: {
            scheduleId: schedule.id,
            userId: discordId,
          },
        });

        if (existingPlayer) {
          await prisma.schedulePlayer.update({
            where: { id: existingPlayer.id },
            data: { availability: String(availability) },
          });
        } else {
          await prisma.schedulePlayer.create({
            data: {
              scheduleId: schedule.id,
              userId: discordId,
              displayName: userMapping.displayName,
              role: userMapping.role,
              availability: String(availability),
            },
          });
        }
      }

      console.log(`   ✅ ${existing ? 'Updated' : 'Created'}: ${date}`);

    } catch (error) {
      console.error(`   ❌ Error processing date ${row['Date']}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Import Settings from Legacy format (vertical key-value pairs)
 * Format: Each row has [key, value] in columns A and B
 */
async function importSettingsLegacy(workbook: any) {
  console.log('⚙️  Importing Settings...');
  
  const sheet = workbook.Sheets['Settings'];
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (data.length === 0) {
    console.log('   ⚠️  Settings sheet is empty');
    console.log();
    return;
  }

  console.log(`   Found ${data.length} setting row(s)`);

  // Legacy format: Each row is [key, value]
  // Row 0: [discord.channelId, 1462528924620947456]
  // Row 1: [discord.pingRoleId, 1452303455606800405]
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    if (!row || row.length < 2) {
      skipped++;
      continue;
    }

    const key = String(row[0] || '').trim();
    const value = String(row[1] || '').trim();

    // Skip if key or value is empty
    if (!key || !value) {
      skipped++;
      continue;
    }

    // Skip if it looks like a numeric ID as key (probably malformed data)
    if (/^\d+$/.test(key)) {
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.setting.findUnique({
        where: { key },
      });

      if (existing) {
        await prisma.setting.update({
          where: { key },
          data: { value },
        });
        console.log(`   ✏️  Updated: ${key} = ${value}`);
        updated++;
      } else {
        await prisma.setting.create({
          data: { key, value },
        });
        console.log(`   ✅ Created: ${key} = ${value}`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing setting ${key}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Import Matches/Scrims from Legacy format
 */
async function importMatchesLegacy(workbook: any) {
  console.log('🎮 Importing Matches/Scrims...');
  
  const sheet = workbook.Sheets['Matches'];
  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} match(es)`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    const id = String(row['ID'] || '').trim();
    const date = String(row['Date'] || '').trim();
    const opponent = String(row['Opponent'] || '').trim();
    const result = String(row['Result'] || 'draw').toLowerCase();

    if (!id || !date || !opponent) {
      console.log(`   ⚠️  Skipping invalid match: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    try {
      const scrimResult = result === 'win' ? 'WIN' : 
                         result === 'loss' ? 'LOSS' : 
                         'DRAW';

      const existing = await prisma.scrim.findUnique({
        where: { id },
      });

      const scrimData = {
        date,
        opponent,
        result: scrimResult as any,
        scoreUs: parseInt(String(row['Score Us'] || '0')) || 0,
        scoreThem: parseInt(String(row['Score Them'] || '0')) || 0,
        map: String(row['Maps'] || ''),
        matchType: String(row['Match Type'] || ''),
        ourAgents: String(row['Our Agents'] || ''),
        theirAgents: String(row['Their Agents'] || ''),
        vodUrl: String(row['VOD URL'] || ''),
        notes: String(row['Notes'] || ''),
      };

      if (existing) {
        await prisma.scrim.update({
          where: { id },
          data: scrimData,
        });
        console.log(`   ✏️  Updated: ${opponent} (${date})`);
        updated++;
      } else {
        await prisma.scrim.create({
          data: {
            id,
            ...scrimData,
          },
        });
        console.log(`   ✅ Created: ${opponent} (${date})`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing match ${id}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Convert Excel serial date to DD.MM.YYYY string
 */
function excelDateToString(serial: number | string): string {
  if (typeof serial === 'string') {
    // Already a string, check if it's in DD.MM.YYYY format
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(serial)) {
      return serial;
    }
    // Try to parse as number
    serial = parseFloat(serial);
  }

  // Excel serial date (days since 1900-01-01, with 1900 incorrectly treated as leap year)
  const date = XLSX.SSF.parse_date_code(serial as number);
  const day = String(date.d).padStart(2, '0');
  const month = String(date.m).padStart(2, '0');
  const year = date.y;
  return `${day}.${month}.${year}`;
}

// Run import if called directly
const filePath = process.argv[2] || path.join(process.cwd(), 'import-data.xlsx');

importFromExcelLegacy(filePath)
  .then(() => {
    console.log('\n✅ All done! You can now start the bot.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });

export { importFromExcelLegacy };
