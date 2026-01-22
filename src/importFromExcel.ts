import * as XLSX from 'xlsx';
import { PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ScheduleRow {
  Date: string;
  Player1?: string;
  Player2?: string;
  Player3?: string;
  Player4?: string;
  Player5?: string;
  Sub1?: string;
  Sub2?: string;
  Coach?: string;
  Reason?: string;
  Focus?: string;
}

interface UserMappingRow {
  DiscordId: string;
  DisplayName: string;
  Role: string;
}

interface SettingsRow {
  Key: string;
  Value: string;
}

/**
 * Import data from Excel file into PostgreSQL database
 */
async function importFromExcel(filePath: string) {
  console.log('='.repeat(60));
  console.log('Excel Import Tool - Google Sheets to PostgreSQL Migration');
  console.log('='.repeat(60));
  console.log();

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    console.log('\nPlease save your Excel file as "import-data.xlsx" in the project root.');
    process.exit(1);
  }

  console.log(`📂 Reading Excel file: ${filePath}`);
  
  try {
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    console.log(`✅ Excel file loaded successfully`);
    console.log(`📊 Available sheets: ${workbook.SheetNames.join(', ')}`);
    console.log();

    // Import User Mappings first (required for schedule import)
    if (workbook.SheetNames.includes('UserMapping')) {
      await importUserMappings(workbook);
    } else {
      console.log('⚠️  Warning: "UserMapping" sheet not found. Skipping user mappings import.');
      console.log('   Make sure user mappings exist in the database before importing schedules.');
      console.log();
    }

    // Import Schedule data
    if (workbook.SheetNames.includes('Schedule')) {
      await importSchedule(workbook);
    } else {
      console.log('⚠️  Warning: "Schedule" sheet not found. Skipping schedule import.');
      console.log();
    }

    // Import Settings (optional)
    if (workbook.SheetNames.includes('Settings')) {
      await importSettings(workbook);
    } else {
      console.log('ℹ️  Info: "Settings" sheet not found. Skipping settings import.');
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
 * Import User Mappings from Excel
 */
async function importUserMappings(workbook: XLSX.WorkBook) {
  console.log('👥 Importing User Mappings...');
  
  const sheet = workbook.Sheets['UserMapping'];
  const data: UserMappingRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} user mapping(s)`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    if (!row.DiscordId || !row.DisplayName) {
      console.log(`   ⚠️  Skipping invalid row: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    try {
      // Check if mapping already exists
      const existing = await prisma.userMapping.findUnique({
        where: { discordId: row.DiscordId },
      });

      if (existing) {
        // Update existing mapping
        await prisma.userMapping.update({
          where: { discordId: row.DiscordId },
          data: {
            displayName: row.DisplayName,
            role: (row.Role?.toUpperCase() as UserRole) || UserRole.MAIN,
            discordUsername: row.DisplayName,
          },
        });
        console.log(`   ✏️  Updated: ${row.DisplayName} (${row.DiscordId})`);
        updated++;
      } else {
        // Create new mapping
        await prisma.userMapping.create({
          data: {
            discordId: row.DiscordId,
            displayName: row.DisplayName,
            role: (row.Role?.toUpperCase() as UserRole) || UserRole.MAIN,
            discordUsername: row.DisplayName,
          },
        });
        console.log(`   ✅ Created: ${row.DisplayName} (${row.DiscordId})`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${row.DisplayName}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Import Schedule data from Excel
 */
async function importSchedule(workbook: XLSX.WorkBook) {
  console.log('📅 Importing Schedule Data...');
  
  const sheet = workbook.Sheets['Schedule'];
  const data: ScheduleRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} schedule row(s)`);

  // Get all user mappings to map display names to Discord IDs
  const userMappings = await prisma.userMapping.findMany();
  const nameToIdMap = new Map(
    userMappings.map(m => [m.displayName, m.discordId])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    if (!row.Date) {
      console.log(`   ⚠️  Skipping row without date`);
      skipped++;
      continue;
    }

    try {
      // Normalize date format (DD.MM.YYYY)
      const date = normalizeDate(row.Date);
      
      // Check if schedule already exists
      const existing = await prisma.schedule.findUnique({
        where: { date },
      });

      // Prepare schedule data
      const scheduleData = {
        date,
        reason: row.Reason || null,
        focus: row.Focus || null,
      };

      let schedule;
      if (existing) {
        schedule = await prisma.schedule.update({
          where: { date },
          data: scheduleData,
        });
        updated++;
      } else {
        schedule = await prisma.schedule.create({
          data: scheduleData,
        });
        created++;
      }

      // Process player availability
      const playerColumns = ['Player1', 'Player2', 'Player3', 'Player4', 'Player5', 'Sub1', 'Sub2', 'Coach'];
      
      for (const column of playerColumns) {
        const availability = row[column as keyof ScheduleRow];
        if (!availability) continue;

        const discordId = nameToIdMap.get(column);
        if (!discordId) {
          console.log(`   ⚠️  Warning: No Discord ID found for ${column}`);
          continue;
        }

        // Get user mapping for role and display name
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
          // Update existing player
          await prisma.schedulePlayer.update({
            where: { id: existingPlayer.id },
            data: {
              availability: String(availability),
            },
          });
        } else {
          // Create new player entry
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
      console.error(`   ❌ Error processing date ${row.Date}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Import Settings from Excel
 */
async function importSettings(workbook: XLSX.WorkBook) {
  console.log('⚙️  Importing Settings...');
  
  const sheet = workbook.Sheets['Settings'];
  const data: SettingsRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`   Found ${data.length} setting(s)`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of data) {
    if (!row.Key || !row.Value) {
      console.log(`   ⚠️  Skipping invalid setting: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    try {
      // Check if setting already exists
      const existing = await prisma.setting.findUnique({
        where: { key: row.Key },
      });

      if (existing) {
        await prisma.setting.update({
          where: { key: row.Key },
          data: { value: row.Value },
        });
        console.log(`   ✏️  Updated: ${row.Key} = ${row.Value}`);
        updated++;
      } else {
        await prisma.setting.create({
          data: {
            key: row.Key,
            value: row.Value,
          },
        });
        console.log(`   ✅ Created: ${row.Key} = ${row.Value}`);
        created++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing setting ${row.Key}:`, error);
      skipped++;
    }
  }

  console.log(`   📊 Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  console.log();
}

/**
 * Normalize date to DD.MM.YYYY format
 */
function normalizeDate(dateInput: string | number): string {
  // If it's an Excel serial date number
  if (typeof dateInput === 'number') {
    const date = XLSX.SSF.parse_date_code(dateInput);
    const day = String(date.d).padStart(2, '0');
    const month = String(date.m).padStart(2, '0');
    const year = date.y;
    return `${day}.${month}.${year}`;
  }

  // If it's already a string, ensure it's in DD.MM.YYYY format
  const dateStr = String(dateInput);
  
  // Check if already in DD.MM.YYYY format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse other formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Return as-is if can't parse
  return dateStr;
}

// Run import if called directly
if (require.main === module) {
  const filePath = process.argv[2] || path.join(process.cwd(), 'import-data.xlsx');
  
  importFromExcel(filePath)
    .then(() => {
      console.log('\n✅ All done! You can now start the bot.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import failed:', error);
      process.exit(1);
    });
}

export { importFromExcel };
