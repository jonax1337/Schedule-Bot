import { getUsersAbsentOnDate } from './database/absences.js';
import { getUserMappings } from './database/userMappings.js';
import { updatePlayerAvailability, getNext14Dates } from './database/schedules.js';

export async function processAbsencesForDate(date: string): Promise<number> {
  try {
    const absentUserIds = await getUsersAbsentOnDate(date);
    
    if (absentUserIds.length === 0) {
      return 0;
    }
    
    console.log(`[Absence Processor] Found ${absentUserIds.length} absent user(s) for ${date}`);
    
    let updatedCount = 0;
    
    for (const userId of absentUserIds) {
      const success = await updatePlayerAvailability(date, userId, 'x');
      
      if (success) {
        updatedCount++;
        console.log(`[Absence Processor] Marked user ${userId} as absent (x) for ${date}`);
      } else {
        console.log(`[Absence Processor] Failed to mark user ${userId} as absent for ${date}`);
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
    
    const dates = getNext14Dates();
    let totalUpdated = 0;
    
    for (const date of dates) {
      const updated = await processAbsencesForDate(date);
      totalUpdated += updated;
    }
    
    if (totalUpdated > 0) {
      console.log(`[Absence Processor] Successfully updated ${totalUpdated} player entries`);
    } else {
      console.log('[Absence Processor] No updates needed');
    }
    
    return totalUpdated;
  } catch (error) {
    console.error('[Absence Processor] Error processing absences:', error);
    throw error;
  }
}
