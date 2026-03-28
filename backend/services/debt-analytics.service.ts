import { db } from '../db/index.ts';
import { charges, payments, owners, communities } from '../db/schema.ts';
import { eq, and, sum, count, sql, lt } from 'drizzle-orm';

interface DebtorRanking {
  ownerId: string | null;
  ownerName: string | null;
  communityName: string | null;
  totalDebt: number;
}

interface AgingBucket {
  bucket: string;
  total: number;
  count: number;
}

interface CollectionRate {
  communityId: string | null;
  communityName: string | null;
  totalCharged: number;
  totalPaid: number;
  rate: number;
}

interface MonthlyEvolution {
  month: string;
  charged: number;
  paid: number;
}

export class DebtAnalyticsService {
  static async getOverview() {
    const today = new Date().toISOString().slice(0, 10);

    const [debtors, aging, collectionRates, monthlyEvolution] = await Promise.all([
      this.getDebtorRanking(),
      this.getDebtAging(today),
      this.getCollectionRates(),
      this.getMonthlyEvolution(),
    ]);

    // Derive KPIs
    const totalDebt = debtors.reduce((sum, d) => sum + d.totalDebt, 0);
    const delinquentOwners = debtors.length;
    const debtOver90Days = aging
      .filter(b => b.bucket === '91-180' || b.bucket === '+180')
      .reduce((sum, b) => sum + b.total, 0);
    const totalCharged = collectionRates.reduce((s, r) => s + r.totalCharged, 0);
    const totalPaid = collectionRates.reduce((s, r) => s + r.totalPaid, 0);
    const collectionRate = totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100 * 10) / 10 : 0;

    // Map to frontend-expected shapes
    const topDebtors = debtors.map(d => ({
      id: d.ownerId || '',
      name: d.ownerName || 'Sin nombre',
      community: d.communityName || 'Sin comunidad',
      unit: '',
      totalDebt: d.totalDebt,
    }));

    const debtByCommunity = collectionRates.map(r => ({
      name: r.communityName || 'Sin nombre',
      debt: r.totalCharged - r.totalPaid,
    }));

    const agingBuckets = aging.map(b => ({
      range: b.bucket,
      amount: b.total,
      count: b.count,
    }));

    return {
      totalDebt,
      collectionRate,
      delinquentOwners,
      debtOver90Days,
      topDebtors,
      debtByCommunity,
      agingBuckets,
      // Extended data for future use
      monthlyEvolution,
    };
  }

  static async getDebtorRanking(): Promise<DebtorRanking[]> {
    const results = await db
      .select({
        ownerId: charges.ownerId,
        ownerName: owners.fullName,
        communityName: communities.name,
        totalDebt: sum(charges.amount),
      })
      .from(charges)
      .leftJoin(owners, eq(charges.ownerId, owners.id))
      .leftJoin(communities, eq(charges.communityId, communities.id))
      .where(eq(charges.status, 'pending'))
      .groupBy(charges.ownerId, charges.communityId)
      .execute();

    return results
      .map((r) => ({
        ownerId: r.ownerId,
        ownerName: r.ownerName ?? null,
        communityName: r.communityName ?? null,
        totalDebt: Number(r.totalDebt || 0),
      }))
      .sort((a, b) => b.totalDebt - a.totalDebt)
      .slice(0, 20);
  }

  static async getDebtAging(today: string): Promise<AgingBucket[]> {
    const allPending = await db
      .select({ amount: charges.amount, dueDate: charges.dueDate })
      .from(charges)
      .where(and(eq(charges.status, 'pending'), lt(charges.dueDate, today)))
      .execute();

    const buckets: Record<string, { total: number; count: number }> = {
      '0-30': { total: 0, count: 0 },
      '31-90': { total: 0, count: 0 },
      '91-180': { total: 0, count: 0 },
      '+180': { total: 0, count: 0 },
    };

    const todayMs = new Date(today).getTime();

    for (const charge of allPending) {
      const daysOverdue = Math.floor((todayMs - new Date(charge.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(charge.amount || 0);

      if (daysOverdue <= 30) {
        buckets['0-30'].total += amount;
        buckets['0-30'].count += 1;
      } else if (daysOverdue <= 90) {
        buckets['31-90'].total += amount;
        buckets['31-90'].count += 1;
      } else if (daysOverdue <= 180) {
        buckets['91-180'].total += amount;
        buckets['91-180'].count += 1;
      } else {
        buckets['+180'].total += amount;
        buckets['+180'].count += 1;
      }
    }

    return Object.entries(buckets).map(([bucket, data]) => ({
      bucket,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
    }));
  }

  static async getCollectionRates(): Promise<CollectionRate[]> {
    const chargedPerCommunity = await db
      .select({
        communityId: charges.communityId,
        communityName: communities.name,
        total: sum(charges.amount),
      })
      .from(charges)
      .leftJoin(communities, eq(charges.communityId, communities.id))
      .groupBy(charges.communityId)
      .execute();

    const paidPerCommunity = await db
      .select({
        communityId: charges.communityId,
        total: sum(payments.amount),
      })
      .from(payments)
      .leftJoin(charges, eq(payments.chargeId, charges.id))
      .groupBy(charges.communityId)
      .execute();

    const paidMap = new Map<string, number>();
    for (const row of paidPerCommunity) {
      if (row.communityId) {
        paidMap.set(row.communityId, Number(row.total || 0));
      }
    }

    return chargedPerCommunity.map((row) => {
      const totalCharged = Number(row.total || 0);
      const totalPaid = paidMap.get(row.communityId ?? '') ?? 0;
      const rate = totalCharged > 0 ? Math.round((totalPaid / totalCharged) * 100 * 10) / 10 : 0;
      return {
        communityId: row.communityId ?? null,
        communityName: row.communityName ?? null,
        totalCharged,
        totalPaid,
        rate,
      };
    });
  }

  static async getMonthlyEvolution(): Promise<MonthlyEvolution[]> {
    const months: MonthlyEvolution[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const [chargedRow] = await db
        .select({ total: sum(charges.amount) })
        .from(charges)
        .where(sql`${charges.issueDate} >= ${monthStart} AND ${charges.issueDate} < ${monthEnd}`)
        .execute();

      const [paidRow] = await db
        .select({ total: sum(payments.amount) })
        .from(payments)
        .where(sql`${payments.paymentDate} >= ${monthStart} AND ${payments.paymentDate} < ${monthEnd}`)
        .execute();

      months.push({
        month: label,
        charged: Number(chargedRow?.total || 0),
        paid: Number(paidRow?.total || 0),
      });
    }

    return months;
  }
}
