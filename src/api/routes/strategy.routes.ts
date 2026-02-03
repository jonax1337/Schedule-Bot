import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { verifyToken, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validation.js';
import { strategyService } from '../../services/strategy.service.js';
import { createStrategyImage, createStrategyFile, deleteStrategyFile } from '../../repositories/strategy.repository.js';
import { logger } from '../../shared/utils/logger.js';
import { createStrategySchema, updateStrategySchema } from '../../shared/middleware/validation.js';
import { sendOk, sendError, sendServerError, sendNotFound, sendForbidden } from '../../shared/utils/apiResponse.js';

const router = Router();

/** Middleware that checks strategy edit permission */
function requireEditPermission(req: AuthRequest, res: Response, next: NextFunction) {
  if (!strategyService.canEdit(req.user!.role)) {
    return sendForbidden(res, 'No permission to edit strategies');
  }
  next();
}

// --- Image upload setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'strategies')
  : path.resolve(__dirname, '../../../uploads/strategies');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const pdfUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// --- Routes ---

// Serve uploaded images (public)
router.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return sendNotFound(res, 'Image');
  }
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(filePath);
});

// Upload image (auth required)
router.post('/upload', verifyToken, (req: AuthRequest, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'File too large. Maximum 5MB.');
      }
      return sendError(res, err.message);
    }
    if (err) {
      return sendError(res, err.message);
    }
    if (!req.file) {
      return sendError(res, 'No file provided');
    }

    try {
      // Check edit permission
      if (!strategyService.canEdit(req.user!.role)) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return sendForbidden(res, 'No permission to upload images');
      }

      await createStrategyImage({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      const url = `/api/strategies/uploads/${req.file.filename}`;
      return sendOk(res, { url, filename: req.file.filename });
    } catch (error) {
      return sendServerError(res, error, 'Save image');
    }
  });
});

// List strategies (public read)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const map = req.query.map as string | undefined;
    const side = req.query.side as string | undefined;
    const folderIdParam = req.query.folderId as string | undefined;
    const filter: any = {};
    if (map) filter.map = map;
    if (side) filter.side = side;
    if (folderIdParam !== undefined) {
      filter.folderId = folderIdParam === 'null' || folderIdParam === '' ? null : parseInt(folderIdParam, 10);
    }

    const strategies = await strategyService.getAll(Object.keys(filter).length > 0 ? filter : undefined);
    return sendOk(res, { strategies });
  } catch (error) {
    return sendServerError(res, error, 'Fetch strategies');
  }
});

// --- Folder routes (must be before /:id) ---

// List folders
router.get('/folders', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const all = req.query.all === 'true';
    if (all) {
      const folders = await strategyService.getAllFolders();
      return sendOk(res, { folders });
    }
    const parentId = req.query.parentId as string | undefined;
    const pid = parentId && parentId !== 'null' && parentId !== '' ? parseInt(parentId, 10) : null;
    const folders = await strategyService.getFolders(pid);
    return sendOk(res, { folders });
  } catch (error) {
    return sendServerError(res, error, 'Fetch folders');
  }
});

// Get folder breadcrumb path
router.get('/folders/:id/path', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const folderPath = await strategyService.getFolderPath(id);
    return sendOk(res, { path: folderPath });
  } catch (error) {
    return sendServerError(res, error, 'Fetch folder path');
  }
});

// Create folder
router.post('/folders', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const { name, parentId } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'Name is required');
    }
    const folder = await strategyService.createFolder(name, parentId ?? null);
    return sendOk(res, { folder });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return sendError(res, 'A folder with that name already exists here', 409);
    }
    return sendServerError(res, error, 'Create folder');
  }
});

// Rename folder
router.put('/folders/:id', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'Name is required');
    }
    const folder = await strategyService.renameFolder(id, name);
    if (!folder) return sendNotFound(res, 'Folder');
    return sendOk(res, { folder });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return sendError(res, 'A folder with that name already exists here', 409);
    }
    return sendServerError(res, error, 'Rename folder');
  }
});

// Update folder color
router.put('/folders/:id/color', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const { color } = req.body;
    if (color !== null && (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color))) {
      return sendError(res, 'Invalid color format. Use #RRGGBB or null.');
    }
    const folder = await strategyService.updateFolderColor(id, color ?? null);
    if (!folder) return sendNotFound(res, 'Folder');
    return sendOk(res, { folder });
  } catch (error) {
    return sendServerError(res, error, 'Update folder color');
  }
});

// Delete folder (must be empty)
router.delete('/folders/:id', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const success = await strategyService.deleteFolder(id);
    if (!success) return sendError(res, 'Folder is not empty or not found');
    return sendOk(res, {});
  } catch (error) {
    return sendServerError(res, error, 'Delete folder');
  }
});

