import { db } from '../db/index.ts';
import { convocatorias, communities } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function dateLong(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

export interface GenerateInput {
  communityId: string;
  communityName?: string;
  communityAddress?: string;
  tipo: 'Ordinaria' | 'Extraordinaria';
  ciudad: string;
  fechaCarta: string;
  fechaJunta: string;
  horasPrimera: string;
  horasSegunda: string;
  lugar: string;
  presidenteNombre: string;
  agendaItems: string; // JSON [{texto: string}]
  morososList?: string; // JSON [{propiedad: string, deuda: number}]
  morososFecha?: string;
  presupuesto?: string | null; // JSON {desde, hasta, items:[{codigo,titulo,importe}]}
  estadoCuentas?: string | null; // JSON {periodoDesde,periodoHasta,ingreso,gastos:[{concepto,importe}]}
  incluirDelegacion: boolean;
  incluirMorosos: boolean;
  incluirPresupuesto: boolean;
  incluirEstadoCuentas: boolean;
}

function buildDocumentText(data: GenerateInput): string {
  const items: { texto: string }[] = JSON.parse(data.agendaItems || '[]');
  const junta = new Date(data.fechaJunta + 'T12:00:00');
  const diaSemana = DIAS[junta.getDay()];
  const diaNum = junta.getDate();
  const mesNombre = MESES[junta.getMonth()];
  const anho = junta.getFullYear();

  let doc = '';

  // ── PÁGINA 1: Carta de Convocatoria ─────────────────────────────────────────
  doc += `COMUNIDAD DE PROPIETARIOS ${(data.communityName || '').toUpperCase()}\n`;
  if (data.communityAddress) doc += `${data.communityAddress}\n`;
  doc += '\n\n';
  doc += `                                    En ${data.ciudad}, a ${dateLong(data.fechaCarta)}\n\n`;
  doc += `Sr./a. Propietario/a:\n\n`;
  doc += `        Como Presidente de la Comunidad de Propietarios y de conformidad con lo\n`;
  doc += `dispuesto en el artículo 16.2 de la vigente Ley de Propiedad Horizontal, por la\n`;
  doc += `presente se le convoca para que asista a la Junta General ${data.tipo} que se\n`;
  doc += `celebrará el próximo ${diaSemana} día ${diaNum} de ${mesNombre} de ${anho} a las ${data.horasPrimera} horas en primera\n`;
  doc += `convocatoria, o de no concurrir el quórum necesario, a las ${data.horasSegunda} horas en\n`;
  doc += `segunda, en el ${data.lugar}, en la población de ${data.ciudad}, con el\n`;
  doc += `fin de tratar el siguiente:\n\n\n`;
  doc += `                              ORDEN DEL DIA\n\n`;

  items.forEach((item, i) => {
    doc += `${String(i + 1).padStart(2, '0')}.- ${item.texto}\n`;
  });

  doc += '\n\n\n';
  doc += `                              EL PRESIDENTE DE LA COMUNIDAD\n\n\n\n\n`;
  doc += `                              ${data.presidenteNombre || 'El/La Presidente/a'}\n`;

  // ── Talón de Delegación de Voto ─────────────────────────────────────────────
  if (data.incluirDelegacion) {
    doc += `\n\n${'─'.repeat(80)}\n\n`;
    doc += `Sr./a. Presidente/a de la Comunidad de Propietarios ${data.communityName},\n`;
    doc += `Muy Sr./a. mío/a:\n\n`;
    doc += `        Ante la imposibilidad de asistir a la Junta convocada por Vd., para el próximo\n`;
    doc += `${diaNum} de ${mesNombre} de ${anho} le participo haber otorgado mi representación para\n`;
    doc += `tal acto y a todos los efectos, al portador/a de la presente D/Dª_____________________________\n\n`;
    doc += `Atentamente:\n\n\n`;
    doc += `Fdo: ___________________________        DNI: _______________________\n`;
    doc += `Piso/Local: ____________________        Fecha: _____________________\n`;
  }

  // ── PÁGINA 2: Listado de Morosos ─────────────────────────────────────────────
  if (data.incluirMorosos) {
    const morosos: { propiedad: string; deuda: number }[] = JSON.parse(data.morososList || '[]');
    if (morosos.length > 0) {
      doc += `\n\n${'═'.repeat(80)}\n\n`;
      const fechaMor = data.morososFecha || data.fechaCarta;
      doc += `LISTADO DE PROPIETARIOS SIN DERECHO A VOTO A FECHA DE ${dateLong(fechaMor).toUpperCase()}:\n\n`;
      doc += `${'PROPIEDAD'.padEnd(52)}DEUDA\n`;
      doc += `${'─'.repeat(72)}\n`;
      morosos.forEach(m => {
        const deudaStr = new Intl.NumberFormat('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(m.deuda) + '€';
        const dots = '.'.repeat(Math.max(5, 52 - m.propiedad.length));
        doc += `${m.propiedad}${dots}${deudaStr.padStart(14)}\n`;
      });
    }
  }

  // ── PÁGINA 3: Presupuesto del Ejercicio ──────────────────────────────────────
  if (data.incluirPresupuesto && data.presupuesto) {
    let pres: any = {};
    try { pres = JSON.parse(data.presupuesto); } catch { /* skip */ }
    if (pres.items?.length > 0) {
      doc += `\n\n${'═'.repeat(80)}\n\n`;
      doc += `              PRESUPUESTO DEL EJERCICIO ${pres.desde || ''} al ${pres.hasta || ''}\n`;
      doc += `${'─'.repeat(72)}\n\n`;
      doc += `${'Código'.padEnd(14)}${'Título'.padEnd(38)}Presupuesto\n`;
      doc += `${'─'.repeat(72)}\n`;
      doc += `\nGRUPO  01 Gastos Generales\n`;
      doc += `${'─'.repeat(14)}\n`;
      let totalGrupo = 0;
      pres.items.forEach((item: any) => {
        const imp = parseFloat(item.importe) || 0;
        totalGrupo += imp;
        const impStr = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(imp);
        doc += `${String(item.codigo || '').padEnd(14)}${String(item.titulo || '').padEnd(38)}${impStr.padStart(12)}\n`;
      });
      doc += `\n${'─'.repeat(72)}\n`;
      const totalStr = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(totalGrupo);
      doc += `${'TOTAL GRUPO'.padEnd(52)}${totalStr.padStart(12)}\n`;
      doc += `${'─'.repeat(72)}\n`;
      doc += `${'TOTAL PRESUPUESTO'.padEnd(52)}${totalStr.padStart(12)}\n`;
    }
  }

  // ── PÁGINA 4: Estado de Cuentas ───────────────────────────────────────────────
  if (data.incluirEstadoCuentas && data.estadoCuentas) {
    let ec: any = {};
    try { ec = JSON.parse(data.estadoCuentas); } catch { /* skip */ }
    if (ec.gastos?.length > 0) {
      doc += `\n\n${'═'.repeat(80)}\n\n`;
      doc += `        INGRESOS Y GASTOS DE ${(data.communityName || '').toUpperCase()}\n`;
      doc += `        Periodo: Desde el ${ec.periodoDesde || ''} Hasta el ${ec.periodoHasta || ''}\n\n`;
      doc += `${'─'.repeat(72)}\n`;
      doc += `${''.padEnd(52)}Importe\n`;
      const ingStr = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(ec.ingreso || 0);
      doc += `INGRESO ANUAL${''.padEnd(39)}${ingStr.padStart(12)}\n\n`;
      doc += `GASTOS\n`;
      let totalGastos = 0;
      ec.gastos.forEach((g: any) => {
        const imp = parseFloat(g.importe) || 0;
        totalGastos += imp;
        const impStr = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(imp);
        doc += `${String(g.concepto || '').padEnd(52)}${impStr.padStart(12)}\n`;
      });
      doc += `\n${'─'.repeat(72)}\n`;
      const totGStr = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(totalGastos);
      doc += `${'Total gastos'.padEnd(52)}${totGStr.padStart(12)}\n`;
      doc += `\n(*) Los importes del presente informe están en Euros\n`;
    }
  }

  return doc;
}

export class ConvocatoriasService {
  /** Genera y guarda una convocatoria usando plantilla conforme a Art. 16.2 LPH */
  static async generate(data: GenerateInput) {
    let communityAddress = data.communityAddress || '';
    if (!communityAddress && data.communityId) {
      const comm = await db
        .select({ address: communities.address })
        .from(communities)
        .where(eq(communities.id, data.communityId))
        .execute();
      communityAddress = comm[0]?.address || '';
    }

    const content = buildDocumentText({ ...data, communityAddress });
    const id = uuidv4();

    await db.insert(convocatorias).values({
      id,
      communityId: data.communityId,
      tipo: data.tipo,
      ciudad: data.ciudad,
      fechaCarta: data.fechaCarta,
      fechaJunta: data.fechaJunta,
      horasPrimera: data.horasPrimera,
      horasSegunda: data.horasSegunda,
      lugar: data.lugar,
      presidenteNombre: data.presidenteNombre,
      agendaItems: data.agendaItems,
      morososList: data.morososList || '[]',
      morososFecha: data.morososFecha || data.fechaCarta,
      presupuesto: data.presupuesto || null,
      estadoCuentas: data.estadoCuentas || null,
      incluirDelegacion: data.incluirDelegacion ? 1 : 0,
      incluirMorosos: data.incluirMorosos ? 1 : 0,
      incluirPresupuesto: data.incluirPresupuesto ? 1 : 0,
      incluirEstadoCuentas: data.incluirEstadoCuentas ? 1 : 0,
      content,
      status: 'draft',
    });

    return { id, content };
  }

  /** Lista convocatorias, opcionalmente filtradas por comunidad */
  static async list(communityId?: string) {
    const query = db
      .select({
        id: convocatorias.id,
        communityId: convocatorias.communityId,
        communityName: communities.name,
        tipo: convocatorias.tipo,
        fechaJunta: convocatorias.fechaJunta,
        ciudad: convocatorias.ciudad,
        status: convocatorias.status,
        content: convocatorias.content,
        createdAt: convocatorias.createdAt,
      })
      .from(convocatorias)
      .leftJoin(communities, eq(convocatorias.communityId, communities.id))
      .orderBy(desc(convocatorias.createdAt));

    if (communityId) {
      return await query.where(eq(convocatorias.communityId, communityId)).execute();
    }
    return await query.execute();
  }

  /** Obtiene convocatoria por ID con todos los campos */
  static async getById(id: string) {
    const result = await db
      .select()
      .from(convocatorias)
      .leftJoin(communities, eq(convocatorias.communityId, communities.id))
      .where(eq(convocatorias.id, id))
      .execute();
    if (!result[0]) return null;
    return {
      ...result[0].convocatorias,
      communityName: result[0].communities?.name,
    };
  }

  /** Elimina una convocatoria */
  static async delete(id: string) {
    await db.delete(convocatorias).where(eq(convocatorias.id, id));
    return { id };
  }
}
