import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// BLOCK_SIZE = 13 columnas por agencia
// Headers fila 7: Metrica, Dic, Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Forecast, Promedio hist. mensual, Forecast IA
// Estructura: col+0=Metrica, col+1-9=Historico (Dic-Ago), col+10=Ago Forecast, col+11=Promedio hist, col+12=Forecast IA

// Columnas base calculadas (cada bloque ocupa 13 cols):
// Total Grupo:      D  = col 4   -> termina en P  (col 16)
// Acura Interlomas: Q  = col 17  -> termina en AC (col 29)
// Honda Cuajimalpa: AD = col 30  -> termina en AP (col 42)
// Honda Interlomas: AQ = col 43  -> termina en BC (col 55)
// KIA Interlomas:   BD = col 56  -> termina en BP (col 68)
// KIA Iztapalapa:   BQ = col 69  -> termina en CB (col 81)
// MG Cuajimalpa:    CC = col 82  -> termina en CO (col 94)
// MG Interlomas:    CP = col 95  -> termina en DB (col 107)
// MG Iztapalapa:    DC = col 108 -> termina en DO (col 120)
// MG Santa Fe:      DP = col 121 -> termina en EB (col 133)
const AGENCIES = [
  { name: 'Total Grupo',      col: 'D'  },
  { name: 'Acura Interlomas', col: 'Q'  },
  { name: 'Honda Cuajimalpa', col: 'AD' },
  { name: 'Honda Interlomas', col: 'AQ' },
  { name: 'KIA Interlomas',   col: 'BD' },
  { name: 'KIA Iztapalapa',   col: 'BQ' },
  { name: 'MG Cuajimalpa',    col: 'CC' },
  { name: 'MG Interlomas',    col: 'CP' },
  { name: 'MG Iztapalapa',    col: 'DC' },
  { name: 'MG Santa Fe',      col: 'DP' },
];

// Estructura del Sheet: 13 columnas por agencia
// col+0:  Metrica
// col+1:  Dic  (historico 1)
// col+2:  Ene  (historico 2)
// col+3:  Feb  (historico 3)
// col+4:  Mar  (historico 4)
// col+5:  Abr  (historico 5)
// col+6:  May  (historico 6)
// col+7:  Jun  (historico 7)
// col+8:  Jul  (historico 8)
// col+9:  Ago  (historico 9)
// col+10: Ago forecast (mes actual forecast)
// col+11: Promedio hist mensual
// col+12: Forecast IA
const BLOCK_SIZE = 13;
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

const IDX_METRICA = 0;
const IDX_HISTORICO_START = 1;
const IDX_HISTORICO_END = 9;
const IDX_MES_FORECAST = 10;
const IDX_PROM_HIST = 11;
const IDX_FORECAST_IA = 12;

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

    const startCol = agency.col;
    const endCol = addToColumn(startCol, BLOCK_SIZE - 1);

    const headerRange = `'Dashboard Forecast'!${startCol}${HEADER_ROW}:${endCol}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const headerRow = (headerResponse.data.values?.[0] || []) as string[];

    const dataRange = `'Dashboard Forecast'!${startCol}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });
    const rows = dataResponse.data.values || [];

    const historicalHeaders = headerRow.slice(IDX_HISTORICO_START, IDX_HISTORICO_END + 1);

    const mesActualForecastLabel = headerRow[IDX_MES_FORECAST] || 'Ago forecast';
    const mesActual = mesActualForecastLabel.replace(/ forecast$/i, '').trim();

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
        mesActualRealLabel: mesActual + ' real',
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
