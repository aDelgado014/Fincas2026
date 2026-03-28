import { db } from '../db/index.ts';
import { bankTransactions, communities } from '../db/schema.ts';
import { eq, and, gte, lte, asc } from 'drizzle-orm';

export class ExpenseService {
  static async getByCommunity(communityId: string, startDate?: string, endDate?: string) {
    const filters = [
      eq(bankTransactions.communityId, communityId),
      eq(bankTransactions.direction, 'outbound')
    ];

    if (startDate) filters.push(gte(bankTransactions.transactionDate, startDate));
    if (endDate) filters.push(lte(bankTransactions.transactionDate, endDate));

    return await db.select()
      .from(bankTransactions)
      .where(and(...filters))
      .orderBy(asc(bankTransactions.transactionDate))
      .execute();
  }

  static async getSummary(communityId: string, startDate?: string, endDate?: string) {
    const expenses = await this.getByCommunity(communityId, startDate, endDate);
    
    const summary = expenses.reduce((acc: any, curr) => {
      const category = curr.category || 'Otros';
      if (!acc[category]) acc[category] = 0;
      acc[category] += Math.abs(curr.amount);
      return acc;
    }, {});

    const total = expenses.reduce((sum, curr) => sum + Math.abs(curr.amount), 0);

    return {
      expenses,
      summary,
      total
    };
  }
}
