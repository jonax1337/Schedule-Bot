import {
  findAllStrategies,
  findStrategyById,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  linkOrphanImages,
  findFolders,
  findFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
  moveStrategy,
  duplicateStrategy,
  duplicateFolder,
  getFolderPath,
  type StrategyListItem,
  type StrategyDetail,
  type CreateStrategyData,
  type UpdateStrategyData,
  type FolderItem,
} from '../repositories/strategy.repository.js';
import { loadSettings } from '../shared/utils/settingsManager.js';

export class StrategyService {
  /** Check if user can edit strategies based on settings */
  canEdit(userRole: 'admin' | 'user'): boolean {
    if (userRole === 'admin') return true;
    const settings = loadSettings();
    return settings.stratbook.editPermission === 'all';
  }

  async getAll(filter?: { map?: string; side?: string; folderId?: number | null }): Promise<StrategyListItem[]> {
    return findAllStrategies(filter);
  }

  async getById(id: number): Promise<StrategyDetail | null> {
    return findStrategyById(id);
  }

  async create(data: CreateStrategyData): Promise<StrategyDetail> {
    const strategy = await createStrategy(data);
    // Link any images that were uploaded before the strategy was saved
    if (data.content) {
      const filenames = this.extractImageFilenames(data.content);
      await linkOrphanImages(filenames, strategy.id);
    }
    return strategy;
  }

  async update(id: number, data: UpdateStrategyData): Promise<StrategyDetail | null> {
    const strategy = await updateStrategy(id, data);
    if (strategy && data.content) {
      const filenames = this.extractImageFilenames(data.content);
      await linkOrphanImages(filenames, strategy.id);
    }
    return strategy;
  }

  async delete(id: number): Promise<boolean> {
    return deleteStrategy(id);
  }

  // --- Folder operations ---

  async getFolders(parentId: number | null): Promise<FolderItem[]> {
    return findFolders(parentId);
  }

  async getFolderPath(folderId: number): Promise<FolderItem[]> {
    return getFolderPath(folderId);
  }

  async createFolder(name: string, parentId: number | null): Promise<FolderItem> {
    return createFolder(name.trim(), parentId);
  }

  async renameFolder(id: number, name: string): Promise<FolderItem | null> {
    return updateFolder(id, { name: name.trim() });
  }

  async updateFolderColor(id: number, color: string | null): Promise<FolderItem | null> {
    return updateFolder(id, { color });
  }

  async deleteFolder(id: number): Promise<boolean> {
    return deleteFolder(id);
  }

  async duplicateStrategy(id: number, folderId?: number | null) {
    return duplicateStrategy(id, folderId);
  }

  async duplicateFolder(id: number) {
    return duplicateFolder(id);
  }

  async moveStrategy(id: number, folderId: number | null): Promise<boolean> {
    // Verify target folder exists if not null
    if (folderId !== null) {
      const folder = await findFolderById(folderId);
      if (!folder) return false;
    }
    return moveStrategy(id, folderId);
  }

  /** Extract image filenames from Tiptap JSON content */
  private extractImageFilenames(content: any): string[] {
    const filenames: string[] = [];
    const walk = (node: any) => {
      if (!node) return;
      if (node.type === 'image' && node.attrs?.src) {
        // Extract filename from URL like /api/strategies/uploads/1234_abc.png
        const match = node.attrs.src.match(/\/uploads\/([^/?]+)/);
        if (match) filenames.push(match[1]);
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(walk);
      }
    };
    walk(content);
    return filenames;
  }
}

export const strategyService = new StrategyService();
