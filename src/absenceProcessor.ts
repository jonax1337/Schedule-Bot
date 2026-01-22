import { getUsersAbsentOnDate } from './database/absences.js';
import { getUserMappings } from './database/userMappings.js';
import { bulkUpdateSheetCells, getSheetDataRange, getSheetColumns } from './database/schedules.js';

export async function processAbsencesForDate(date: string, bulkUpdates: Array<{ row: number; column: string; value: string }>): Promise<number> {
  try {
    const absentUserIds = await getUsersAbsentOnDate(date);
    
    if (absentUserIds.length === 0) {
      return 0;
    }
    
    console.log(`[Absence Processor] Found ${absentUserIds.length} absent user(s) for ${date}`);
    
    const userMappings = await getUserMappings();
    const columns = await getSheetColumns();
    
    const sheetData = await getSheetDataRange(1, 50);
    const dateRowIndex = sheetData.findIndex((row, idx) => idx > 0 && row[0] === date);
    
    if (dateRowIndex === -1) {
      console.log(`[Absence Processor] Date ${date} not found in schedule`);
      return 0;
    }
    
    const actualRowNumber = dateRowIndex + 1;
    let updatedCount = 0;
    
    for (const userId of absentUserIds) {
      const userMapping = userMappings.find(m => m.discordId === userId);
      
      if (!userMapping) {
        console.log(`[Absence Processor] No mapping found for user ${userId}`);
        continue;
      }
      
      const userColumn = columns.find(c => c.name === userMapping.sheetColumnName);
      
      if (!userColumn) {
        console.log(`[Absence Processor] Column not found for ${userMapping.sheetColumnName}`);
        continue;
      }
      
      const currentValue = sheetData[dateRowIndex][userColumn.index] || '';
      
      if (currentValue.toLowerCase() !== 'x') {
        bulkUpdates.push({
          row: actualRowNumber,
          column: userColumn.column,
          value: 'x',
        });
        console.log(`[Absence Processor] Will mark ${userMapping.sheetColumnName} as absent (x) for ${date}`);
        updatedCount++;
      } else {
        console.log(`[Absence Processor] ${userMapping.sheetColumnName} already marked as absent for ${date}`);
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error(`[Absence Processor] Error processing absences for ${date}:`, error);
    throw error;
  }
}

export async function processAbsencesForNext14Days(): Promise<number> {
  try {
    console.log('[Absence Processor] Processing absences for next 14 days...');
    
    const today = new Date();
    const bulkUpdates: Array<{ row: number; column: string; value: string }> = [];
    
    // Collect all updates for all 14 days
    for (let i = 0; i < 14; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() + i);
      
      const day = String(checkDate.getDate()).padStart(2, '0');
      const month = String(checkDate.getMonth() + 1).padStart(2, '0');
      const year = checkDate.getFullYear();
      const dateStr = `${day}.${month}.${year}`;
      
      await processAbsencesForDate(dateStr, bulkUpdates);
    }
    
    // Send all updates in a single bulk operation
    if (bulkUpdates.length > 0) {
      console.log(`[Absence Processor] Sending ${bulkUpdates.length} updates as bulk operation...`);
      await bulkUpdateSheetCells(bulkUpdates);
      console.log(`[Absence Processor] Successfully updated ${bulkUpdates.length} cells in bulk`);
    } else {
      console.log('[Absence Processor] No updates needed');
    }
    
    return bulkUpdates.length;
  } catch (error) {
    console.error('[Absence Processor] Error processing absences:', error);
    throw error;
  }
}
