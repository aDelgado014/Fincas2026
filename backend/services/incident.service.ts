import { db } from '../db/index.ts';
import { incidents, owners, communities } from '../db/schema.ts';
import { NotificationService } from './notification.service.ts';
import { EmailService } from './email.service.ts';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class IncidentService {
  static async list(options: { communityId?: string; status?: string; priority?: string } = {}) {
    let query = db.select({
      id: incidents.id,
      communityId: incidents.communityId,
      communityName: communities.name,
      title: incidents.title,
      description: incidents.description,
      status: incidents.status,
      priority: incidents.priority,
      providerId: incidents.providerId,
      cost: incidents.cost,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .leftJoin(communities, eq(incidents.communityId, communities.id))
    .orderBy(desc(incidents.createdAt));

    const conditions = [];
    if (options.communityId) conditions.push(eq(incidents.communityId, options.communityId));
    if (options.status) conditions.push(eq(incidents.status, options.status));
    if (options.priority) conditions.push(eq(incidents.priority, options.priority));

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).execute();
    }

    return await query.execute();
  }

  static async create(data: { communityId: string; title: string; description?: string; priority?: string; ownerId?: string; unitId?: string }) {
    const id = uuidv4();
    const incidentData = {
      id,
      communityId: data.communityId,
      title: data.title,
      description: data.description || '',
      status: 'pending',
      priority: data.priority || 'medium',
      ownerId: data.ownerId,
      unitId: data.unitId
    };

    await db.insert(incidents).values(incidentData);

    // Notion Sync
    import('./notion.service.ts').then(({ NotionService }) => {
      NotionService.syncIncident(incidentData).catch(err => console.error('Notion Sync Error:', err));
    });

    return { id, success: true };
  }

  static async updateIncidentStatus(id: string, newStatus: string) {
    const [incident] = await db.select({
      id: incidents.id,
      title: incidents.title,
      ownerId: incidents.ownerId,
      ownerEmail: owners.email,
      ownerName: owners.fullName,
      userId: owners.userId
    })
    .from(incidents)
    .innerJoin(owners, eq(incidents.ownerId, owners.id))
    .where(eq(incidents.id, id))
    .limit(1);

    if (!incident) {
        // If not found in join (maybe no owner linked), just update status
        await db.update(incidents).set({ status: newStatus }).where(eq(incidents.id, id));
        return { id, success: true };
    }

    await db.update(incidents)
      .set({ status: newStatus })
      .where(eq(incidents.id, id));

    if (incident.userId) {
      await NotificationService.createNotification({
        userId: incident.userId,
        title: 'Actualización de Incidencia',
        message: `El estado de "${incident.title}" ha cambiado a "${newStatus}".`,
        type: 'info'
      });
    }

    if (incident.ownerEmail) {
      await EmailService.sendIncidentStatusUpdate(
        incident.ownerEmail,
        incident.ownerName,
        incident.title,
        newStatus
      );
    }

    // Notion Sync
    import('./notion.service.ts').then(({ NotionService }) => {
      NotionService.syncIncident({ ...incident, status: newStatus }).catch(err => console.error('Notion Sync Error:', err));
    });

    return incident;
  }

  static async getStats() {
    const all = await db.select({
      status: incidents.status,
      priority: incidents.priority,
    }).from(incidents).execute();

    return {
      total: all.length,
      pending: all.filter(i => i.status === 'pending').length,
      inProgress: all.filter(i => i.status === 'in_progress').length,
      resolved: all.filter(i => i.status === 'resolved').length,
      highPriority: all.filter(i => i.priority === 'high').length,
    };
  }

  static async getStatsByCategory() {
    const all = await db.select({ title: incidents.title }).from(incidents).execute();

    const categories: Record<string, number> = {
      'Fontanería': 0,
      'Electricidad': 0,
      'Limpieza': 0,
      'Ascensores': 0,
      'Otros': 0,
    };

    const keywords: Record<string, string[]> = {
      'Fontanería': ['agua', 'fuga', 'tubería', 'fontaner', 'grifo', 'baño'],
      'Electricidad': ['luz', 'electric', 'enchufe', 'cable', 'apagón'],
      'Limpieza': ['limpi', 'basura', 'suciedad', 'plagas'],
      'Ascensores': ['ascensor', 'elevador', 'montacargas'],
    };

    for (const inc of all) {
      const titleLower = (inc.title || '').toLowerCase();
      let matched = false;
      for (const [cat, kws] of Object.entries(keywords)) {
        if (kws.some(kw => titleLower.includes(kw))) {
          categories[cat]++;
          matched = true;
          break;
        }
      }
      if (!matched) categories['Otros']++;
    }

    return Object.entries(categories)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }
}
