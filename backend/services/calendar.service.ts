import { db } from '../db/index.ts';
import { charges, minutes, incidents, communities } from '../db/schema.ts';
import { gte, lte, and, eq } from 'drizzle-orm';

interface CalendarEvent {
  id: string;
  type: 'acta' | 'cargo' | 'incidencia';
  title: string;
  date: string;
  communityName: string | null;
}

export class CalendarService {
  static async getEvents(from: string, to: string): Promise<{ events: CalendarEvent[] }> {
    const [chargeEvents, minuteEvents, incidentEvents] = await Promise.all([
      // Charges: use dueDate
      db
        .select({
          id: charges.id,
          concept: charges.concept,
          dueDate: charges.dueDate,
          communityName: communities.name,
        })
        .from(charges)
        .leftJoin(communities, eq(charges.communityId, communities.id))
        .where(and(gte(charges.dueDate, from), lte(charges.dueDate, to)))
        .execute(),

      // Minutes: use meetingDate
      db
        .select({
          id: minutes.id,
          title: minutes.title,
          meetingDate: minutes.meetingDate,
          communityName: communities.name,
        })
        .from(minutes)
        .leftJoin(communities, eq(minutes.communityId, communities.id))
        .where(and(gte(minutes.meetingDate, from), lte(minutes.meetingDate, to)))
        .execute(),

      // Incidents: use createdAt
      db
        .select({
          id: incidents.id,
          title: incidents.title,
          createdAt: incidents.createdAt,
          communityName: communities.name,
        })
        .from(incidents)
        .leftJoin(communities, eq(incidents.communityId, communities.id))
        .where(and(gte(incidents.createdAt, from), lte(incidents.createdAt, to)))
        .execute(),
    ]);

    const events: CalendarEvent[] = [
      ...chargeEvents.map((c) => ({
        id: c.id,
        type: 'cargo' as const,
        title: `Recibo: ${c.concept}`,
        date: c.dueDate,
        communityName: c.communityName ?? null,
      })),
      ...minuteEvents.map((m) => ({
        id: m.id,
        type: 'acta' as const,
        title: `Acta: ${m.title}`,
        date: m.meetingDate,
        communityName: m.communityName ?? null,
      })),
      ...incidentEvents.map((i) => ({
        id: i.id,
        type: 'incidencia' as const,
        title: `Incidencia: ${i.title}`,
        date: (i.createdAt ?? '').slice(0, 10),
        communityName: i.communityName ?? null,
      })),
    ];

    events.sort((a, b) => a.date.localeCompare(b.date));

    return { events };
  }
}
