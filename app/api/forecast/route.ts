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

// Fila donde está el header de meses (fila 6 en Sheets = index 6)
const HEADER_ROW = 6;
const DATA_START_ROW = 7;
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

    // Leer fila de headers para saber cuántas columnas hay
    const headerRange = `'Dashboard Forecast'!${agency.col}${HEADER_ROW}:${addToColumn(agency.col, 20)}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });

    const headers = (headerResponse.data.values?.[0] || []) as string[];
    
    // Encontrar hasta dónde llegan los datos (última columna con header)
    const lastColIndex = headers.filter((h: string) => h !== '').length - 1;
    const endCol = addToColumn(agency.col, lastColIndex);

    // Leer datos de la agencia
    const dataRange = `'Dashboard Forecast'!${agency.col}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });

    const rows = response.data.values || [];

    // Construir columnas dinámicamente basado en headers
    // Headers esperados: Métrica, Dic, Ene, Feb, [meses históricos...], [Mes real], [Mes Forecast], Promedio hist, Forecast IA
    const monthHeaders = headers.slice(1); // Quitar "Métrica"
    
    // Las últimas 2 columnas siempre son "Promedio hist" y "Forecast IA"
    // La penúltima antes de esas es "X Forecast" (mes en curso forecast)
    // La antepenúltima es "X real" (mes en curso real)
    const forecastIAIndex = headers.length - 1;
    const promHistIndex = headers.length - 2;
    const mesActualForecastIndex = headers.length - 3;
    const mesActualRealIndex = headers.length - 4;

    // Meses históricos = todo lo que está entre Métrica y mesActualReal
    const historicalHeaders = headers.slice(1, mesActualRealIndex);

    const metrics = rows.slice(1).map((row: any[]) => {
      // Construir histórico dinámico
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

    return NextResponse.json({
      success: true,
      agency: agency.name,
      agencies: AGENCIES.map(a => a.name),
      headers: {
        historical: historicalHeaders,
        mesActual: headers[mesActualRealIndex]?.replace(' real', '') || 'Mes actual',
        mesActualRealLabel: headers[mesActualRealIndex] || 'Real',
        mesActualForecastLabel: headers[mesActualForecastIndex] || 'Forecast',
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
