import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const AGENCIES = [
  { name: 'Total Grupo',      col: 'D'  },
  { name: 'Acura Interlomas', col: 'R'  },
  { name: 'Honda Cuajimalpa', col: 'AF' },
  { name: 'Honda Interlomas', col: 'AT' },
  { name: 'KIA Interlomas',   col: 'BH' },
  { name: 'KIA Iztapalapa',   col: 'BV' },
  { name: 'MG Cuajimalpa',    col: 'CJ' },
  { name: 'MG Interlomas',    col: 'CX' },
  { name: 'MG Iztapalapa',    col: 'DL' },
  { name: 'MG Santa Fe',      col: 'DZ' },
];

// Septiembre agregó una columna más a cada bloque de agencia (de 13 a 14
// columnas), por lo que todos los bloques se recorrieron a la derecha.
const BLOCK_SIZE = 14;
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

const IDX_METRICA = 0;
const IDX_HISTORICO_START = 1;
const IDX_HISTORICO_END = 10;
const IDX_MES_FORECAST = 11;
const IDX_PROM_HIST = 12;
const IDX_FORECAST_IA = 13;

function colToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) result = result * 26 + (col.charCodeAt(i) - 64);
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
      return NextResponse.json({ success: false, error: 'Agencia no encontrada' }, { status: 404 });
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

    const startCol = agency.col;
    const endCol = addToColumn(startCol, BLOCK_SIZE - 1);

    const headerRange = `'Dashboard Forecast'!${startCol}${HEADER_ROW}:${endCol}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: headerRange });
    const headerRow = (headerResponse.data.values?.[0] || []) as string[];

    const dataRange = `'Dashboard Forecast'!${startCol}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const dataResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: dataRange });
    const rows = dataResponse.data.values || [];

    const historicalHeaders = headerRow.slice(IDX_HISTORICO_START, IDX_HISTORICO_END + 1);
    const mesActualForecastLabel = headerRow[IDX_MES_FORECAST] || 'forecast';
    const mesActual = 'Sep';

    const metrics = rows.map((row: any[]) => {
      const historical: { [key: string]: number } = {};
      historicalHeaders.forEach((header: string, idx: number) => {
        historical[header] = parseFloat(row[IDX_HISTORICO_START + idx]) || 0;
      });

      return {
        metric: row[IDX_METRICA] || '',
        historical,
        mesActualReal: parseFloat(row[IDX_HISTORICO_END]) || 0,
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
        mesActualRealLabel: 'Sep real',
        mesActualForecastLabel,
      },
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error reading forecast data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
