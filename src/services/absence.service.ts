import {
  getAbsencesForUser,
  getAllAbsences,
  createAbsence,
  updateAbsence,
  deleteAbsence,
  getAbsenceById,
  isUserAbsentOnDate,
  getAbsentUserIdsForDate,
  getAbsentUserIdsForDates,
  type AbsenceData,
} from '../repositories/absence.repository.js';

/**
 * Parse DD.MM.YYYY to Date for validation
 */
function parseGermanDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Absence Service - Business logic for absence/vacation management
 */
export class AbsenceService {
  /**
   * Get all absences for a specific user
   */
  async getAbsencesForUser(userId: string): Promise<AbsenceData[]> {
    return await getAbsencesForUser(userId);
  }

  /**
   * Get all absences (admin)
   */
  async getAllAbsences(): Promise<AbsenceData[]> {
    return await getAllAbsences();
  }

  /**
   * Create a new absence with validation
   */
  async createAbsence(
    userId: string,
    startDate: string,
    endDate: string,
    reason: string = '',
    requestingUserId?: string,
    isAdmin: boolean = false
  ): Promise<{ success: boolean; absence?: AbsenceData; error?: string }> {
    // Users can only create absences for themselves (unless admin)
    if (!isAdmin && requestingUserId !== userId) {
      return { success: false, error: 'You can only create absences for yourself' };
    }

    // Validate date format
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return { success: false, error: 'Dates must be in DD.MM.YYYY format' };
    }

    // Validate start date is before or equal to end date
    const start = parseGermanDate(startDate);
    const end = parseGermanDate(endDate);
    if (start > end) {
      return { success: false, error: 'Start date must be before or equal to end date' };
    }

    const absence = await createAbsence(userId, startDate, endDate, reason);
    return { success: true, absence };
  }

  /**
   * Update an existing absence with validation
   */
  async updateAbsence(
    id: number,
    data: { startDate?: string; endDate?: string; reason?: string },
    requestingUserId?: string,
    isAdmin: boolean = false
  ): Promise<{ success: boolean; absence?: AbsenceData; error?: string }> {
    // Check if absence exists
    const existing = await getAbsenceById(id);
    if (!existing) {
      return { success: false, error: 'Absence not found' };
    }

    // Users can only edit their own absences (unless admin)
    if (!isAdmin && requestingUserId !== existing.userId) {
      return { success: false, error: 'You can only edit your own absences' };
    }

    // Validate dates if provided
    const startDate = data.startDate || existing.startDate;
    const endDate = data.endDate || existing.endDate;
    const start = parseGermanDate(startDate);
    const end = parseGermanDate(endDate);
    if (start > end) {
      return { success: false, error: 'Start date must be before or equal to end date' };
    }

    const absence = await updateAbsence(id, data);
    if (!absence) {
      return { success: false, error: 'Failed to update absence' };
    }

    return { success: true, absence };
  }

  /**
   * Delete an absence with authorization
   */
  async deleteAbsence(
    id: number,
    requestingUserId?: string,
    isAdmin: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    // Check if absence exists
    const existing = await getAbsenceById(id);
    if (!existing) {
      return { success: false, error: 'Absence not found' };
    }

    // Users can only delete their own absences (unless admin)
    if (!isAdmin && requestingUserId !== existing.userId) {
      return { success: false, error: 'You can only delete your own absences' };
    }

    const success = await deleteAbsence(id);
    if (!success) {
      return { success: false, error: 'Failed to delete absence' };
    }

    return { success: true };
  }

  /**
   * Check if a user is absent on a specific date
   */
  async isUserAbsent(userId: string, date: string): Promise<boolean> {
    return await isUserAbsentOnDate(userId, date);
  }

  /**
   * Get all absent user IDs for a specific date
   */
  async getAbsentUserIdsForDate(date: string): Promise<string[]> {
    return await getAbsentUserIdsForDate(date);
  }

  /**
   * Get absent user IDs for multiple dates (batch)
   */
  async getAbsentUserIdsForDates(dates: string[]): Promise<Record<string, string[]>> {
    return await getAbsentUserIdsForDates(dates);
  }
}

export const absenceService = new AbsenceService();
