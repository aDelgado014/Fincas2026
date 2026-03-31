import { db } from '../db/index.ts';
import {
  communities, units, charges, owners, incidents,
  unitOwners, payments, minutes, bankTransactions,
} from '../db/schema.ts';
import { eq, sql, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';
import { EmailService } from './email.service.ts';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AIAction =
  | { type: 'download'; filename: string; data: string; mimeType: string }
  | { type: 'navigate'; path: string; label: string };

export interface AIResponse {
  content: string;
  action?: AIAction;
}

// ─── Rutas de la app ──────────────────────────────────────────────────────────

const SECTION_PATHS: Record<string, { path: string; label: string }> = {
  dashboard:      { path: '/',               label: 'Dashboard' },
  comunidades:    { path: '/comunidades',    label: 'Comunidades' },
  incidencias:    { path: '/incidencias',    label: 'Incidencias' },
  deuda:          { path: '/deuda',          label: 'Deuda' },
  actas:          { path: '/actas',          label: 'Actas' },
  comunicaciones: { path: '/comunicaciones', label: 'Comunicaciones' },
  importar:       { path: '/importar',       label: 'Importar' },
  conciliacion:   { path: '/conciliacion',   label: 'Conciliación' },
  auditoria:        { path: '/auditoria',          label: 'Auditoría' },
  'nueva-comunidad': { path: '/comunidades/nueva', label: 'Alta de Comunidad' },
};

// ─── Definición de Tools ──────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_communities',
      description: 'Lista las comunidades activas con unidades y deuda pendiente.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_debt_report',
      description: 'Informe de cargos pendientes por unidad y propietario.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre parcial (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_financial_summary',
      description: 'Resumen financiero de una comunidad: cargado, cobrado y pendiente.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
        },
        required: ['community_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_incidents',
      description: 'Lista incidencias, filtrable por estado.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'pending, in_progress, resolved (vacío = todas).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_incident',
      description: 'Crea una nueva incidencia en una comunidad.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
          title: { type: 'string', description: 'Título de la incidencia.' },
          description: { type: 'string', description: 'Descripción detallada.' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Prioridad.' },
        },
        required: ['community_name', 'title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_owner_details',
      description: 'Busca un propietario por nombre o email y muestra sus unidades y deuda.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Nombre o email del propietario.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_payment_history',
      description: 'Historial de pagos de una comunidad o unidad específica.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad (opcional).' },
          unit_code: { type: 'string', description: 'Código de unidad (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_minutes',
      description: 'Lista las actas de asambleas, filtrable por comunidad.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_charge_paid',
      description: 'Marca un cargo como pagado registrando el pago.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
          unit_code: { type: 'string', description: 'Código de la unidad.' },
          concept: { type: 'string', description: 'Concepto del cargo a marcar como pagado.' },
        },
        required: ['community_name', 'unit_code', 'concept'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_reconciliation_status',
      description: 'Estado de la conciliación bancaria: transacciones pendientes de revisar.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad (opcional).' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_community_notice',
      description: 'Envía un aviso por email a todos los propietarios de una comunidad.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
          title: { type: 'string', description: 'Asunto del aviso.' },
          message: { type: 'string', description: 'Cuerpo del mensaje.' },
        },
        required: ['community_name', 'title', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_excel_report',
      description: 'Genera un archivo Excel descargable con datos del sistema.',
      parameters: {
        type: 'object',
        properties: {
          report_type: {
            type: 'string',
            enum: ['communities', 'debts', 'owners', 'charges', 'incidents', 'payments'],
            description: 'Tipo de informe.',
          },
          community_name: { type: 'string', description: 'Filtrar por comunidad (opcional).' },
        },
        required: ['report_type'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_circular',
      description: 'Genera una circular o carta formal en HTML lista para imprimir/exportar a PDF.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
          subject: { type: 'string', description: 'Asunto de la circular.' },
          body: { type: 'string', description: 'Cuerpo del texto de la circular.' },
          date: { type: 'string', description: 'Fecha a mostrar (por defecto hoy).' },
        },
        required: ['community_name', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_charge',
      description: 'Crea un cargo pendiente para una unidad.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string' },
          unit_code: { type: 'string' },
          concept: { type: 'string' },
          amount: { type: 'number' },
          due_date: { type: 'string', description: 'YYYY-MM-DD (opcional).' },
        },
        required: ['community_name', 'unit_code', 'concept', 'amount'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'navigate_to',
      description: 'Navega a una sección de la aplicación.',
      parameters: {
        type: 'object',
        properties: {
          section: { type: 'string', enum: Object.keys(SECTION_PATHS) },
        },
        required: ['section'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'initiate_community_onboarding',
      description: 'Inicia el proceso de alta de una nueva comunidad. Navega al asistente de alta donde el administrador puede subir documentos (CIF, propietarios, coeficientes, deuda, derramas, movimientos) y la IA los procesará automáticamente.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_onboarding_summary',
      description: 'Obtiene un resumen de una comunidad recién dada de alta: número de unidades, propietarios, deuda total, derramas activas y alertas pendientes.',
      parameters: {
        type: 'object',
        properties: {
          community_name: { type: 'string', description: 'Nombre de la comunidad.' },
        },
        required: ['community_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'answer_legal_question',
      description: 'Responde dudas legales sobre comunidades de propietarios en España (Ley de Propiedad Horizontal, estatutos, derechos de propietarios, convocatorias, mayorías, etc.).',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'La pregunta legal del usuario.' },
          community_name: { type: 'string', description: 'Nombre de la comunidad (opcional, para contexto).' },
        },
        required: ['question'],
      },
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findCommunity(name: string) {
  return db.select().from(communities)
    .where(sql`lower(${communities.name}) like lower('%' || ${name} || '%')`)
    .limit(1).then(r => r[0]);
}

async function findUnit(communityId: string, code: string) {
  return db.select().from(units)
    .where(and(eq(units.communityId, communityId), sql`lower(${units.unitCode}) = lower(${code})`))
    .limit(1).then(r => r[0]);
}

// ─── Ejecutor de Tools ────────────────────────────────────────────────────────

async function executeTool(name: string, args: any): Promise<{ result: string; action?: AIAction }> {
  switch (name) {

    case 'list_communities': {
      const data = await db.select({
        nombre: communities.name,
        código: communities.code,
        unidades: sql<number>`count(distinct ${units.id})`,
        deuda: sql<number>`coalesce(sum(case when ${charges.status}='pending' then ${charges.amount} else 0 end),0)`,
      })
      .from(communities).leftJoin(units, eq(communities.id, units.communityId))
      .leftJoin(charges, eq(communities.id, charges.communityId))
      .where(eq(communities.status, 'active')).groupBy(communities.id).execute();
      if (!data.length) return { result: 'No hay comunidades activas.' };
      return { result: data.map(d => `- **${d.nombre}** | ${d.unidades} unidades | Deuda: €${Number(d.deuda).toFixed(2)}`).join('\n') };
    }

    case 'get_debt_report': {
      const rows = await db.select({
        comunidad: communities.name, unidad: units.unitCode,
        propietario: owners.fullName, concepto: charges.concept,
        importe: charges.amount, vencimiento: charges.dueDate,
      })
      .from(charges).leftJoin(communities, eq(charges.communityId, communities.id))
      .leftJoin(units, eq(charges.unitId, units.id))
      .leftJoin(owners, eq(charges.ownerId, owners.id))
      .where(eq(charges.status, 'pending')).execute();
      if (!rows.length) return { result: 'No hay cargos pendientes.' };
      const total = rows.reduce((s, r) => s + (r.importe || 0), 0);
      const preview = rows.slice(0, 8).map(r => `- ${r.comunidad} / **${r.unidad}** — ${r.propietario}: €${r.importe} (${r.concepto})`).join('\n');
      const extra = rows.length > 8 ? `\n_...y ${rows.length - 8} más_` : '';
      return { result: `**${rows.length} cargos pendientes — Total: €${total.toFixed(2)}**\n${preview}${extra}` };
    }

    case 'get_financial_summary': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };
      const [charged] = await db.select({ total: sql<number>`coalesce(sum(${charges.amount}),0)` }).from(charges).where(eq(charges.communityId, community.id));
      const [pending] = await db.select({ total: sql<number>`coalesce(sum(${charges.amount}),0)` }).from(charges).where(and(eq(charges.communityId, community.id), eq(charges.status, 'pending')));
      const [collected] = await db.select({ total: sql<number>`coalesce(sum(${payments.amount}),0)` })
        .from(payments).innerJoin(charges, eq(payments.chargeId, charges.id)).where(eq(charges.communityId, community.id));
      return { result: `**Resumen financiero: ${community.name}**\n- Total cargado: €${Number(charged.total).toFixed(2)}\n- Total cobrado: €${Number(collected.total).toFixed(2)}\n- Pendiente de cobro: €${Number(pending.total).toFixed(2)}` };
    }

    case 'list_incidents': {
      const q = db.select({ título: incidents.title, estado: incidents.status, prioridad: incidents.priority, comunidad: communities.name, fecha: incidents.createdAt })
        .from(incidents).leftJoin(communities, eq(incidents.communityId, communities.id));
      const data = args.status ? await q.where(eq(incidents.status, args.status)).execute() : await q.execute();
      if (!data.length) return { result: 'No se encontraron incidencias.' };
      return { result: `**${data.length} incidencias**\n` + data.slice(0, 10).map(d => `- [${d.estado}] **${d.título}** (${d.comunidad || '—'}) · ${d.prioridad}`).join('\n') };
    }

    case 'create_incident': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };
      await db.insert(incidents).values({ id: uuidv4(), communityId: community.id, title: args.title, description: args.description || '', priority: args.priority || 'medium', status: 'pending' });
      return { result: `✅ Incidencia creada: **${args.title}** en ${community.name} con prioridad ${args.priority || 'medium'}.` };
    }

    case 'get_owner_details': {
      const q = args.query.includes('@') ? eq(owners.email, args.query) : sql`lower(${owners.fullName}) like lower('%' || ${args.query} || '%')`;
      const [owner] = await db.select().from(owners).where(q).limit(1);
      if (!owner) return { result: `No se encontró ningún propietario con "${args.query}".` };
      const ownerUnits = await db.select({ unidad: units.unitCode, comunidad: communities.name })
        .from(unitOwners).innerJoin(units, eq(unitOwners.unitId, units.id))
        .innerJoin(communities, eq(units.communityId, communities.id)).where(eq(unitOwners.ownerId, owner.id));
      const [debt] = await db.select({ total: sql<number>`coalesce(sum(${charges.amount}),0)` }).from(charges).where(and(eq(charges.ownerId, owner.id), eq(charges.status, 'pending')));
      const unitList = ownerUnits.map(u => `${u.comunidad} / ${u.unidad}`).join(', ') || 'Sin unidades';
      return { result: `**${owner.fullName}**\n- Email: ${owner.email || '—'}\n- Teléfono: ${owner.phone || '—'}\n- NIF: ${owner.taxId || '—'}\n- Unidades: ${unitList}\n- Deuda pendiente: €${Number(debt.total).toFixed(2)}` };
    }

    case 'get_payment_history': {
      const rows = await db.select({
        fecha: payments.paymentDate, importe: payments.amount,
        concepto: charges.concept, unidad: units.unitCode, comunidad: communities.name,
      })
      .from(payments).innerJoin(charges, eq(payments.chargeId, charges.id))
      .innerJoin(communities, eq(charges.communityId, communities.id))
      .innerJoin(units, eq(charges.unitId, units.id))
      .orderBy(desc(payments.paymentDate)).limit(20).execute();
      if (!rows.length) return { result: 'No hay historial de pagos.' };
      return { result: `**Últimos ${rows.length} pagos:**\n` + rows.map(r => `- ${r.fecha?.slice(0, 10)} | ${r.comunidad} / ${r.unidad} | €${r.importe} — ${r.concepto}`).join('\n') };
    }

    case 'get_minutes': {
      const q = db.select({ título: minutes.title, fecha: minutes.meetingDate, estado: minutes.status, comunidad: communities.name })
        .from(minutes).leftJoin(communities, eq(minutes.communityId, communities.id)).orderBy(desc(minutes.meetingDate));
      const data = args.community_name
        ? await q.where(sql`lower(${communities.name}) like lower('%'||${args.community_name}||'%')`).execute()
        : await q.limit(10).execute();
      if (!data.length) return { result: 'No se encontraron actas.' };
      return { result: `**${data.length} actas:**\n` + data.map(d => `- ${d.fecha} | **${d.título}** (${d.comunidad}) · Estado: ${d.estado}`).join('\n') };
    }

    case 'mark_charge_paid': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };
      const unit = await findUnit(community.id, args.unit_code);
      if (!unit) return { result: `Unidad "${args.unit_code}" no encontrada.` };
      const [charge] = await db.select().from(charges)
        .where(and(eq(charges.unitId, unit.id), eq(charges.status, 'pending'), sql`lower(${charges.concept}) like lower('%'||${args.concept}||'%')`))
        .limit(1);
      if (!charge) return { result: `No se encontró el cargo "${args.concept}" pendiente para ${args.unit_code}.` };
      await db.update(charges).set({ status: 'paid' }).where(eq(charges.id, charge.id));
      await db.insert(payments).values({ id: uuidv4(), chargeId: charge.id, amount: charge.amount, paymentDate: new Date().toISOString(), source: 'manual' });
      return { result: `✅ Cargo **"${charge.concept}"** de €${charge.amount} marcado como pagado para ${args.unit_code}.` };
    }

    case 'get_reconciliation_status': {
      const q = db.select({ fecha: bankTransactions.transactionDate, descripción: bankTransactions.description, importe: bankTransactions.amount, dirección: bankTransactions.direction, comunidad: communities.name })
        .from(bankTransactions).leftJoin(communities, eq(bankTransactions.communityId, communities.id))
        .where(eq(bankTransactions.reviewStatus, 'pending')).orderBy(desc(bankTransactions.transactionDate)).limit(10);
      const data = await q.execute();
      if (!data.length) return { result: '✅ No hay transacciones pendientes de conciliar.' };
      const total = data.reduce((s, r) => s + Math.abs(r.importe || 0), 0);
      return { result: `**${data.length} transacciones pendientes de revisar (total: €${total.toFixed(2)})**\n` + data.map(d => `- ${d.fecha?.slice(0, 10)} | ${d.dirección === 'inbound' ? '↓' : '↑'} €${d.importe} — ${d.descripción}`).join('\n') };
    }

    case 'send_community_notice': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };
      const recipients = await db.select({ email: owners.email, name: owners.fullName })
        .from(owners).innerJoin(unitOwners, eq(owners.id, unitOwners.ownerId))
        .innerJoin(units, eq(unitOwners.unitId, units.id))
        .where(and(eq(units.communityId, community.id), sql`${owners.email} is not null and ${owners.email} != ''`))
        .execute();
      if (!recipients.length) return { result: `No hay propietarios con email en ${community.name}.` };
      let sent = 0;
      for (const r of recipients) {
        if (r.email) {
          await EmailService.sendGeneralNotice(r.email, r.name || 'Propietario', args.title, args.message);
          sent++;
        }
      }
      return { result: `✅ Aviso enviado a **${sent} propietarios** de ${community.name}.\nAsunto: "${args.title}"` };
    }

    case 'generate_excel_report': {
      const { report_type } = args;
      let rows: Record<string, any>[] = [];
      let sheetName = 'Informe';
      if (report_type === 'communities') {
        rows = await db.select({ Nombre: communities.name, Código: communities.code, NIF: communities.nif, Dirección: communities.address, Estado: communities.status }).from(communities).execute();
        sheetName = 'Comunidades';
      } else if (report_type === 'debts') {
        rows = await db.select({ Comunidad: communities.name, Unidad: units.unitCode, Propietario: owners.fullName, Concepto: charges.concept, 'Importe (€)': charges.amount, Vencimiento: charges.dueDate })
          .from(charges).leftJoin(communities, eq(charges.communityId, communities.id))
          .leftJoin(units, eq(charges.unitId, units.id)).leftJoin(owners, eq(charges.ownerId, owners.id))
          .where(eq(charges.status, 'pending')).execute();
        sheetName = 'Deudas';
      } else if (report_type === 'charges') {
        rows = await db.select({ Comunidad: communities.name, Unidad: units.unitCode, Propietario: owners.fullName, Concepto: charges.concept, 'Importe (€)': charges.amount, Estado: charges.status, Vencimiento: charges.dueDate })
          .from(charges).leftJoin(communities, eq(charges.communityId, communities.id))
          .leftJoin(units, eq(charges.unitId, units.id)).leftJoin(owners, eq(charges.ownerId, owners.id)).execute();
        sheetName = 'Cargos';
      } else if (report_type === 'owners') {
        rows = await db.select({ Nombre: owners.fullName, Email: owners.email, Teléfono: owners.phone, NIF: owners.taxId }).from(owners).execute();
        sheetName = 'Propietarios';
      } else if (report_type === 'incidents') {
        rows = await db.select({ Título: incidents.title, Estado: incidents.status, Prioridad: incidents.priority, 'Coste (€)': incidents.cost, Comunidad: communities.name, Fecha: incidents.createdAt })
          .from(incidents).leftJoin(communities, eq(incidents.communityId, communities.id)).execute();
        sheetName = 'Incidencias';
      } else if (report_type === 'payments') {
        rows = await db.select({ Fecha: payments.paymentDate, 'Importe (€)': payments.amount, Concepto: charges.concept, Comunidad: communities.name, Unidad: units.unitCode, Fuente: payments.source })
          .from(payments).innerJoin(charges, eq(payments.chargeId, charges.id))
          .innerJoin(communities, eq(charges.communityId, communities.id))
          .innerJoin(units, eq(charges.unitId, units.id)).execute();
        sheetName = 'Pagos';
      }
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(rows), sheetName);
      const buf: Buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `${report_type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      return { result: `Informe "${sheetName}" generado con ${rows.length} registros.`, action: { type: 'download', filename, data: buf.toString('base64'), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } };
    }

    case 'generate_circular': {
      const date = args.date || new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${args.subject}</title><style>body{font-family:Arial,sans-serif;margin:60px;color:#1a1a1a;line-height:1.7}h1{font-size:16px;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}.meta{text-align:center;color:#666;font-size:13px;margin-bottom:32px}.body{font-size:14px;text-align:justify}.firma{margin-top:48px;font-size:13px}@media print{body{margin:2cm}}</style></head><body><h1>${args.subject}</h1><div class="meta">${args.community_name} &nbsp;·&nbsp; ${date}</div><div class="body"><p>${args.body.replace(/\n/g, '</p><p>')}</p></div><div class="firma"><p>Atentamente,</p><p><strong>La Administración</strong><br>${args.community_name}</p></div></body></html>`;
      const data = Buffer.from(html, 'utf-8').toString('base64');
      const filename = `circular_${args.community_name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.html`;
      return { result: `Circular "${args.subject}" generada. Ábrela en el navegador y usa Ctrl+P para exportar a PDF.`, action: { type: 'download', filename, data, mimeType: 'text/html; charset=utf-8' } };
    }

    case 'create_charge': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };
      const unit = await findUnit(community.id, args.unit_code);
      if (!unit) return { result: `Unidad "${args.unit_code}" no encontrada en ${community.name}.` };
      const ownerLink = await db.select().from(unitOwners).where(eq(unitOwners.unitId, unit.id)).limit(1).then(r => r[0]);
      const dueDate = args.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await db.insert(charges).values({ id: uuidv4(), communityId: community.id, unitId: unit.id, ownerId: ownerLink?.ownerId, concept: args.concept, amount: args.amount, dueDate, status: 'pending' });
      return { result: `✅ Cargo creado: **"${args.concept}"** de €${args.amount} para ${args.unit_code} en ${community.name}. Vencimiento: ${dueDate}.` };
    }

    case 'navigate_to': {
      const dest = SECTION_PATHS[args.section];
      if (!dest) return { result: `Sección "${args.section}" no reconocida.` };
      return { result: `Navegando a ${dest.label}.`, action: { type: 'navigate', path: dest.path, label: dest.label } };
    }

    case 'initiate_community_onboarding': {
      return {
        result: `Te llevo al asistente de alta de comunidad. Sube los documentos habituales:\n- **CIF** (identificación fiscal)\n- **Coeficientes y cuotas**\n- **Listado de propietarios**\n- **Deuda pendiente**\n- **Derramas** (si las hay)\n- **Movimientos bancarios** (si los tienes)\n\nPuedes subir tantos documentos como necesites — se admiten PDF, imágenes y Excel.`,
        action: { type: 'navigate', path: '/comunidades/nueva', label: 'Alta de Comunidad' },
      };
    }

    case 'get_onboarding_summary': {
      const community = await findCommunity(args.community_name);
      if (!community) return { result: `Comunidad "${args.community_name}" no encontrada.` };

      const [unitCount, ownerCount, debtRows] = await Promise.all([
        db.select().from(units).where(eq(units.communityId, community.id)).then(r => r.length),
        db.select().from(unitOwners)
          .innerJoin(units, eq(unitOwners.unitId, units.id))
          .where(eq(units.communityId, community.id))
          .then(r => r.length),
        db.select().from(charges)
          .where(and(eq(charges.communityId, community.id), eq(charges.status, 'pending')))
          .then(r => r),
      ]);

      const totalDebt = debtRows.reduce((s: number, c: any) => s + (c.amount || 0), 0);
      const derramaCharges = debtRows.filter((c: any) => c.concept?.includes('Derrama'));
      const uniqueDerramas = new Set(derramaCharges.map((c: any) => c.concept?.split(' - ')[0]));

      return {
        result: `**Resumen de ${community.name}:**\n- Unidades: **${unitCount}**\n- Propietarios: **${ownerCount}**\n- Deuda total pendiente: **€${totalDebt.toFixed(2)}**\n- Derramas activas: **${uniqueDerramas.size}**\n- Cargos pendientes: **${debtRows.length}**`,
      };
    }

    case 'answer_legal_question': {
      let context = '';
      if (args.community_name) {
        const community = await findCommunity(args.community_name);
        if (community) {
          context = ` La comunidad en cuestión es "${community.name}", con NIF ${community.nif || 'no registrado'} y dirección ${community.address || 'no registrada'}.`;
        }
      }
      // Return a marker so the LLM answers from its own knowledge
      return { result: `[LEGAL_QUESTION]${context} Pregunta: ${args.question}` };
    }

    default:
      return { result: 'Herramienta desconocida.' };
  }
}

