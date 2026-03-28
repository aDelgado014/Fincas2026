import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index.ts';
import { communities, units, owners, unitOwners, charges, bankTransactions, notifications } from '../db/schema.ts';
import { adminOnly } from './role.middleware.ts';
import { ImportService } from '../services/import.service.ts';
import {
  DocumentExtractionService,
  classifyDocument,
  normalizeUnitType,
  type DocumentType,
  type ExtractedCommunityData,
} from '../services/document-extraction.service.ts';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── POST /classify — Classify a single file ───────────────────────────────
router.post('/classify', adminOnly, upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha subido ningún archivo' });

    let textSample = '';
    const mime = req.file.mimetype;

    if (mime === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf')) {
      const text = await ImportService.parsePdf(req.file.buffer);
      textSample = text.substring(0, 600);
    } else if (mime.includes('sheet') || mime.includes('excel') || req.file.originalname.match(/\.xlsx?$/i)) {
      const { read, utils } = await import('xlsx');
      const wb = read(req.file.buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      textSample = utils.sheet_to_csv(ws).substring(0, 600);
    }

    const classification = classifyDocument(req.file.originalname, textSample);
    res.json(classification);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /extract — Extract data from all uploaded files ─────────────────
router.post('/extract', adminOnly, upload.array('files'), async (req: any, res: any) => {
  try {
    const files = (req.files || []) as Express.Multer.File[];
    if (!files.length) return res.status(400).json({ error: 'No se han subido archivos' });

    // typeHints: JSON string mapping filename → DocumentType (sent from frontend)
    let typeHints: Record<string, DocumentType> = {};
    try { typeHints = JSON.parse(req.body.typeHints || '{}'); } catch {}

    // Group files by their declared type
    const groups: Record<DocumentType, Buffer[]> = {
      cif: [], coeficientes: [], propietarios: [], deuda: [], derramas: [], movimientos: [], unknown: [],
    };

    for (const f of files) {
      // Extract text sample for classification fallback
      let textSample = '';
      const isXls = f.mimetype.includes('sheet') || f.mimetype.includes('excel') || f.originalname.match(/\.xlsx?$/i);
      if (!isXls) {
        try {
          const text = await ImportService.parsePdf(f.buffer);
          textSample = text.substring(0, 600);
          (f as any)._text = text; // cache full text
        } catch {}
      }

      const declaredType = typeHints[f.originalname];
      const { type } = declaredType
        ? { type: declaredType }
        : classifyDocument(f.originalname, textSample);

      groups[type].push(f.buffer);
      if (!isXls) (groups as any)[`_text_${type}`] = ((groups as any)[`_text_${type}`] || []).concat((f as any)._text || textSample);
    }

    // Helper to get combined text for a type
    const getText = async (type: DocumentType, bufs: Buffer[]): Promise<string> => {
      const parts: string[] = [];
      for (const buf of bufs) {
        try {
          const t = (buf as any)._text || await ImportService.parsePdf(buf);
          parts.push(t);
        } catch {}
      }
      return parts.join('\n\n---\n\n');
    };

    // Run all extractions in parallel
    const [cifData, unitsData, ownersData, debtData, derramasData] = await Promise.all([
      groups.cif.length
        ? getText('cif', groups.cif).then(t => DocumentExtractionService.extractCIF(t))
        : Promise.resolve(undefined),
      groups.coeficientes.length
        ? getText('coeficientes', groups.coeficientes).then(t => DocumentExtractionService.extractCoeficientes(t))
        : Promise.resolve([] as any[]),
      groups.propietarios.length
        ? getText('propietarios', groups.propietarios).then(t => DocumentExtractionService.extractPropietarios(t))
        : Promise.resolve([] as any[]),
      groups.deuda.length
        ? getText('deuda', groups.deuda).then(t => DocumentExtractionService.extractDeuda(t))
        : Promise.resolve({ charges: [], totalDebt: 0 }),
      groups.derramas.length
        ? getText('derramas', groups.derramas).then(t => DocumentExtractionService.extractDerramas(t))
        : Promise.resolve([] as any[]),
    ]);

    const transactions = groups.movimientos.flatMap(buf =>
      DocumentExtractionService.extractMovimientos(buf)
    );

    const data: Omit<ExtractedCommunityData, 'alerts'> = {
      cif: cifData,
      units: Array.isArray(unitsData) ? unitsData : [],
      owners: Array.isArray(ownersData) ? ownersData : [],
      debt: (debtData as any).charges || [],
      derramas: Array.isArray(derramasData) ? derramasData : [],
      transactions,
    };

    const alerts = DocumentExtractionService.validateData(data);
    res.json({ ...data, alerts });
  } catch (err: any) {
    console.error('[onboarding/extract]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /commit — Save extracted data to DB ──────────────────────────────
router.post('/commit', adminOnly, async (req: any, res: any) => {
  try {
    const data: ExtractedCommunityData = req.body;
    if (!data) return res.status(400).json({ error: 'Datos de onboarding requeridos' });

    const communityId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    await db.transaction(async (tx) => {
      // ── 1. Community ──────────────────────────────────────────────────
      const displayId = String(Math.floor(100 + Math.random() * 900));
      await tx.insert(communities).values({
        id: communityId,
        code: `COM-${uuidv4().slice(0, 6).toUpperCase()}`,
        displayId,
        name: data.cif?.name || 'Nueva Comunidad',
        nif: data.cif?.nif || '',
        address: data.cif?.address || '',
        status: 'active',
      });

      // ── 2. Units ──────────────────────────────────────────────────────
      const unitMap: Record<string, string> = {}; // type → unitId

      for (const u of data.units) {
        const unitId = uuidv4();
        const typeLower = u.type.toLowerCase();
        let unitType = 'vivienda';
        if (typeLower.includes('local')) unitType = 'local';
        else if (typeLower.includes('atic') || typeLower.includes('átic')) unitType = 'atico';

        await tx.insert(units).values({
          id: unitId,
          communityId,
          unitCode: u.type,
          type: unitType,
          coefficient: u.coefficient || 0,
          monthlyFee: u.monthlyFee || 0,
        });
        unitMap[u.type] = unitId;
      }

      // ── 3. Owners + unit_owners ───────────────────────────────────────
      const ownerMap: Record<string, string> = {}; // unitType → ownerId

      for (const o of data.owners) {
        const ownerId = uuidv4();
        await tx.insert(owners).values({
          id: ownerId,
          fullName: o.name,
          email: o.email || '',
          phone: o.phone || o.mobile || '',
          taxId: '',
        });

        const targetUnitType = o.unitType || normalizeUnitType(o.unitHint || '');
        const unitId = unitMap[targetUnitType];
        if (unitId) {
          await tx.insert(unitOwners).values({
            id: uuidv4(),
            unitId,
            ownerId,
            ownershipPercentage: 100,
          });
          ownerMap[targetUnitType] = ownerId;
        }
      }

      // ── 4. Initial debt charges ───────────────────────────────────────
      for (const c of data.debt) {
        if (c.amount <= 0) continue;
        const unitId = unitMap[c.unitCode] || Object.values(unitMap)[0];
        const ownerId = ownerMap[c.unitCode];
        await tx.insert(charges).values({
          id: uuidv4(),
          communityId,
          unitId: unitId || null,
          ownerId: ownerId || null,
          concept: 'Saldo inicial (importación)',
          amount: c.amount,
          dueDate: today,
          status: 'pending',
        });
      }

      // ── 5. Derrama charges (all months upfront) ───────────────────────
      for (const d of data.derramas) {
        const start = new Date(d.startDate);
        const end = new Date(d.endDate);

        let month = new Date(start);
        while (month <= end) {
          const dueDate = month.toISOString().split('T')[0];

          for (const u of data.units) {
            const typeLower = u.type.toLowerCase();
            let monthlyAmount: number | undefined;

            if (typeLower.includes('local') && d.amounts.locales !== undefined) {
              monthlyAmount = d.amounts.locales;
            } else if ((typeLower.includes('atic') || typeLower.includes('átic')) && d.amounts.atico !== undefined) {
              monthlyAmount = d.amounts.atico;
            } else if (!typeLower.includes('local') && !typeLower.includes('atic') && d.amounts.viviendas !== undefined) {
              monthlyAmount = d.amounts.viviendas;
            }

            if (monthlyAmount && monthlyAmount > 0) {
              const unitId = unitMap[u.type];
              const ownerId = ownerMap[u.type];
              await tx.insert(charges).values({
                id: uuidv4(),
                communityId,
                unitId: unitId || null,
                ownerId: ownerId || null,
                concept: `Derrama ${d.name} - ${month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}`,
                amount: monthlyAmount,
                dueDate,
                status: 'pending',
              });
            }
          }

          month.setMonth(month.getMonth() + 1);
        }
      }

      // ── 6. Bank transactions ──────────────────────────────────────────
      for (const t of data.transactions) {
        if (!t.date || !t.concept) continue;
        await tx.insert(bankTransactions).values({
          id: uuidv4(),
          communityId,
          transactionDate: t.date,
          description: t.concept,
          amount: t.amount,
          direction: t.direction,
          reviewStatus: 'pending',
        });
      }

      // ── 7. Alert notifications ────────────────────────────────────────
      for (const alert of data.alerts || []) {
        if (alert.severity === 'error' || alert.severity === 'warning') {
          await tx.insert(notifications).values({
            id: uuidv4(),
            userId: null as any,
            title: `⚠️ Alta comunidad: ${data.cif?.name || 'Nueva'}`,
            message: alert.message,
            type: alert.severity === 'error' ? 'error' : 'warning',
            read: 0,
          });
        }
      }
    });

    const summary = {
      communityId,
      unidades: data.units.length,
      propietarios: data.owners.length,
      deudaTotal: data.debt.reduce((s, c) => s + c.amount, 0),
      derramas: data.derramas.length,
      movimientos: data.transactions.length,
      alertas: (data.alerts || []).filter(a => a.severity !== 'info').length,
    };

    res.json({ success: true, ...summary });
  } catch (err: any) {
    console.error('[onboarding/commit]', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
