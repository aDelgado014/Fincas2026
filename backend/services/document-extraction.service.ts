import * as xlsx from 'xlsx';

// ─── Types ─────────────────────────────────────────────────────────────────

export type DocumentType =
  | 'cif'
  | 'coeficientes'
  | 'propietarios'
  | 'deuda'
  | 'derramas'
  | 'movimientos'
  | 'unknown';

export interface CIFData {
  nif: string;
  name: string;
  address: string;
  confidence: number;
}

export interface UnitData {
  type: string;       // e.g. "LOCAL DERECHO", "1ºIZQ", "ATICO"
  coefficient: number;
  monthlyFee: number;
}

export interface OwnerData {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  unitHint: string;   // raw address fragment from doc
  unitType: string;   // normalized unit type
}

export interface DebtCharge {
  unitCode: string;
  ownerName: string;
  amount: number;
}

export interface Derrama {
  name: string;
  startDate: string;
  endDate: string;
  amounts: { locales?: number; viviendas?: number; atico?: number };
}

export interface BankTransaction {
  date: string;
  concept: string;
  amount: number;
  balance?: number;
  direction: 'inbound' | 'outbound';
}

export interface Alert {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

export interface ExtractedCommunityData {
  cif?: CIFData;
  units: UnitData[];
  owners: OwnerData[];
  debt: DebtCharge[];
  derramas: Derrama[];
  transactions: BankTransaction[];
  alerts: Alert[];
}

// ─── Groq helper ───────────────────────────────────────────────────────────

async function callGroqJSON(prompt: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
    }),
  });

  const result = await response.json();
  const content: string = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Respuesta vacía del modelo');

  const match =
    content.match(/```json\s*([\s\S]*?)```/) ||
    content.match(/(\{[\s\S]*\})/s) ||
    content.match(/(\[[\s\S]*\])/s);
  const jsonStr = match ? match[1].trim() : content.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error('El modelo no devolvió JSON válido');
  }
}

// ─── Unit type normalizer ───────────────────────────────────────────────────

export function normalizeUnitType(hint: string): string {
  const h = (hint || '').toUpperCase().trim();
  if ((h.includes('LOCAL') || h.includes('LOCA')) && (h.includes('IZQ') || h.includes('IZD'))) return 'LOCAL IZQUIERDO';
  if ((h.includes('LOCAL') || h.includes('LOCA')) && (h.includes('DER') || h.includes('DCH'))) return 'LOCAL DERECHO';
  if (h.includes('ATIC') || h.includes('ÁTIC')) return 'ATICO';

  // "NºIZQ" / "Nº IZQUIERDA" patterns
  const floorL = h.match(/(\d)[ºª°\s]*(?:IZQ|IZD)/);
  if (floorL) return `${floorL[1]}ºIZQ`;
  const floorR = h.match(/(\d)[ºª°\s]*(?:DER|DCH)/);
  if (floorR) return `${floorR[1]}ºDER`;

  return h;
}

// ─── Document classifier ────────────────────────────────────────────────────

export function classifyDocument(filename: string, textSample: string): { type: DocumentType; confidence: number } {
  const name = filename.toLowerCase();
  const text = textSample.toLowerCase().substring(0, 600);

  if (name.includes('cif') || text.includes('identificación fiscal') || text.includes('agencia tributaria') || text.includes('h358')) {
    return { type: 'cif', confidence: 0.95 };
  }
  if (name.includes('coeficiente') || name.includes('cuota') || text.includes('coeficiente de participación') || (text.includes('local derecho') && text.includes('coef'))) {
    return { type: 'coeficientes', confidence: 0.95 };
  }
  if (name.includes('propietario') || name.includes('contacto') || text.includes('listado de propietarios') || text.includes('código cliente') || (text.includes('móvil') && text.includes('mail'))) {
    return { type: 'propietarios', confidence: 0.95 };
  }
  if (name.includes('deuda') || name.includes('recibo') || text.includes('recibos pendientes') || text.includes('total deudores') || text.includes('listado de recibos')) {
    return { type: 'deuda', confidence: 0.9 };
  }
  if (name.includes('derrama') || text.includes('derrama') || text.includes('patios interiores') || text.includes('antena comunitaria')) {
    return { type: 'derramas', confidence: 0.9 };
  }
  if (name.includes('movimiento') || name.includes('cuenta') || (name.endsWith('.xls') || name.endsWith('.xlsx')) || text.includes('saldo')) {
    return { type: 'movimientos', confidence: 0.85 };
  }
  return { type: 'unknown', confidence: 0 };
}

// ─── Extraction functions ───────────────────────────────────────────────────

export class DocumentExtractionService {

