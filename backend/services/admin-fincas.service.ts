import { db } from '../db';
import { communities, charges, payments, units } from '../db/schema';
import { eq, and, sum, count } from 'drizzle-orm';

export const AdminFincasService = {
  async getAdminSummary() {
    // Get all communities with their debt totals and admin fees
    const allCommunities = await db.select().from(communities);

    const summaryData = await Promise.all(allCommunities.map(async (community) => {
      // Get total pending debt for this community
      const debtResult = await db
        .select({ total: sum(charges.amount) })
        .from(charges)
        .where(and(eq(charges.communityId, community.id), eq(charges.status, 'pending')));

      const totalDebt = debtResult[0]?.total || 0;

      // Get unit count
      const unitResult = await db
        .select({ count: count() })
        .from(units)
        .where(eq(units.communityId, community.id));

      const unitCount = unitResult[0]?.count || 0;

      // Calculate admin fee
      const adminFeeCalculated = (community.adminFeeFixed || 0) +
        ((community.adminFeeRate || 0) / 100 * Number(totalDebt));

      return {
        id: community.id,
        name: community.name,
        displayId: community.displayId,
        totalDebt: Number(totalDebt),
        unitCount,
        adminFeeRate: community.adminFeeRate || 0,
        adminFeeFixed: community.adminFeeFixed || 0,
        adminFeeCalculated,
      };
    }));

    return summaryData;
  },

  async exportDatabase() {
    const { communities: commTable, units: unitsTable, owners, charges: chargesTable,
            payments: paymentsTable, incidents, communications, minutes, budgets } = await import('../db/schema');

    const [commData, unitsData, ownersData, chargesData, paymentsData,
           incidentsData, commsData, minutesData, budgetsData] = await Promise.all([
      db.select().from(commTable),
      db.select().from(unitsTable),
      db.select().from(owners),
      db.select().from(chargesTable),
      db.select().from(paymentsTable),
      db.select().from(incidents),
      db.select().from(communications),
      db.select().from(minutes),
      db.select().from(budgets),
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        communities: commData,
        units: unitsData,
        owners: ownersData,
        charges: chargesData,
        payments: paymentsData,
        incidents: incidentsData,
        communications: commsData,
        minutes: minutesData,
        budgets: budgetsData,
      }
    };
  },
};
