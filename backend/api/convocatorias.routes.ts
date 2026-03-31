import { Router } from 'express';
import { ConvocatoriasService } from '../services/convocatorias.service.ts';

const router = Router();

// POST /api/convocatorias/generate — Genera convocatoria con plantilla LPH
router.post('/generate', async (req, res) => {
  try {
    const body = req.body;
    if (!body.communityId || !body.fechaJunta || !body.fechaCarta) {
      return res.status(400).json({
        error: 'Faltan campos obligatorios: communityId, fechaJunta, fechaCarta',
      });
    }
    const result = await ConvocatoriasService.generate(body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/convocatorias — Listar convocatorias
router.get('/', async (req, res) => {
  try {
    const data = await ConvocatoriasService.list(req.query.communityId as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/convocatorias/:id — Obtener por ID
router.get('/:id', async (req, res) => {
  try {
    const data = await ConvocatoriasService.getById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Convocatoria no encontrada' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/convocatorias/:id — Eliminar
router.delete('/:id', async (req, res) => {
  try {
    const result = await ConvocatoriasService.delete(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