  static async extractCIF(text: string): Promise<CIFData> {
    const result = await callGroqJSON(
      `Extrae los datos de identificación fiscal de una comunidad de propietarios española del siguiente texto. Devuelve SOLO JSON:
{
  "nif": "el NIF o CIF de la comunidad (ej: H35822089)",
  "name": "nombre completo de la comunidad",
  "address": "dirección completa",
  "confidence": 0.9
}
Texto: ${text.substring(0, 3000)}`
    );
    return {
      nif: result.nif || '',
      name: result.name || '',
      address: result.address || '',
      confidence: result.confidence ?? 0.8,
    };
  }

  static async extractCoeficientes(text: string): Promise<UnitData[]> {
    const result = await callGroqJSON(
      `Extrae la tabla de coeficientes de participación y cuotas mensuales de una comunidad de propietarios española. Devuelve SOLO un JSON array:
[
  { "type": "LOCAL DERECHO", "coefficient": 12.50, "monthlyFee": 63 },
  { "type": "LOCAL IZQUIERDO", "coefficient": 12.50, "monthlyFee": 63 },
  { "type": "1ºIZQ", "coefficient": 6.56, "monthlyFee": 50 }
]
El coeficiente es porcentaje (ej: 12.50), la cuota en euros. Normaliza el tipo: LOCAL DERECHO, LOCAL IZQUIERDO, 1ºIZQ, 1ºDER, 2ºIZQ, 2ºDER, ... ATICO.
Texto: ${text.substring(0, 3000)}`
    );
    return Array.isArray(result) ? result : (result.units || []);
  }

  static async extractPropietarios(text: string): Promise<OwnerData[]> {
    const result = await callGroqJSON(
      `Extrae el listado completo de propietarios de una comunidad de propietarios española. La dirección postal contiene el piso (ej: "LOCA IZQD" = LOCAL IZQUIERDO, "1º IZQD" = 1ºIZQ, "ÁTICO" = ATICO).
Devuelve SOLO un JSON array:
[
  { "code": "01", "name": "JOSE ANTONIO SANTIAGO CORTES", "email": "joseantonio@santimarti.co", "phone": "928246264", "mobile": "630010677", "unitHint": "LOCAL IZQUIERDO" }
]
El campo "unitHint" es el tipo de piso inferido de la dirección. Valores posibles: LOCAL DERECHO, LOCAL IZQUIERDO, 1ºIZQ, 1ºDER, 2ºIZQ, 2ºDER, 3ºIZQ, 3ºDER, 4ºIZQ, 4ºDER, 5ºIZQ, 5ºDER, ATICO.
Texto: ${text.substring(0, 8000)}`
    );
    const raw: any[] = Array.isArray(result) ? result : (result.owners || []);
    return raw.map(o => ({
      ...o,
      unitType: normalizeUnitType(o.unitHint || ''),
    }));
  }

  static async extractDeuda(text: string): Promise<{ charges: DebtCharge[]; totalDebt: number }> {
    const result = await callGroqJSON(
      `Extrae el listado de recibos pendientes de una comunidad de propietarios española. Devuelve SOLO JSON:
{
  "charges": [
    { "unitCode": "LOCAL IZQUIERDO", "ownerName": "JOSE ANTONIO SANTIAGO CORTES", "amount": 63.00 }
  ],
  "totalDebt": 6663.00
}
Texto: ${text.substring(0, 5000)}`
    );
    return {
      charges: result.charges || [],
      totalDebt: result.totalDebt || 0,
    };
  }

  static async extractDerramas(text: string): Promise<Derrama[]> {
    const result = await callGroqJSON(
      `Extrae las derramas (cuotas extraordinarias) de una comunidad de propietarios española. Devuelve SOLO un JSON array:
[
  {
    "name": "PATIOS INTERIORES",
    "startDate": "2025-10-01",
    "endDate": "2026-09-30",
    "amounts": { "locales": 104, "viviendas": 55, "atico": 78 }
  },
  {
    "name": "ANTENA COMUNITARIA",
    "startDate": "2025-10-01",
    "endDate": "2026-09-30",
    "amounts": { "viviendas": 9, "atico": 13 }
  }
]
Fechas en formato YYYY-MM-DD. Importes en euros/mes. "amounts" solo incluye los tipos de propiedad mencionados.
Texto: ${text.substring(0, 3000)}`
    );
    return Array.isArray(result) ? result : (result.derramas || []);
  }