// Duplicate strategy
router.post('/duplicate/:id', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const strategy = await strategyService.duplicateStrategy(id, req.body.folderId);
    if (!strategy) return sendNotFound(res, 'Strategy');
    return sendOk(res, { strategy });
  } catch (error) {
    return sendServerError(res, error, 'Duplicate strategy');
  }
});

// Duplicate folder
router.post('/folders/:id/duplicate', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const folder = await strategyService.duplicateFolder(id);
    if (!folder) return sendNotFound(res, 'Folder');
    return sendOk(res, { folder });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return sendError(res, 'A folder with that name already exists', 409);
    }
    return sendServerError(res, error, 'Duplicate folder');
  }
});

// Move strategy to folder
router.put('/move/:id', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');
    const { folderId } = req.body;
    const success = await strategyService.moveStrategy(id, folderId ?? null);
    if (!success) return sendNotFound(res, 'Strategy or folder');
    return sendOk(res, {});
  } catch (error) {
    return sendServerError(res, error, 'Move strategy');
  }
});

// Get strategy by ID (public read)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');

    const strategy = await strategyService.getById(id);
    if (!strategy) return sendNotFound(res, 'Strategy');

    return sendOk(res, { strategy });
  } catch (error) {
    return sendServerError(res, error, 'Fetch strategy');
  }
});

// Create strategy (auth required, permission check)
router.post('/', verifyToken, requireEditPermission, validate(createStrategySchema), async (req: AuthRequest, res) => {
  try {
    const strategy = await strategyService.create({
      ...req.body,
      folderId: req.body.folderId ?? null,
      authorId: req.user!.username,
      authorName: req.user!.username,
    });

    return sendOk(res, { strategy });
  } catch (error) {
    return sendServerError(res, error, 'Create strategy');
  }
});

// Update strategy (auth required, permission check)
router.put('/:id', verifyToken, requireEditPermission, validate(updateStrategySchema), async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');

    const strategy = await strategyService.update(id, req.body);
    if (!strategy) return sendNotFound(res, 'Strategy');

    return sendOk(res, { strategy });
  } catch (error) {
    return sendServerError(res, error, 'Update strategy');
  }
});

// Delete strategy (auth required, permission check)
router.delete('/:id', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return sendError(res, 'Invalid ID');

    // Delete associated image files from disk
    const strategy = await strategyService.getById(id);
    if (!strategy) return sendNotFound(res, 'Strategy');

    const success = await strategyService.delete(id);
    if (!success) return sendServerError(res, new Error('Delete failed'), 'Delete strategy');

    // Clean up image files from disk (DB records cascade-deleted)
    if (strategy.content) {
      const filenames = strategyService.extractImageFilenames(strategy.content);
      for (const filename of filenames) {
        const filePath = path.join(UPLOAD_DIR, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
    // Clean up PDF files from disk (DB records cascade-deleted)
    if (strategy.files) {
      for (const file of strategy.files) {
        const filePath = path.join(UPLOAD_DIR, file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    logger.success('Strategy deleted', `"${strategy.title}" by ${req.user!.username}`);
    return sendOk(res, { message: 'Strategy deleted' });
  } catch (error) {
    return sendServerError(res, error, 'Delete strategy');
  }
});

// --- PDF File endpoints ---

// Serve PDF files inline (public)
router.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return sendNotFound(res, 'File');
  }
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.sendFile(filePath);
});

// Upload PDF to strategy (auth required)
router.post('/:id/files', verifyToken, (req: AuthRequest, res) => {
  pdfUpload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(res, 'File too large. Maximum 10MB.');
      }
      return sendError(res, err.message);
    }
    if (err) {
      return sendError(res, err.message);
    }
    if (!req.file) {
      return sendError(res, 'No file provided');
    }

    try {
      if (!strategyService.canEdit(req.user!.role)) {
        fs.unlinkSync(req.file.path);
        return sendForbidden(res, 'No permission to upload files');
      }

      const strategyId = parseInt(req.params.id as string, 10);
      if (isNaN(strategyId)) {
        fs.unlinkSync(req.file.path);
        return sendError(res, 'Invalid strategy ID');
      }

      const strategy = await strategyService.getById(strategyId);
      if (!strategy) {
        fs.unlinkSync(req.file.path);
        return sendNotFound(res, 'Strategy');
      }

      const file = await createStrategyFile({
        strategyId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      return sendOk(res, { file });
    } catch (error) {
      return sendServerError(res, error, 'Save file');
    }
  });
});

// Delete PDF file (auth required)
router.delete('/files/:fileId', verifyToken, requireEditPermission, async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.params.fileId as string, 10);
    if (isNaN(fileId)) return sendError(res, 'Invalid file ID');

    const filename = await deleteStrategyFile(fileId);
    if (!filename) return sendNotFound(res, 'File');

    // Clean up from disk
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return sendOk(res, { message: 'File deleted' });
  } catch (error) {
    return sendServerError(res, error, 'Delete file');
  }
});

export default router;
