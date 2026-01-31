import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { verifyToken, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validation.js';
import { strategyService } from '../../services/strategy.service.js';
import { createStrategyImage, createStrategyFile, getStrategyFile, deleteStrategyFile } from '../../repositories/strategy.repository.js';
import { logger } from '../../shared/utils/logger.js';
import { createStrategySchema, updateStrategySchema } from '../../shared/middleware/validation.js';

const router = Router();

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
    return res.status(404).json({ error: 'Image not found' });
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
        return res.status(400).json({ error: 'File too large. Maximum 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      // Check edit permission
      if (!strategyService.canEdit(req.user!.role)) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'No permission to upload images' });
      }

      await createStrategyImage({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      const url = `/api/strategies/uploads/${req.file.filename}`;
      res.json({ success: true, url, filename: req.file.filename });
    } catch (error) {
      logger.error('Error saving image record', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Failed to save image' });
    }
  });
});

// List strategies (public read)
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const map = req.query.map as string | undefined;
    const side = req.query.side as string | undefined;
    const filter = (map || side) ? { map, side } : undefined;

    const strategies = await strategyService.getAll(filter);
    res.json({ success: true, strategies });
  } catch (error) {
    logger.error('Error fetching strategies', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch strategies' });
  }
});

// Get strategy by ID (public read)
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const strategy = await strategyService.getById(id);
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

    res.json({ success: true, strategy });
  } catch (error) {
    logger.error('Error fetching strategy', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch strategy' });
  }
});

// Create strategy (auth required, permission check)
router.post('/', verifyToken, validate(createStrategySchema), async (req: AuthRequest, res) => {
  try {
    if (!strategyService.canEdit(req.user!.role)) {
      return res.status(403).json({ error: 'No permission to create strategies' });
    }

    const strategy = await strategyService.create({
      ...req.body,
      authorId: req.user!.username, // username from JWT (display name or discord id)
      authorName: req.user!.username,
    });

    res.json({ success: true, strategy });
  } catch (error) {
    logger.error('Error creating strategy', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

// Update strategy (auth required, permission check)
router.put('/:id', verifyToken, validate(updateStrategySchema), async (req: AuthRequest, res) => {
  try {
    if (!strategyService.canEdit(req.user!.role)) {
      return res.status(403).json({ error: 'No permission to edit strategies' });
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const strategy = await strategyService.update(id, req.body);
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

    res.json({ success: true, strategy });
  } catch (error) {
    logger.error('Error updating strategy', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

// Delete strategy (auth required, permission check)
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!strategyService.canEdit(req.user!.role)) {
      return res.status(403).json({ error: 'No permission to delete strategies' });
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    // Delete associated image files from disk
    const strategy = await strategyService.getById(id);
    if (!strategy) return res.status(404).json({ error: 'Strategy not found' });

    const success = await strategyService.delete(id);
    if (!success) return res.status(500).json({ error: 'Failed to delete strategy' });

    // Clean up image files from disk (DB records cascade-deleted)
    if (strategy.content) {
      const filenames = extractImageFilenames(strategy.content);
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
    res.json({ success: true, message: 'Strategy deleted' });
  } catch (error) {
    logger.error('Error deleting strategy', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

// --- PDF File endpoints ---

// Serve PDF files inline (public)
router.get('/files/:filename', (req, res) => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
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
        return res.status(400).json({ error: 'File too large. Maximum 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      if (!strategyService.canEdit(req.user!.role)) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ error: 'No permission to upload files' });
      }

      const strategyId = parseInt(req.params.id as string, 10);
      if (isNaN(strategyId)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid strategy ID' });
      }

      const strategy = await strategyService.getById(strategyId);
      if (!strategy) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Strategy not found' });
      }

      const file = await createStrategyFile({
        strategyId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      res.json({ success: true, file });
    } catch (error) {
      logger.error('Error saving file record', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Failed to save file' });
    }
  });
});

// Delete PDF file (auth required)
router.delete('/files/:fileId', verifyToken, async (req: AuthRequest, res) => {
  try {
    if (!strategyService.canEdit(req.user!.role)) {
      return res.status(403).json({ error: 'No permission to delete files' });
    }

    const fileId = parseInt(req.params.fileId as string, 10);
    if (isNaN(fileId)) return res.status(400).json({ error: 'Invalid file ID' });

    const filename = await deleteStrategyFile(fileId);
    if (!filename) return res.status(404).json({ error: 'File not found' });

    // Clean up from disk
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    logger.error('Error deleting file', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

function extractImageFilenames(content: any): string[] {
  const filenames: string[] = [];
  const walk = (node: any) => {
    if (!node) return;
    if (node.type === 'image' && node.attrs?.src) {
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

export default router;
