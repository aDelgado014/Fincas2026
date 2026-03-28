import { db } from '../db/index.ts';
import { owners, units, unitOwners } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export class ReconciliationService {
  static async reconcile(transactions: any[]) {
    const allOwners = await db.query.owners.findMany();
    const allUnits = await db.query.units.findMany();

    return transactions.map((tx: any) => {
      let bestMatch = null;
      let confidence = 0;

      const description = (typeof tx.description === 'string' ? tx.description : '').toUpperCase();

      // Buscar por nombre de propietario
      for (const owner of allOwners) {
        const ownerName = (typeof owner.fullName === 'string' ? owner.fullName : '').toUpperCase();
        if (ownerName && description.includes(ownerName)) {
          bestMatch = owner;
          confidence = 90;
          break;
        }
      }

      // Buscar por código de unidad si no hubo match con propietario
      if (!bestMatch) {
        for (const unit of allUnits) {
          const unitCode = (typeof unit.unitCode === 'string' ? unit.unitCode : '').toUpperCase();
          if (unitCode && description.includes(unitCode)) {
            // Esto requeriría un join o una búsqueda adicional para el propietario actual
            // Para simplificar esta versión MVP:
            bestMatch = { id: 'pending', fullName: `Revisar Unidad ${unit.unitCode}` };
            confidence = 80;
            break;
          }
        }
      }


      return {
        ...tx,
        suggestedOwnerId: bestMatch?.id,
        suggestedOwnerName: bestMatch?.fullName,
        confidence
      };
    });
  }
}
