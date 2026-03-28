import { db } from '../db/index.ts';
import { charges, owners } from '../db/schema.ts';
import { eq, and, lt } from 'drizzle-orm';
import { EmailService } from './email.service.ts';

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function runScheduledReminders() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const overdueCharges = await db
      .select({
        id: charges.id,
        amount: charges.amount,
        dueDate: charges.dueDate,
        ownerId: charges.ownerId,
      })
      .from(charges)
      .where(and(eq(charges.status, 'pending'), lt(charges.dueDate, today)))
      .execute();

    console.log(`[Scheduler] Procesando ${overdueCharges.length} cargos vencidos.`);

    for (const charge of overdueCharges) {
      if (!charge.ownerId) continue;

      const [owner] = await db
        .select({ email: owners.email, fullName: owners.fullName })
        .from(owners)
        .where(eq(owners.id, charge.ownerId))
        .limit(1)
        .execute();

      if (!owner || !owner.email) continue;

      await EmailService.sendPendingReceiptNotice(
        owner.email,
        owner.fullName,
        Number(charge.amount),
        charge.dueDate,
      );
    }

    console.log(`[Scheduler] Recordatorios enviados correctamente.`);
  } catch (error) {
    console.error('[Scheduler] Error al procesar recordatorios:', error);
  }
}

export function startScheduler() {
  console.log('[Scheduler] Iniciando scheduler de recordatorios automáticos (cada 24h).');
  // Run once at startup after a short delay to let the DB settle
  setTimeout(() => runScheduledReminders(), 5000);
  setInterval(() => runScheduledReminders(), INTERVAL_MS);
}
