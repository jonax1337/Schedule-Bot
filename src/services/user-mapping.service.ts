import {
  getUserMappings,
  getUserMapping,
  addUserMapping,
  updateUserMapping,
  removeUserMapping,
  type UserMapping,
} from '../repositories/user-mapping.repository.js';
import { syncUserMappingsToSchedules } from '../repositories/schedule.repository.js';

/**
 * User Mapping Service - Business logic for user mapping operations
 */
export class UserMappingService {
  /**
   * Get all user mappings
   */
  async getAllMappings(): Promise<UserMapping[]> {
    return await getUserMappings();
  }

  /**
   * Get user mapping by Discord ID
   */
  async getMappingByDiscordId(discordId: string): Promise<UserMapping | null> {
    return await getUserMapping(discordId);
  }

  /**
   * Get user mapping by username
   */
  async getMappingByUsername(username: string): Promise<UserMapping | null> {
    const mappings = await getUserMappings();
    return mappings.find(m => m.displayName === username) || null;
  }

  /**
   * Add new user mapping and sync to schedules
   */
  async addMapping(mapping: UserMapping): Promise<void> {
    await addUserMapping(mapping);
    await syncUserMappingsToSchedules();
  }

  /**
   * Update user mapping and sync to schedules
   */
  async updateMapping(discordId: string, updates: Partial<UserMapping>): Promise<void> {
    await updateUserMapping(discordId, updates);
    await syncUserMappingsToSchedules();
  }

  /**
   * Remove user mapping and sync to schedules
   */
  async removeMapping(discordId: string): Promise<boolean> {
    const success = await removeUserMapping(discordId);
    if (success) {
      await syncUserMappingsToSchedules();
    }
    return success;
  }

  /**
   * Validate user exists
   */
  async validateUser(discordId: string): Promise<boolean> {
    const mapping = await getUserMapping(discordId);
    return mapping !== null;
  }
}

export const userMappingService = new UserMappingService();
