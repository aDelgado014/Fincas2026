import { db } from '../db/index.ts';
import { communities, owners, charges, incidents } from '../db/schema.ts';
import { like, or } from 'drizzle-orm';

export class SearchService {
  static async search(query: string) {
    if (!query || query.trim().length === 0) {
      return { communities: [], owners: [], charges: [], incidents: [] };
    }

    const pattern = `%${query.trim()}%`;

    const [communitiesResult, ownersResult, chargesResult, incidentsResult] = await Promise.all([
      db
        .select({ id: communities.id, name: communities.name, code: communities.code, address: communities.address })
        .from(communities)
        .where(or(like(communities.name, pattern), like(communities.code, pattern), like(communities.address, pattern)))
        .limit(20)
        .execute(),

      db
        .select({ id: owners.id, fullName: owners.fullName, email: owners.email, phone: owners.phone, taxId: owners.taxId })
        .from(owners)
        .where(or(like(owners.fullName, pattern), like(owners.email, pattern), like(owners.phone, pattern), like(owners.taxId, pattern)))
        .limit(20)
        .execute(),

      db
        .select({ id: charges.id, concept: charges.concept, amount: charges.amount, status: charges.status, communityId: charges.communityId, dueDate: charges.dueDate })
        .from(charges)
        .where(like(charges.concept, pattern))
        .limit(20)
        .execute(),

      db
        .select({ id: incidents.id, title: incidents.title, description: incidents.description, status: incidents.status, communityId: incidents.communityId })
        .from(incidents)
        .where(or(like(incidents.title, pattern), like(incidents.description, pattern)))
        .limit(20)
        .execute(),
    ]);

    return {
      communities: communitiesResult,
      owners: ownersResult,
      charges: chargesResult,
      incidents: incidentsResult,
    };
  }
}
