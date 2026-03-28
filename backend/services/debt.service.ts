import { db } from '../db/index.ts';
import { charges, payments, units, owners, communities, tenants } from '../db/schema.ts';
import { eq, sum, sql, and, or, ne, inArray, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class DebtService {
  static async getChargesFull(options: { communityId?: string; status?: string } = {}) {
    let query = db.select({
      id: charges.id,
      amount: charges.amount,
      concept: charges.concept,
      dueDate: charges.dueDate,
      status: charges.status,
      communityId: charges.communityId,
      unitId: charges.unitId,
      ownerId: charges.ownerId,
      communityName: communities.name,
      ownerName: owners.fullName,
    })
    .from(charges)
    .leftJoin(communities, eq(charges.communityId, communities.id))
    .leftJoin(owners, eq(charges.ownerId, owners.id));

    const conditions = [];
    if (options.communityId) {
      conditions.push(eq(charges.communityId, options.communityId));
    }
    if (options.status) {
      conditions.push(eq(charges.status, options.status));
    }

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).execute();
    }

    return await query.execute();
  }

  static async getChargesByCommunity(communityId: string) {
    return this.getChargesFull({ communityId });
  }

  static async createCharge(data: { communityId: string; unitId: string; ownerId: string; concept: string; amount: number; dueDate: string }) {
    const id = uuidv4();
    await db.insert(charges).values({
      id,
      ...data,
      status: 'pending',
    });
    return id;
  }

  static async recordPayment(data: { chargeId: string; amount: number; transactionId?: string; source?: string; reference?: string }) {
    const id = uuidv4();
    
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        id,
        ...data,
        paymentDate: new Date().toISOString(),
      });

      // Verificar si el cargo está totalmente pagado
      const totalPaidResult = await tx.select({ total: sum(payments.amount) })
        .from(payments)
        .where(eq(payments.chargeId, data.chargeId));
      
      const totalPaid = Number(totalPaidResult[0]?.total || 0);
      
      const chargeData = await tx.query.charges.findFirst({
        where: eq(charges.id, data.chargeId)
      });

      if (chargeData && totalPaid >= chargeData.amount) {
        await tx.update(charges)
          .set({ status: 'paid' })
          .where(eq(charges.id, data.chargeId));
      }
    });

    return id;
  }

  static async getFinancialStats() {
    const pendingTotal = await db.select({ total: sum(charges.amount) })
      .from(charges)
      .where(eq(charges.status, 'pending'));
    
    const collectedTotal = await db.select({ total: sum(payments.amount) })
      .from(payments);

    return {
      pendingDebt: Number(pendingTotal[0]?.total || 0),
      totalCollected: Number(collectedTotal[0]?.total || 0),
    };
  }

  static async getUnitStatement(unitId: string) {
    const unitCharges = await db.select().from(charges).where(eq(charges.unitId, unitId)).execute();
    
    const unitPayments = await db.select({
      payment: payments,
      charge: charges
    })
    .from(payments)
    .innerJoin(charges, eq(payments.chargeId, charges.id))
    .where(eq(charges.unitId, unitId))
    .execute();
    
    const movements = [
      ...unitCharges.map(c => ({ ...c, type: 'charge', date: c.issueDate || c.createdAt || new Date().toISOString() })),
      ...unitPayments.map(p => ({ ...p.payment, type: 'payment', date: p.payment.paymentDate || new Date().toISOString() }))
    ].sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

    return movements;
  }

  static async getDebtByCommunity() {
    const results = await db.select({
      name: communities.name,
      debt: sum(charges.amount)
    })
    .from(charges)
    .innerJoin(communities, eq(charges.communityId, communities.id))
    .where(eq(charges.status, 'pending'))
    .groupBy(communities.name)
    .execute();

    return results.map(r => ({
      name: r.name,
      debt: Number(r.debt || 0)
    }));
  }

  static async getExportData(communityIds?: string[]) {
    let query = db.select({
      community: communities.name,
      unit: units.unitCode,
      owner: owners.fullName,
      tenant: tenants.fullName,
      concept: charges.concept,
      amount: charges.amount,
      status: charges.status,
      date: charges.issueDate
    })
    .from(charges)
    .innerJoin(communities, eq(charges.communityId, communities.id))
    .innerJoin(units, eq(charges.unitId, units.id))
    .leftJoin(owners, eq(charges.ownerId, owners.id))
    .leftJoin(tenants, eq(units.tenantId, tenants.id));

    if (communityIds && communityIds.length > 0) {
      return await query.where(inArray(communities.id, communityIds)).execute();
    }

    return await query.execute();
  }

  static async getPortfolioStats() {
    // Cálculo de Cobro del Mes Actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const monthlyCharges = await db.select({ total: sum(charges.amount) })
      .from(charges)
      .where(sql`${charges.issueDate} >= ${startOfMonth}`);
    
    const monthlyPayments = await db.select({ total: sum(payments.amount) })
      .from(payments)
      .where(sql`${payments.paymentDate} >= ${startOfMonth}`);

    const totalToCollect = Number(monthlyCharges[0]?.total || 0);
    const collected = Number(monthlyPayments[0]?.total || 0);
    const collectionRate = totalToCollect > 0 ? (collected / totalToCollect) * 100 : 0;

    // Ocupación (Unidades con inquilino o propietario activo)
    const totalUnitsResult = await db.select({ value: count() }).from(units);
    const occupiedUnitsResult = await db.select({ value: count() }).from(units).where(sql`${units.tenantId} IS NOT NULL`);
    
    const totalUnits = Number(totalUnitsResult[0]?.value || 0);
    const occupiedUnits = Number(occupiedUnitsResult[0]?.value || 0);
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      collectionRate: Math.round(collectionRate),
      occupancyRate: Math.round(occupancyRate),
      monthlyTarget: totalToCollect,
      monthlyCollected: collected
    };
  }
}
