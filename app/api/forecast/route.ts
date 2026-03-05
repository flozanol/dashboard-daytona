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

// Estructura fija del Sheet: 8 columnas por agencia
// col+0: Metrica
// col+1: Dic (historico 1)
// col+2: Ene (historico 2)
// col+3: Feb (historico 3)
// col+4: Mar real (mes actual real)
// col+5: Mar forecast (mes actual forecast)
// col+6: Promedio hist mensual
// col+7: Forecast IA
const BLOCK_SIZE = 8;
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

// Indices dentro del bloque de cada agencia
const IDX_METRICA = 0;
const IDX_HISTORICO_START = 1;
const IDX_HISTORICO_END = 3; // Dic, Ene, Feb
const IDX_MES_REAL = 4;      // Mar real
const IDX_MES_FORECAST = 5;  // Mar forecast
const IDX_PROM_HIST = 6;     // Promedio hist mensual
const IDX_FORECAST_IA = 7;   // Forecast IA

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

    // Columna inicial y final del bloque de esta agencia (exactamente BLOCK_SIZE columnas)
    const startCol = agency.col;
    const endCol = addToColumn(startCol, BLOCK_SIZE - 1);

    // Leer headers de la fila 7
    const headerRange = `'Dashboard Forecast'!${startCol}${HEADER_ROW}:${endCol}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const headerRow = (headerResponse.data.values?.[0] || []) as string[];

    // Leer datos filas 8 a 20
    const dataRange = `'Dashboard Forecast'!${startCol}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });
    const rows = dataResponse.data.values || [];

    // Nombres de meses historicos (indices 1, 2, 3 del header)
    const historicalHeaders = headerRow.slice(IDX_HISTORICO_START, IDX_HISTORICO_END + 1);
    const mesActualRealLabel = headerRow[IDX_MES_REAL] || 'Mar real';
    const mesActualForecastLabel = headerRow[IDX_MES_FORECAST] || 'Mar forecast';
    const mesActual = mesActualRealLabel.replace(/ real$/i, '').trim();

    const metrics = rows.map((row: any[]) => {
      const historical: { [key: string]: number } = {};
      historicalHeaders.forEach((header: string, idx: number) => {
        historical[header] = parseFloat(row[IDX_HISTORICO_START + idx]) || 0;
      });

      return {
        metric: row[IDX_METRICA] || '',
        historical,
        mesActualReal: parseFloat(row[IDX_MES_REAL]) || 0,
        mesActualForecast: parseFloat(row[IDX_MES_FORECAST]) || 0,
        promHist: parseFloat(row[IDX_PROM_HIST]) || 0,
        forecastIA: parseFloat(row[IDX_FORECAST_IA]) || 0,
      };
    });

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
