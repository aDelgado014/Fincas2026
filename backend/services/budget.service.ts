import { db } from '../db/index.ts';
import { budgets } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface BudgetData {
  communityId: string;
  year: number;
  items?: string; // JSON string: [{category, budgeted, spent}]
  totalAmount?: number;
  notes?: string;
}

export class BudgetService {
  static async getAll(communityId: string) {
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.communityId, communityId))
      .execute();
  }

  static async getById(id: string) {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id))
      .limit(1)
      .execute();
    return budget ?? null;
  }

  static async create(data: BudgetData) {
    const id = uuidv4();
    await db.insert(budgets).values({
      id,
      communityId: data.communityId,
      year: data.year,
      items: data.items ?? null,
      totalAmount: data.totalAmount ?? 0,
      notes: data.notes ?? null,
    });
    return id;
  }

  static async update(id: string, data: Partial<BudgetData>) {
    await db
      .update(budgets)
      .set({
        ...(data.year !== undefined && { year: data.year }),
        ...(data.items !== undefined && { items: data.items }),
        ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
        ...(data.notes !== undefined && { notes: data.notes }),
      })
      .where(eq(budgets.id, id));
    return id;
  }

  static async remove(id: string) {
    await db.delete(budgets).where(eq(budgets.id, id));
  }
}