  static extractMovimientos(xlsBuffer: Buffer): BankTransaction[] {
    const workbook = xlsx.read(xlsBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

    return rows
      .map(row => {
        const rawAmount =
          parseFloat(row['Importe'] ?? row['importe'] ?? row['Amount'] ?? row['Haber'] ?? row['Debe'] ?? 0);
        const balance = parseFloat(row['Saldo'] ?? row['saldo'] ?? row['Balance'] ?? 0);
        return {
          date: String(row['Fecha'] ?? row['fecha'] ?? row['Date'] ?? ''),
          concept: String(row['Concepto'] ?? row['concepto'] ?? row['Descripción'] ?? row['Description'] ?? ''),
          amount: Math.abs(rawAmount),
          balance: isNaN(balance) ? undefined : balance,
          direction: rawAmount >= 0 ? ('inbound' as const) : ('outbound' as const),
        };
      })
      .filter(t => t.concept && t.date);
  }

  // ─── Merge multiple extractions of same type ─────────────────────────────

  static mergeUnits(arrays: UnitData[][]): UnitData[] {
    const seen = new Set<string>();
    return arrays.flat().filter(u => {
      if (seen.has(u.type)) return false;
      seen.add(u.type);
      return true;
    });
  }

  static mergeOwners(arrays: OwnerData[][]): OwnerData[] {
    const seen = new Set<string>();
    return arrays.flat().filter(o => {
      const key = o.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  static mergeDebt(arrays: { charges: DebtCharge[]; totalDebt: number }[]): { charges: DebtCharge[]; totalDebt: number } {
    const charges = arrays.flatMap(a => a.charges);
    const totalDebt = arrays.reduce((s, a) => s + (a.totalDebt || 0), 0);
    return { charges, totalDebt };
  }

  static mergeDerramas(arrays: Derrama[][]): Derrama[] {
    const seen = new Set<string>();
    return arrays.flat().filter(d => {
      if (seen.has(d.name)) return false;
      seen.add(d.name);
      return true;
    });
  }

  static mergeTransactions(arrays: BankTransaction[][]): BankTransaction[] {
    return arrays.flat();
  }

  // ─── Validation / Alert engine ────────────────────────────────────────────

  static validateData(data: Omit<ExtractedCommunityData, 'alerts'>): Alert[] {
    const alerts: Alert[] = [];

    if (!data.cif?.nif) {
      alerts.push({ severity: 'warning', field: 'cif', message: 'No se detectó el NIF de la comunidad' });
    }

    if (data.units.length > 0) {
      const totalCoeff = data.units.reduce((s, u) => s + (u.coefficient || 0), 0);
      if (Math.abs(totalCoeff - 100) > 0.5) {
        alerts.push({ severity: 'warning', field: 'units', message: `Los coeficientes suman ${totalCoeff.toFixed(2)}% (deberían ser 100%)` });
      }
    }

    if (data.units.length > 0 && data.owners.length > 0) {
      const assignedTypes = new Set(data.owners.map(o => o.unitType));
      const unassigned = data.units.filter(u => !assignedTypes.has(u.type));
      if (unassigned.length > 0) {
        alerts.push({ severity: 'warning', field: 'owners', message: `${unassigned.length} unidad(es) sin propietario: ${unassigned.map(u => u.type).join(', ')}` });
      }
    }

    const badCharges = data.debt.filter(c => c.amount <= 0);
    if (badCharges.length > 0) {
      alerts.push({ severity: 'error', field: 'debt', message: `${badCharges.length} cargo(s) con importe negativo o cero` });
    }

    const noEmail = data.owners.filter(o => !o.email);
    if (noEmail.length > 0) {
      alerts.push({ severity: 'info', field: 'owners', message: `${noEmail.length} propietario(s) sin email (no recibirán notificaciones)` });
    }

    for (const d of data.derramas) {
      const amounts = Object.values(d.amounts).filter(v => v !== undefined) as number[];
      if (amounts.length === 0 || amounts.some(v => v <= 0)) {
        alerts.push({ severity: 'warning', field: 'derramas', message: `La derrama "${d.name}" tiene importes inválidos` });
      }
    }

    const negBalance = data.transactions.filter(t => (t.balance ?? 0) < 0);
    if (negBalance.length > 0) {
      alerts.push({ severity: 'warning', field: 'transactions', message: `${negBalance.length} movimiento(s) con saldo negativo` });
    }

    return alerts;
  }

  // ─── Count derrama charges to be created ─────────────────────────────────

  static countDerramaCharges(derramas: Derrama[], units: UnitData[]): number {
    let total = 0;
    for (const d of derramas) {
      const start = new Date(d.startDate);
      const end = new Date(d.endDate);
      const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);

      for (const u of units) {
        const type = u.type.toLowerCase();
        if (d.amounts.locales !== undefined && (type.includes('local'))) total += months;
        else if (d.amounts.atico !== undefined && type.includes('atic')) total += months;
        else if (d.amounts.viviendas !== undefined) total += months;
      }
    }
    return total;
  }
}
