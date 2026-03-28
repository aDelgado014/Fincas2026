import { db } from '../db/index.ts';
import { bookings, facilities, communities, tenants, owners } from '../db/schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class BookingService {
  // ─── Listar instalaciones de una comunidad ───────────────────────────────
  static async listFacilities(communityId: string) {
    return db.select()
      .from(facilities)
      .where(and(
        eq(facilities.communityId, communityId),
        eq(facilities.status, 'active')
      ))
      .execute();
  }

  // ─── Disponibilidad de una instalación para una fecha ────────────────────
  static async getAvailability(facilityId: string, date: string) {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, facilityId)).limit(1);
    if (!facility) throw new Error('Instalación no encontrada');

    // Generar franjas horarias basadas en openTime, closeTime y slotDuration
    const slots = generateSlots(facility.openTime!, facility.closeTime!, facility.slotDuration!);

    // Obtener reservas existentes para esa fecha
    const existing = await db.select({
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
    })
      .from(bookings)
      .where(and(
        eq(bookings.facilityId, facilityId),
        eq(bookings.bookingDate, date),
      ))
      .execute();

    const occupied = existing
      .filter(b => b.status !== 'cancelled')
      .map(b => b.startTime);

    return slots.map(slot => ({
      startTime: slot.start,
      endTime: slot.end,
      available: !occupied.includes(slot.start),
    }));
  }

  // ─── Crear reserva ───────────────────────────────────────────────────────
  static async create(data: {
    facilityId: string;
    bookingDate: string;
    startTime: string;
    endTime: string;
    tenantId?: string;
    ownerId?: string;
    notes?: string;
  }) {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, data.facilityId)).limit(1);
    if (!facility) throw new Error('Instalación no encontrada');
    if (facility.status !== 'active') throw new Error('La instalación no está disponible');

    // Validar que no hay solapamiento
    const overlap = await db.select()
      .from(bookings)
      .where(and(
        eq(bookings.facilityId, data.facilityId),
        eq(bookings.bookingDate, data.bookingDate),
        eq(bookings.startTime, data.startTime),
      ))
      .execute();

    const active = overlap.filter(b => b.status !== 'cancelled');
    if (active.length > 0) throw new Error('Esta franja ya está reservada');

    // Validar máximo días de antelación
    const today = new Date();
    const booking = new Date(data.bookingDate);
    const diffDays = Math.ceil((booking.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays > (facility.maxDaysAhead || 14)) {
      throw new Error(`No se puede reservar con más de ${facility.maxDaysAhead} días de antelación`);
    }

    const status = facility.requiresApproval ? 'pending' : 'confirmed';
    const id = uuidv4();

    const [created] = await db.insert(bookings).values({
      id,
      facilityId: data.facilityId,
      communityId: facility.communityId!,
      tenantId: data.tenantId,
      ownerId: data.ownerId,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
      endTime: data.endTime,
      status,
      notes: data.notes,
    }).returning();

    return created;
  }

  // ─── Mis reservas (por tenantId u ownerId) ───────────────────────────────
  static async listByUser(options: { tenantId?: string; ownerId?: string }) {
    const conditions = [];
    if (options.tenantId) conditions.push(eq(bookings.tenantId, options.tenantId));
    if (options.ownerId) conditions.push(eq(bookings.ownerId, options.ownerId));
    if (conditions.length === 0) return [];

    return db.select({
      id: bookings.id,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      notes: bookings.notes,
      facilityName: facilities.name,
      facilityIcon: facilities.icon,
      facilityType: facilities.type,
    })
      .from(bookings)
      .leftJoin(facilities, eq(bookings.facilityId, facilities.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(bookings.bookingDate))
      .execute();
  }

  // ─── Cancelar reserva (solo el propietario o admin) ──────────────────────
  static async cancel(bookingId: string, requesterId: string, requesterRole: string) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) throw new Error('Reserva no encontrada');

    const isOwner = booking.tenantId === requesterId || booking.ownerId === requesterId;
    const isAdmin = ['admin', 'superadmin', 'operator'].includes(requesterRole);
    if (!isOwner && !isAdmin) throw new Error('Sin permisos para cancelar esta reserva');

    const [updated] = await db.update(bookings)
      .set({ status: 'cancelled' })
      .where(eq(bookings.id, bookingId))
      .returning();

    return updated;
  }

  // ─── Admin: todas las reservas de una comunidad ──────────────────────────
  static async listByCommunity(communityId: string, date?: string) {
    const conditions = [eq(bookings.communityId, communityId)];
    if (date) conditions.push(eq(bookings.bookingDate, date));

    return db.select({
      id: bookings.id,
      bookingDate: bookings.bookingDate,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      notes: bookings.notes,
      facilityName: facilities.name,
      facilityIcon: facilities.icon,
      tenantId: bookings.tenantId,
      ownerId: bookings.ownerId,
    })
      .from(bookings)
      .leftJoin(facilities, eq(bookings.facilityId, facilities.id))
      .where(and(...conditions))
      .orderBy(desc(bookings.bookingDate))
      .execute();
  }

  // ─── Admin: actualizar status de reserva ────────────────────────────────
  static async updateStatus(bookingId: string, status: string) {
    const [updated] = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updated;
  }

  // ─── Admin: CRUD instalaciones ───────────────────────────────────────────
  static async createFacility(data: {
    communityId: string;
    name: string;
    type?: string;
    icon?: string;
    description?: string;
    capacity?: number;
    pricePerSlot?: number;
    slotDuration?: number;
    openTime?: string;
    closeTime?: string;
    maxDaysAhead?: number;
    requiresApproval?: number;
  }) {
    const id = uuidv4();
    const [created] = await db.insert(facilities).values({ id, ...data }).returning();
    return created;
  }

  static async updateFacility(id: string, data: Partial<typeof facilities.$inferInsert>) {
    const [updated] = await db.update(facilities).set(data).where(eq(facilities.id, id)).returning();
    return updated;
  }

  static async listAllFacilities(communityId: string) {
    return db.select().from(facilities).where(eq(facilities.communityId, communityId)).execute();
  }
}

// ─── Helper: generar franjas horarias ───────────────────────────────────────
function generateSlots(openTime: string, closeTime: string, slotMinutes: number) {
  const slots: { start: string; end: string }[] = [];
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);

  let current = oh * 60 + om;
  const end = ch * 60 + cm;

  while (current + slotMinutes <= end) {
    const startH = String(Math.floor(current / 60)).padStart(2, '0');
    const startM = String(current % 60).padStart(2, '0');
    const endMin = current + slotMinutes;
    const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
    const endMStr = String(endMin % 60).padStart(2, '0');
    slots.push({ start: `${startH}:${startM}`, end: `${endH}:${endMStr}` });
    current += slotMinutes;
  }

  return slots;
}
