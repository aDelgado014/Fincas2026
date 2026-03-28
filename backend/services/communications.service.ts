import { db } from '../db/index.ts';
import { communications, communities } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class CommunicationsService {
  /** Envía y registra una comunicación */
  static async send(data: {
    communityId?: string;
    channel: string;
    subject?: string;
    body: string;
    recipientCount?: number;
  }) {
    const id = uuidv4();
    let status = 'sent';

    // Para el MVP, simulamos el envío pero registramos en BD
    // Cuando se configure RESEND_API_KEY, se activará el envío real
    if (data.channel === 'email' && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
          from: 'AdminFincas <noreply@adminfincas.es>',
          to: ['test@example.com'], // En producción: emails reales de propietarios
          subject: data.subject || 'Comunicación de AdminFincas',
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>${data.subject || 'Comunicación'}</h2>
            <p>${data.body.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Enviado desde AdminFincas</p>
          </div>`,
        });

        status = 'sent';
      } catch (error: any) {
        console.error('Error enviando email:', error.message);
        status = 'failed';
      }
    } else {
      // Simulado para WhatsApp/SMS/Telegram o sin API key
      status = 'sent';
    }

    // Persistir en BD
    await db.insert(communications).values({
      id,
      communityId: data.communityId || null,
      channel: data.channel,
      subject: data.subject || '',
      body: data.body,
      recipientCount: data.recipientCount || 0,
      status,
    });

    return { id, status, channel: data.channel };
  }

  /** Historial de comunicaciones */
  static async getHistory(communityId?: string) {
    let query = db.select({
      id: communications.id,
      communityId: communications.communityId,
      communityName: communities.name,
      channel: communications.channel,
      subject: communications.subject,
      body: communications.body,
      recipientCount: communications.recipientCount,
      status: communications.status,
      sentAt: communications.sentAt,
      createdAt: communications.createdAt,
    })
    .from(communications)
    .leftJoin(communities, eq(communications.communityId, communities.id))
    .orderBy(desc(communications.sentAt));

    if (communityId) {
      return await query.where(eq(communications.communityId, communityId)).execute();
    }

    return await query.execute();
  }

  /** Envía un recordatorio de deuda individual */
  static async sendDebtReminder(debtId: string) {
    const { EmailService } = await import('./email.service.ts');
    const { charges, owners } = await import('../db/schema.ts');

    const [debt] = await db.select({
      id: charges.id,
      amount: charges.amount,
      concept: charges.concept,
      dueDate: charges.dueDate,
      ownerEmail: owners.email,
      ownerName: owners.fullName,
      communityId: charges.communityId
    })
    .from(charges)
    .innerJoin(owners, eq(charges.ownerId, owners.id))
    .where(eq(charges.id, debtId))
    .limit(1);

    if (!debt || !debt.ownerEmail) {
      throw new Error('Deuda no encontrada o propietario sin email');
    }

    await EmailService.sendPendingReceiptNotice(
      debt.ownerEmail,
      debt.ownerName,
      debt.amount,
      debt.dueDate || 'N/A'
    );

    // Registrar comunicación
    await this.send({
      communityId: debt.communityId || undefined,
      channel: 'email',
      subject: `Recordatorio de Deuda: ${debt.concept}`,
      body: `Recordatorio enviado a ${debt.ownerName} por importe de ${debt.amount}€`,
      recipientCount: 1
    });

    return { success: true };
  }
}