// ─── Servicio Principal ───────────────────────────────────────────────────────

export class AIService {
  static async getChatResponse(messages: { role: string; content: string }[]): Promise<AIResponse> {
    // Read from process.env on every call so keys saved via Settings take effect immediately
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY no configurada.');

    const system = {
      role: 'system',
      content: `Eres el Asistente Inteligente de AdminFincas (gestión de comunidades de propietarios en España).

Tienes acceso a herramientas para: consultar y modificar datos reales, generar informes Excel, crear incidencias y cargos, enviar avisos por email, generar circulares formales y navegar por la app.

Normas:
- Responde siempre en español, de forma profesional y directa.
- Usa las herramientas cuando el usuario pida datos o acciones.
- Para acciones irreversibles (enviar emails, crear cargos), resume qué vas a hacer antes de ejecutar si no está claro.
- Muestra los resultados de forma clara usando **negrita** para datos importantes.`,
    };

    const groqMessages: any[] = [system, ...messages];
    let pendingAction: AIAction | undefined;

    for (let i = 0; i < 5; i++) {
      const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: groqMessages, tools: TOOLS, tool_choice: 'auto', temperature: 0.3 }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error?.message || 'Error Groq API'); }

      const data = await resp.json();
      const choice = data.choices[0];

      if (choice.finish_reason !== 'tool_calls' || !choice.message.tool_calls?.length) {
        return { content: choice.message.content, action: pendingAction };
      }

      groqMessages.push(choice.message);

      for (const tc of choice.message.tool_calls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
        const { result, action } = await executeTool(tc.function.name, args);
        if (action) pendingAction = action;
        groqMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
    }

    return { content: 'Operaciones completadas.', action: pendingAction };
  }
}
