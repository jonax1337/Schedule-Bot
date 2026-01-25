import {
  getAllScrims,
  getScrimById,
  addScrim,
  updateScrim,
  deleteScrim,
  getScrimStats,
  getScrimsByDateRange,
} from '../repositories/scrim.repository.js';
import type { ScrimEntry, ScrimStats } from '../shared/types/types.js';

/**
 * Scrim Service - Business logic for scrim/match tracking
 */
export class ScrimService {
  /**
   * Get all scrims
   */
  async getAllScrims(): Promise<ScrimEntry[]> {
    return await getAllScrims();
  }

  /**
   * Get scrim by ID
   */
  async getScrimById(id: string): Promise<ScrimEntry | null> {
    return await getScrimById(id);
  }

  /**
   * Add new scrim
   */
  async addScrim(scrim: Omit<ScrimEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScrimEntry> {
    return await addScrim(scrim);
  }

  /**
   * Update existing scrim
   */
  async updateScrim(
    id: string,
    updates: Partial<Omit<ScrimEntry, 'id' | 'createdAt'>>
  ): Promise<ScrimEntry | null> {
    return await updateScrim(id, updates);
  }

  /**
   * Delete scrim
   */
  async deleteScrim(id: string): Promise<boolean> {
    return await deleteScrim(id);
  }

  /**
   * Get scrim statistics
   */
  async getStats(): Promise<ScrimStats> {
    return await getScrimStats();
  }

  /**
   * Get scrims by date range
   */
  async getScrimsByDateRange(startDate: string, endDate: string): Promise<ScrimEntry[]> {
    return await getScrimsByDateRange(startDate, endDate);
  }

  /**
   * Get recent scrims with limit
   */
  async getRecentScrims(limit: number = 10): Promise<ScrimEntry[]> {
    const allScrims = await getAllScrims();
    
    // Sort by date (newest first)
    const sortedScrims = allScrims.sort((a, b) => {
      const parseDate = (dateStr: string) => {
        const [day, month, year] = dateStr.split('.').map(Number);
        return new Date(year, month - 1, day).getTime();
      };
      return parseDate(b.date) - parseDate(a.date);
    });

    return sortedScrims.slice(0, limit);
  }
}

export const scrimService = new ScrimService();
