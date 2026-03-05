import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const AGENCIES = [
  { name: 'Total Grupo', col: 'D' },
  { name: 'Acura Interlomas', col: 'L' },
  { name: 'GWM Morelos', col: 'T' },
  { name: 'GWM Iztapalapa', col: 'AB' },
  { name: 'Honda Cuajimalpa', col: 'AJ' },
  { name: 'Honda Interlomas', col: 'AR' },
  { name: 'KIA Interlomas', col: 'AZ' },
  { name: 'KIA Iztapalapa', col: 'BH' },
  { name: 'MG Cuajimalpa', col: 'BP' },
  { name: 'MG Interlomas', col: 'BX' },
  { name: 'MG Iztapalapa', col: 'CF' },
  { name: 'MG Santa Fe', col: 'CN' },
];

// Fila 1: nombres de agencias
// Fila 7: headers de columnas (Metrica, Dic, Ene, Feb, ... Mar real, Mar forecast, Promedio hist, Forecast IA)
// Filas 8-20: datos de metricas
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

function colToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) {
    result = result * 26 + (col.charCodeAt(i) - 64);
  }
  return result;
}

function numberToCol(num: number): string {
  let result = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

function addToColumn(col: string, offset: number): string {
  return numberToCol(colToNumber(col) + offset);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyParam = searchParams.get('agency') || 'Total Grupo';

    const agency = AGENCIES.find(a => a.name === agencyParam);
    if (!agency) {
      return NextResponse.json(
        { success: false, error: 'Agencia no encontrada' },
        { status: 404 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Leer fila de headers para esta agencia (hasta 30 columnas de ancho)
    const headerRange = `'Dashboard Forecast'!${agency.col}${HEADER_ROW}:${addToColumn(agency.col, 30)}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];

    // Guard: si no hay headers suficientes, retornar error descriptivo
    if (headers.length < 4) {
      return NextResponse.json({
        success: false,
        error: `Headers insuficientes para ${agency.name}. Se encontraron ${headers.length} columnas en fila ${HEADER_ROW}. Range: ${headerRange}`,
        debugHeaders: headers,
      }, { status: 422 });
    }

    // Filtrar solo columnas no vacias
    const nonEmptyHeaders = headers.filter((h: string) => h !== '');
    const lastColIndex = nonEmptyHeaders.length - 1;
    const endCol = addToColumn(agency.col, lastColIndex);

    // Leer datos de la agencia (filas 8 a 20)
    const dataRange = `'Dashboard Forecast'!${agency.col}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });

    const rows = response.data.values || [];

    // Las ultimas 4 columnas son siempre:
    // [n-4]: X real  (mes actual real)
    // [n-3]: X forecast (mes actual forecast)
    // [n-2]: Promedio hist
    // [n-1]: Forecast IA
    const forecastIAIndex = nonEmptyHeaders.length - 1;
    const promHistIndex = nonEmptyHeaders.length - 2;
    const mesActualForecastIndex = nonEmptyHeaders.length - 3;
    const mesActualRealIndex = nonEmptyHeaders.length - 4;

    // Meses historicos = todo entre Metrica (idx 0) y mesActualReal
    const historicalHeaders = nonEmptyHeaders.slice(1, mesActualRealIndex);

    const metrics = rows.map((row: any[]) => {
      const historical: { [key: string]: number } = {};
      historicalHeaders.forEach((header: string, idx: number) => {
        historical[header] = parseFloat(row[idx + 1]) || 0;
      });

      return {
        metric: row[0] || '',
        historical,
        mesActualReal: parseFloat(row[mesActualRealIndex]) || 0,
        mesActualForecast: parseFloat(row[mesActualForecastIndex]) || 0,
        promHist: parseFloat(row[promHistIndex]) || 0,
        forecastIA: parseFloat(row[forecastIAIndex]) || 0,
      };
    });

    // Extraer nombre del mes actual desde el header (ej: "Mar real" -> "Mar")
    const mesActualRealLabel = nonEmptyHeaders[mesActualRealIndex] || 'Real';
    const mesActualForecastLabel = nonEmptyHeaders[mesActualForecastIndex] || 'Forecast';
    const mesActual = mesActualRealLabel
      .replace(/ real$/i, '')
      .replace(/ forecast$/i, '')
      .trim();

    return NextResponse.json({
      success: true,
      agency: agency.name,
      agencies: AGENCIES.map(a => a.name),
      headers: {
        historical: historicalHeaders,
        mesActual,
        mesActualRealLabel,
        mesActualForecastLabel,
      },
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error reading forecast data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
