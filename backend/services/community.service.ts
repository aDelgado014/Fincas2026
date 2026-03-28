import { db } from '../db/index.ts';
import { communities, units, owners, unitOwners, tenants, charges } from '../db/schema.ts';
import { eq, and, sum, count } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class CommunityService {
  static async getAll() {
    return await db.query.communities.findMany({
      where: eq(communities.status, 'active'),
    });
  }

  static async getById(id: string) {
    return await db.query.communities.findFirst({
      where: eq(communities.id, id),
    });
  }

  static async getUnitsFull(communityId: string) {
    // Dos queries en paralelo en lugar de N+1
    const [data, pendingDebts] = await Promise.all([
      db.select()
        .from(units)
        .leftJoin(unitOwners, eq(units.id, unitOwners.unitId))
        .leftJoin(owners, eq(unitOwners.ownerId, owners.id))
        .leftJoin(tenants, eq(units.tenantId, tenants.id))
        .where(eq(units.communityId, communityId))
        .execute(),
      db.select({ unitId: charges.unitId, total: sum(charges.amount) })
        .from(charges)
        .where(and(
          eq(charges.communityId, communityId),
          eq(charges.status, 'pending')
        ))
        .groupBy(charges.unitId),
    ]);

    const debtByUnit = new Map(pendingDebts.map(d => [d.unitId, Number(d.total || 0)]));

    return data.map(item => ({
      ...item,
      pendingDebt: debtByUnit.get(item.units.id) ?? 0
    }));
  }

  static async createCommunity(data: { name: string; code?: string; nif?: string; address?: string; bankAccountRef?: string }) {
    const id = uuidv4();
    await db.insert(communities).values({
      id,
      code: data.code || `COM-${uuidv4().slice(0, 4)}`,
      name: data.name,
      nif: data.nif,
      address: data.address,
      bankAccountRef: data.bankAccountRef,
    });
    return id;
  }

  static async getGlobalStats() {
    const communityCount = await db.select({ value: count() }).from(communities);
    const unitCount = await db.select({ value: count() }).from(units);
    const tenantCount = await db.select({ value: count() }).from(tenants);

    return {
      communities: communityCount[0]?.value || 0,
      units: unitCount[0]?.value || 0,
      tenants: tenantCount[0]?.value || 0
    };
  }
}

export class OwnerService {
  static async getAll() {
    return await db.query.owners.findMany();
  }

  static async getById(id: string) {
    return await db.query.owners.findFirst({
      where: eq(owners.id, id),
    });
  }
}
