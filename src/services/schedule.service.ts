import {
  getScheduleForDate,
  getNext14DaysSchedule,
  getSchedulesForDates,
  updatePlayerAvailability,
  addMissingDays,
  syncUserMappingsToSchedules,
  getSchedulesPaginated,
} from '../repositories/schedule.repository.js';
import { parseSchedule, analyzeSchedule } from '../shared/utils/analyzer.js';
import type { ScheduleData, ScheduleAnalysisResult } from '../shared/types/types.js';

/**
 * Schedule Service - Business logic for schedule operations
 */
export class ScheduleService {
  /**
   * Get schedule with analysis for a specific date
   */
  async getScheduleWithAnalysis(date: string): Promise<{
    data: ScheduleData | null;
    analysis: ScheduleAnalysisResult | null;
  }> {
    const scheduleData = await getScheduleForDate(date);
    
    if (!scheduleData) {
      return { data: null, analysis: null };
    }

    const parsed = parseSchedule(scheduleData);
    const analysis = analyzeSchedule(parsed);

    return { data: scheduleData, analysis };
  }

  /**
   * Get next 14 days schedules
   */
  async getNext14Days(): Promise<ScheduleData[]> {
    return await getNext14DaysSchedule();
  }

  /**
   * Get schedules for multiple dates
   */
  async getSchedulesForDates(dates: string[]): Promise<ScheduleData[]> {
    return await getSchedulesForDates(dates);
  }

  /**
   * Update player availability with validation
   */
  async updateAvailability(
    date: string,
    userId: string,
    availability: string,
    requestingUserId?: string,
    isAdmin: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    // Validate that users can only edit their own availability (unless admin)
    if (!isAdmin && requestingUserId !== userId) {
      return {
        success: false,
        error: 'You can only edit your own availability',
      };
    }

    const success = await updatePlayerAvailability(date, userId, availability);

    if (!success) {
      return {
        success: false,
        error: 'Failed to update availability',
      };
    }

    return { success: true };
  }

  /**
   * Ensure all dates in next 14 days have schedule entries
   */
  async ensureMissingDays(): Promise<void> {
    await addMissingDays();
  }

  /**
   * Sync user mappings to all schedules
   */
  async syncUserMappings(): Promise<void> {
    await syncUserMappingsToSchedules();
  }

  /**
   * Get paginated schedules
   */
  async getPaginatedSchedules(offset: number = 0): Promise<{
    schedules: ScheduleData[];
    hasMore: boolean;
    totalPages: number;
  }> {
    return await getSchedulesPaginated(offset);
  }
}

export const scheduleService = new ScheduleService();
