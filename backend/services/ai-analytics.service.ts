import { db } from '../db';
import { charges, bankTransactions, communities } from '../db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class AIAnalyticsService {
  static async getPredictiveBudget(communityId: string) {
    // 1. Get historical charges (expenses/billings)
    const historicalCharges = await db.select({
      concept: charges.concept,
      amount: charges.amount,
      issueDate: charges.issueDate,
    })
    .from(charges)
    .where(eq(charges.communityId, communityId));

    // 2. Get bank transactions (actual outflows if categorized)
    const outflows = await db.select({
      description: bankTransactions.description,
      amount: bankTransactions.amount,
      category: bankTransactions.category,
      date: bankTransactions.transactionDate,
    })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.communityId, communityId),
        eq(bankTransactions.direction, 'outbound')
      )
    );

    // 3. Construct context for the AI
    const context = {
      historicalSummary: historicalCharges.slice(-50), // Last 50 charges
      actualOutflows: outflows.slice(-50),
    };

    const prompt = `
      Eres un experto analista financiero para administración de fincas.
      Analiza los siguientes datos históricos de cargos y gastos reales de una comunidad de propietarios:
      ${JSON.stringify(context)}

      Basado en estos datos, genera una proyección detallada del presupuesto para el PRÓXIMO AÑO.
      Incluye:
      1. Estimación de gastos por categoría (Mantenimiento, Agua, Luz, Limpieza, Otros).
      2. Identificación de tendencias (ej: aumentos estacionales en verano por piscina).
      3. Recomendación de cuota mensual para cubrir estos gastos y mantener un fondo de reserva del 10%.
      4. Alertas de posibles desviaciones.

      Responde en formato JSON con la siguiente estructura:
      {
        "projections": [{"category": string, "estimatedAnnual": number, "monthly": number}],
        "trends": [string],
        "recommendations": string,
        "suggestedMonthlyQuota": number,
        "confidence": number
      }
    `;

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from markdown if necessary
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Failed to parse AI response" };
    } catch (error) {
      console.error('AI Analytics Error:', error);
      throw new Error('No se pudo generar el análisis predictivo');
    }
  }
}
