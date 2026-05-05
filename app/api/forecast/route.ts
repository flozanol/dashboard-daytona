import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const AGENCIES = [
  { name: 'Total Grupo', col: 'D' },      // 4
  { name: 'Acura Interlomas', col: 'N' }, // 14
  { name: 'GWM Morelos', col: 'X' },      // 24
  { name: 'GWM Iztapalapa', col: 'AH' },  // 34
  { name: 'Honda Cuajimalpa', col: 'AR' },// 44
  { name: 'Honda Interlomas', col: 'BB' },// 54
  { name: 'KIA Interlomas', col: 'BL' },  // 64
  { name: 'KIA Iztapalapa', col: 'BV' },  // 74
  { name: 'MG Cuajimalpa', col: 'CF' },   // 84
  { name: 'MG Interlomas', col: 'CP' },   // 94
  { name: 'MG Iztapalapa', col: 'CZ' },   // 104
  { name: 'MG Santa Fe', col: 'DJ' },     // 114
];

// Estructura actualizada del Sheet: 9 columnas por agencia
// col+0: Metrica
// col+1: Dic (historico 1)
// col+2: Ene (historico 2)
// col+3: Feb (historico 3)
// col+4: Mar (historico 4)
// col+5: Abr (historico 5)
// col+6: Mayo real (mes actual real)
// col+7: Mayo forecast (mes actual forecast)
// col+8: Promedio hist mensual
// col+9: Forecast IA
const BLOCK_SIZE = 10; // Antes era 8 o 9
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

// Indices dentro del bloque de cada agencia
const IDX_METRICA = 0;
const IDX_HISTORICO_START = 1;
const IDX_HISTORICO_END = 5; // Ahora incluye Dic, Ene, Feb, Mar, Abr
const IDX_MES_REAL = 6;      // Mayo real
const IDX_MES_FORECAST = 7;  // Mayo forecast
const IDX_PROM_HIST = 8;     // Promedio hist mensual
const IDX_FORECAST_IA = 9;   // Forecast IA

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

    // Nombres de meses historicos (indices 1, 2, 3, 4 del header)
    const historicalHeaders = headerRow.slice(IDX_HISTORICO_START, IDX_HISTORICO_END + 1);
    
    // También ajusté aquí un poco los "fallbacks" por si acaso la celda viene vacía,
    // que use "Mayo real" en lugar de "Abr real" por defecto.
    const mesActualRealLabel = headerRow[IDX_MES_REAL] || 'Mayo real';
    const mesActualForecastLabel = headerRow[IDX_MES_FORECAST] || 'Mayo forecast';
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
