import { db } from '../db/index.ts';
import { minutes, communities } from '../db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class MinutesService {
  /** Genera un acta usando Groq AI */
  static async generate(data: {
    communityId: string;
    communityName: string;
    meetingDate: string;
    attendees: { name: string; unit: string; present: boolean }[];
    agendaItems: { topic: string; discussion: string; resolution: string }[];
  }) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

    const presentCount = data.attendees.filter(a => a.present).length;
    const totalCount = data.attendees.length;

    const prompt = `Genera un acta de junta de propietarios profesional y completa en español con el siguiente formato legal.

DATOS DE LA REUNIÓN:
- Comunidad: ${data.communityName}
- Fecha: ${data.meetingDate}
- Asistentes presentes: ${presentCount} de ${totalCount}
- Lista de asistentes:
${data.attendees.map(a => `  - ${a.name} (${a.unit}) - ${a.present ? 'PRESENTE' : 'AUSENTE'}`).join('\n')}

ORDEN DEL DÍA Y ACUERDOS:
${data.agendaItems.map((item, i) => `
${i + 1}. PUNTO: ${item.topic}
   Debate: ${item.discussion}
   Acuerdo adoptado: ${item.resolution}
`).join('\n')}

Genera el acta con:
1. Encabezado formal con datos de la comunidad y fecha
2. Asistencia y quórum
3. Desarrollo de cada punto del orden del día
4. Acuerdos adoptados
5. Cierre formal con hora de finalización
6. Espacio para firmas del Presidente y Secretario

Usa formato markdown profesional.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Eres un secretario administrativo experto en redacción de actas de juntas de propietarios. Genera documentos formales, claros y completos en español.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Más determinístico para documentos formales
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Error en Groq API');
    }

    const result = await response.json();
    const content = result.choices[0].message.content;

    // Guardar en BD
    const id = uuidv4();
    await db.insert(minutes).values({
      id,
      communityId: data.communityId,
      title: `Acta Junta - ${data.communityName} - ${data.meetingDate}`,
      meetingDate: data.meetingDate,
      attendees: JSON.stringify(data.attendees),
      agendaItems: JSON.stringify(data.agendaItems),
      content,
      generatedBy: 'ai',
      status: 'draft',
    });

    return { id, content };
  }

  /** Lista todas las actas, opcionalmente por comunidad */
  static async list(communityId?: string) {
    let query = db.select({
      id: minutes.id,
      communityId: minutes.communityId,
      communityName: communities.name,
      title: minutes.title,
      meetingDate: minutes.meetingDate,
      generatedBy: minutes.generatedBy,
      status: minutes.status,
      createdAt: minutes.createdAt,
    })
    .from(minutes)
    .leftJoin(communities, eq(minutes.communityId, communities.id))
    .orderBy(desc(minutes.createdAt));

    if (communityId) {
      return await query.where(eq(minutes.communityId, communityId)).execute();
    }

    return await query.execute();
  }

  /** Obtiene un acta por ID con contenido completo */
  static async getById(id: string) {
    const result = await db.select({
      id: minutes.id,
      communityId: minutes.communityId,
      communityName: communities.name,
      title: minutes.title,
      meetingDate: minutes.meetingDate,
      attendees: minutes.attendees,
      agendaItems: minutes.agendaItems,
      content: minutes.content,
      generatedBy: minutes.generatedBy,
      status: minutes.status,
      createdAt: minutes.createdAt,
    })
    .from(minutes)
    .leftJoin(communities, eq(minutes.communityId, communities.id))
    .where(eq(minutes.id, id))
    .execute();

    return result[0] || null;
  }

  /** Actualiza el estado de un acta */
  static async updateStatus(id: string, status: string) {
    await db.update(minutes).set({ status }).where(eq(minutes.id, id));
    return { id, status };
  }
}
