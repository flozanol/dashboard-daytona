import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// BLOCK_SIZE = 12 columnas por agencia (se agregó Julio)
// Columnas base calculadas: primera agencia en col D (4), cada bloque ocupa 12 cols.
// Total Grupo:      D  = col 4   → termina en O  (col 15)
// Acura Interlomas: P  = col 16  → termina en AA (col 27)
// GWM Morelos:      AB = col 28  → termina en AM (col 39)
// GWM Iztapalapa:   AN = col 40  → termina en AY (col 51)
// Honda Cuajimalpa: AZ = col 52  → termina en BK (col 63)
// Honda Interlomas: BL = col 64  → termina en BW (col 75)
// KIA Interlomas:   BX = col 76  → termina en CI (col 87)
// KIA Iztapalapa:   CJ = col 88  → termina en CU (col 99)
// MG Cuajimalpa:    CV = col 100 → termina en DG (col 111)
// MG Interlomas:    DH = col 112 → termina en DS (col 123)
// MG Iztapalapa:    DT = col 124 → termina en EE (col 135)
// MG Santa Fe:      EF = col 136 → termina en EQ (col 147)
const AGENCIES = [
  { name: 'Total Grupo',      col: 'D'  },
  { name: 'Acura Interlomas', col: 'P'  },
  { name: 'GWM Morelos',      col: 'AB' },
  { name: 'GWM Iztapalapa',   col: 'AN' },
  { name: 'Honda Cuajimalpa', col: 'AZ' },
  { name: 'Honda Interlomas', col: 'BL' },
  { name: 'KIA Interlomas',   col: 'BX' },
  { name: 'KIA Iztapalapa',   col: 'CJ' },
  { name: 'MG Cuajimalpa',    col: 'CV' },
  { name: 'MG Interlomas',    col: 'DH' },
  { name: 'MG Iztapalapa',    col: 'DT' },
  { name: 'MG Santa Fe',      col: 'EF' },
];

// Estructura del Sheet: 12 columnas por agencia
// col+0:  Metrica
// col+1:  Dic  (historico 1)
// col+2:  Ene  (historico 2)
// col+3:  Feb  (historico 3)
// col+4:  Mar  (historico 4)
// col+5:  Abr  (historico 5)
// col+6:  Mayo (historico 6)
// col+7:  Junio (historico 7)
// col+8:  Julio real  (mes actual real)
// col+9:  Julio forecast (mes actual forecast)
// col+10: Promedio hist mensual
// col+11: Forecast IA
const BLOCK_SIZE = 12;
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

const IDX_METRICA = 0;
const IDX_HISTORICO_START = 1;
const IDX_HISTORICO_END = 7;
const IDX_MES_REAL = 8;
const IDX_MES_FORECAST = 9;
const IDX_PROM_HIST = 10;
const IDX_FORECAST_IA = 11;

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

    // Leer headers fila 7
    const headerRange = `'Dashboard Forecast'!${startCol}${HEADER_ROW}:${endCol}${HEADER_ROW}`;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: headerRange,
    });
    const headerRow = (headerResponse.data.values?.[0] || []) as string[];

    // Leer datos filas 8-20
    const dataRange = `'Dashboard Forecast'!${startCol}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`;
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: dataRange,
    });
    const rows = dataResponse.data.values || [];

    const historicalHeaders = headerRow.slice(IDX_HISTORICO_START, IDX_HISTORICO_END + 1);

    const mesActualRealLabel = headerRow[IDX_MES_REAL] || 'Julio real';
    const mesActualForecastLabel = headerRow[IDX_MES_FORECAST] || 'Julio forecast';
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
