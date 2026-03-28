import { Router } from 'express';
import { BankService } from '../services/bank.service.ts';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Procesar extracto bancario
router.post('/bank-statement/:communityId', upload.single('file'), async (req, res) => {
  try {
    const { communityId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    const results = await BankService.processStatement(communityId, file.buffer, file.originalname);
    res.json({ success: true, count: results.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener transacciones pendientes
router.get('/pending/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    const transactions = await BankService.getPendingTransactions(communityId);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolver devolución (vincular a propietario)
router.post('/resolve-return', async (req, res) => {
  try {
    const { transactionId, ownerId, unitId } = req.body;
    const result = await BankService.resolveReturn(transactionId, ownerId, unitId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
