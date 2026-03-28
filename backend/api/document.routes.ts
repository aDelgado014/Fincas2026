import { Router } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service.ts';
import { StorageService } from '../services/storage.service.ts';
import { ownerAllowed, adminOnly } from './role.middleware.ts';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get documents for a community (accessible by owners of that community)
router.get('/community/:communityId', ownerAllowed, async (req, res) => {
  try {
    const documents = await DocumentService.getCommunityDocuments(req.params.communityId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch community documents' });
  }
});

// Admin routes for document management
router.post('/', adminOnly, upload.single('file'), async (req: any, res) => {
  try {
    const { communityId, title, description, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Guardar archivo físico
    const storageResult = await StorageService.uploadFile(file, `communities/${communityId}`);

    // 2. Registrar en base de datos
    const document = await DocumentService.addDocument({
      communityId,
      title,
      description,
      category,
      fileName: file.originalname,
      fileType: file.mimetype,
      // Guardamos la URL o ID del storage
      metadata: JSON.stringify({ storageId: storageResult.id, url: storageResult.url })
    } as any);

    res.status(201).json(document);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    await DocumentService.deleteDocument(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

router.post('/:id/sync-notion', adminOnly, async (req, res) => {
  try {
    const document = await DocumentService.getDocumentById(req.params.id);
    if (!document) return res.status(404).json({ error: 'Documento no encontrado' });

    const { NotionService } = await import('../services/notion.service.ts');
    // Parse metadata to get URL if it exists
    const docAny = document as any;
    const meta = docAny.metadata ? JSON.parse(docAny.metadata) : {};
    
    await NotionService.syncDocument({
      title: document.title,
      url: meta.url || ''
    });

    res.json({ message: 'Documento sincronizado con Notion' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
