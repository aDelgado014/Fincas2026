import * as xlsx from 'xlsx';
import { db } from '../db/index.ts';
import { communities, units as unitsTable, owners, unitOwners, charges } from '../db/schema.ts';
import { v4 as uuidv4 } from 'uuid';

export class ImportService {
  static async parseXls(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return data;
  }

  /**
   * Parsea un PDF (Digital u OCR)
   */
  static async parsePdf(buffer: Buffer): Promise<string> {
    const pdf = (await import('pdf-parse')).default;
    const data = await pdf(buffer);
    
    let text = data.text.trim();
    
    if (text.length < 100) {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('spa');
      const ret = await worker.recognize(buffer);
      text = ret.data.text;
      await worker.terminate();
    }
    
    return text;
  }

  /**
   * Estructura datos con Groq AI
   */
  static async extractStructuredData(rawText: string) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

    const prompt = `Extrae datos de comunidad de vecinos en JSON:
{
  "community": { "name": "Nombre", "nif": "CIF", "address": "Dirección" },
  "units": [
    { "code": "1A", "coefficient": 5.0, "ownerName": "Nombre", "ownerEmail": "email", "ownerPhone": "tel", "pendingDebt": 0 }
  ]
}
Texto: ${rawText.substring(0, 5000)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    const result = await response.json();
    const content: string = result?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Respuesta vacía del modelo de IA.');

    // Extrae el bloque JSON de forma segura ignorando markdown fences
    const match = content.match(/```json\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = match ? match[1].trim() : content.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('El modelo de IA no devolvió un JSON válido. Verifica el archivo de entrada.');
    }

    if (!parsed?.community || !Array.isArray(parsed?.units)) {
      throw new Error('Estructura de datos inválida en la respuesta de IA.');
    }

    return parsed;
  }

  /**
   * Guarda datos siguiendo el esquema real
   */
  static async saveImportedData(data: { community: any, units: any[] }) {
    return await db.transaction(async (tx) => {
      const communityId = uuidv4();
      
      // 1. Comunidad
      await tx.insert(communities).values({
        id: communityId,
        code: `IMP-${uuidv4().slice(0, 4)}`,
        name: data.community.name,
        nif: data.community.nif || '',
        address: data.community.address || '',
      });

      // 2. Unidades y Propietarios
      for (const u of data.units) {
        const unitId = uuidv4();
        const ownerId = uuidv4();

        await tx.insert(unitsTable).values({
          id: unitId,
          communityId: communityId,
          unitCode: u.code,
          type: 'vivienda',
          coefficient: u.coefficient || 0,
        });

        await tx.insert(owners).values({
          id: ownerId,
          fullName: u.ownerName || 'Propietario',
          email: u.ownerEmail || '',
          phone: u.ownerPhone || '',
        });

        await tx.insert(unitOwners).values({
          id: uuidv4(),
          unitId: unitId,
          ownerId: ownerId,
          ownershipPercentage: 100,
        });

        // 3. Saldo inicial (si hay deuda)
        if (u.pendingDebt > 0) {
          await tx.insert(charges).values({
            id: uuidv4(),
            communityId,
            unitId,
            ownerId,
            concept: 'Saldo inicial (Importación)',
            amount: u.pendingDebt,
            dueDate: new Date().toISOString(),
            status: 'pending',
          });
        }
      }
      
      return { success: true, communityId, count: data.units.length };
    });
  }
}
