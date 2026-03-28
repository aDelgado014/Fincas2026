import * as xlsx from 'xlsx';
import { db } from '../db/index.ts';
import { bankTransactions, notifications, charges, owners, units, unitOwners } from '../db/schema.ts';
import { v4 as uuidv4 } from 'uuid';
import { eq, sql, and, like, or } from 'drizzle-orm';

export interface BankRow {
  date: string;
  description: string;
  amount: number;
  direction: 'inbound' | 'outbound';
  reference?: string;
}

export class BankService {
  /**
   * Procesa un archivo Excel/CSV de extracto bancario
   */
  static async processStatement(communityId: string, buffer: Buffer, fileName: string) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet) as any[];

    const processedRows: BankRow[] = rawData.map(row => {
      // Mapeo genérico (ajustable según formato de banco)
      const description = row.Concepto || row.Descripción || row.Description || row.concept || '';
      const amount = parseFloat(row.Importe || row.Amount || row.amount || '0');
      const date = row.Fecha || row.Date || row.date || new Date().toISOString();
      
      return {
        date,
        description: description.toString(),
        amount: Math.abs(amount),
        direction: amount >= 0 ? 'inbound' : 'outbound',
        reference: row.Referencia || row.Reference || '',
      };
    });

    const results = [];
    for (const row of processedRows) {
      const transactionId = uuidv4();
      
      // Detectar devoluciones
      const isReturn = /DEVOLUCION|RETORNO|IMPAGADO|DEV\./i.test(row.description);
      
      await db.insert(bankTransactions).values({
        id: transactionId,
        communityId,
        transactionDate: row.date,
        description: row.description,
        amount: row.amount,
        direction: row.direction,
        reviewStatus: isReturn ? 'pending' : 'pending',
        category: isReturn ? 'return' : null,
      });

      if (isReturn) {
        // Notificar al administrador
        await db.insert(notifications).values({
          id: uuidv4(),
          title: 'Devolución Detectada',
          message: `Se ha detectado una devolución de ${row.amount}€ en el extracto "${fileName}". Concepto: ${row.description}`,
          type: 'warning',
          createdAt: new Date().toISOString(),
        });
      }

      results.push({ ...row, isReturn });
    }

    return results;
  }

  /**
   * Vincula una devolución a un propietario y aplica recargo de 3€
   */
  static async resolveReturn(transactionId: string, ownerId: string, unitId: string) {
    return await db.transaction(async (tx) => {
      const [txData] = await tx.select().from(bankTransactions).where(eq(bankTransactions.id, transactionId));
      if (!txData) throw new Error('Transacción no encontrada');

      // 1. Crear cargo de devolución + 3€
      const finalAmount = txData.amount + 3;
      await tx.insert(charges).values({
        id: uuidv4(),
        communityId: txData.communityId,
        unitId,
        ownerId,
        concept: `Devolución de recibo + Gastos de gestión (3€) - Ref: ${txData.description}`,
        amount: finalAmount,
        dueDate: new Date().toISOString(),
        status: 'pending',
      });

      // 2. Marcar transacción como procesada
      await tx.update(bankTransactions)
        .set({ reviewStatus: 'matched' })
        .where(eq(bankTransactions.id, transactionId));

      return { success: true, amount: finalAmount };
    });
  }

  /**
   * Obtiene transacciones pendientes de revisar (conciliación)
   */
  static async getPendingTransactions(communityId: string) {
    return await db.select()
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.communityId, communityId),
          eq(bankTransactions.reviewStatus, 'pending')
        )
      );
  }
}
