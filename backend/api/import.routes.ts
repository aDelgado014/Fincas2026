import { Router } from 'express';
import multer from 'multer';
import { ImportService } from '../services/import.service.ts';
import { adminOnly } from './role.middleware.ts';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/parse-xls — Parsea Excel (Refactored)
router.post('/parse-xls', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const data = await ImportService.parseXls(req.file.buffer);
    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/parse-pdf — Parsea PDF (Digital u OCR) y estructura con IA
router.post('/parse-pdf', adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

    console.log('Iniciando procesamiento de PDF:', req.file.originalname);
    
    // 1. Extraer texto (Digital u OCR)
    const rawText = await ImportService.parsePdf(req.file.buffer);
    
    // 2. Estructurar con IA
    console.log('Estructurando datos con IA...');
    const structuredData = await ImportService.extractStructuredData(rawText);
    
    res.json(structuredData);
  } catch (error: any) {
    console.error('Error en parse-pdf:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/import/save — Guarda los datos confirmados
router.post('/save', adminOnly, async (req, res) => {
  try {
    const result = await ImportService.saveImportedData(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
