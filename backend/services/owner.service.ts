import { db } from '../db/index.ts';
import { charges, payments, units, owners, communities, incidents, unitOwners, users } from '../db/schema.ts';
import { eq, and, sql, sum, desc } from 'drizzle-orm';

export class OwnerService {
  static async getOwnerProfile(userId: string) {
    const [owner] = await db.select()
      .from(owners)
      .where(eq(owners.userId, userId))
      .limit(1);
    return owner;
  }

  static async getOwnerUnits(ownerId: string) {
    return await db.select({
      unit: units,
      community: communities
    })
    .from(units)
    .innerJoin(communities, eq(units.communityId, communities.id))
    .innerJoin(unitOwners, eq(units.id, unitOwners.unitId))
    .where(eq(unitOwners.ownerId, ownerId))
    .execute();
  }

  static async getOwnerCharges(ownerId: string) {
    return await db.select({
      id: charges.id,
      concept: charges.concept,
      amount: charges.amount,
      dueDate: charges.dueDate,
      status: charges.status,
      issueDate: charges.issueDate,
      unitId: charges.unitId
    })
    .from(charges)
    .where(eq(charges.ownerId, ownerId))
    .orderBy(desc(charges.dueDate))
    .execute();
  }

  static async getOwnerSummary(ownerId: string) {
    const pendingDebtResult = await db.select({ total: sum(charges.amount) })
      .from(charges)
      .where(and(eq(charges.ownerId, ownerId), eq(charges.status, 'pending')));
    
    const activeIncidentsResult = await db.select({ count: sql`count(*)` })
      .from(incidents)
      .where(and(eq(incidents.ownerId, ownerId), sql`${incidents.status} != 'resolved'`));

    return {
      balance: Number(pendingDebtResult[0]?.total || 0),
      openIncidents: Number((activeIncidentsResult[0] as any)?.count || 0)
    };
  }

  static async reportIncident(data: { ownerId: string; communityId: string; unitId: string; title: string; description: string }) {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    const incidentData = {
      id,
      ...data,
      status: 'pending',
      priority: 'medium',
    };
    
    await db.insert(incidents).values(incidentData);
    
    // Sincronización con Notion (Opcional/Segundo plano)
    import('./notion.service.ts').then(({ NotionService }) => {
      NotionService.syncIncident(incidentData).catch(err => console.error('Notion Sync Error:', err));
    });

    return id;
  }

  static async linkOwner(userId: string, ownerId: string, taxId: string) {
    const [owner] = await db.select()
      .from(owners)
      .where(and(eq(owners.id, ownerId), eq(owners.taxId, taxId)))
      .limit(1);

    if (!owner) {
      throw new Error('Owner no encontrado o Tax ID incorrecto');
    }

    if (owner.userId) {
      throw new Error('Este propietario ya está vinculado a un usuario');
    }

    // Actualizar el owner con el userId
    await db.update(owners)
      .set({ userId })
      .where(eq(owners.id, ownerId));

    // Promover al usuario a rol 'owner'
    await db.update(users)
      .set({ role: 'owner' })
      .where(eq(users.id, userId));

    return owner;
  }

  static async updateUserProfile(userId: string, data: { name?: string; phone?: string; email?: string; password?: string }) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    
    if (data.password) {
      const bcrypt = await import('bcryptjs');
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    // Actualizar tabla users
    if (Object.keys(updateData).length > 0) {
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));
    }

    // Actualizar tabla owners (sincronizar email/teléfono si aplica)
    const ownerUpdate: any = {};
    if (data.name) ownerUpdate.fullName = data.name;
    if (data.email) ownerUpdate.email = data.email;
    if (data.phone) ownerUpdate.phone = data.phone;

    if (Object.keys(ownerUpdate).length > 0) {
      await db.update(owners)
        .set(ownerUpdate)
        .where(eq(owners.userId, userId));
    }

    return { success: true };
  }
}
