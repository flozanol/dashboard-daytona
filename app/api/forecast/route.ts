import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { findBlocks, parseBlockLayout, numberToCol } from '@/lib/forecastLayout';

// El orden debe ser el mismo en que aparecen los bloques en "Dashboard Forecast".
// Las columnas ya NO se escriben a mano: se detectan por los encabezados de la fila 7.
const AGENCIES = [
  'Total Grupo',
  'Acura Interlomas',
  'Honda Cuajimalpa',
  'Honda Interlomas',
  'KIA Interlomas',
  'KIA Iztapalapa',
  'MG Cuajimalpa',
  'MG Interlomas',
  'MG Iztapalapa',
  'MG Santa Fe',
];

const SHEET = 'Dashboard Forecast';
const HEADER_ROW = 7;
const DATA_START_ROW = 8;
const DATA_END_ROW = 20;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyParam = searchParams.get('agency') || 'Total Grupo';

    const agencyIndex = AGENCIES.indexOf(agencyParam);
    if (agencyIndex === -1) {
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

    // 1) Fila de encabezados completa (desde la columna A) para ubicar los bloques.
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET}'!A${HEADER_ROW}:ZZ${HEADER_ROW}`,
    });
    const fullHeader = (headerResponse.data.values?.[0] || []) as string[];

    const blocks = findBlocks(fullHeader);
    const block = blocks[agencyIndex];
    if (!block) {
      throw new Error(
        `Se esperaban ${AGENCIES.length} bloques de agencia y se encontraron ${blocks.length} en la fila ${HEADER_ROW}`
      );
    }

    const headerRow = fullHeader.slice(block.startIdx, block.endIdx);
    const layout = parseBlockLayout(headerRow);

    // 2) Datos del bloque de la agencia.
    const startCol = numberToCol(block.startIdx + 1);
    const endCol = numberToCol(block.startIdx + headerRow.length);
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET}'!${startCol}${DATA_START_ROW}:${endCol}${DATA_END_ROW}`,
    });
    const rows = dataResponse.data.values || [];

    const historicalHeaders = headerRow.slice(layout.idxHistoricoStart, layout.idxHistoricoEnd + 1);
    const mesActualForecastLabel = headerRow[layout.idxMesForecast] || 'forecast';
    const mesActual = layout.mesActual;

    const metrics = rows.map((row: any[]) => {
      const historical: { [key: string]: number } = {};
      historicalHeaders.forEach((header: string, idx: number) => {
        historical[header] = parseFloat(row[layout.idxHistoricoStart + idx]) || 0;
      });

      return {
        metric: row[layout.idxMetrica] || '',
        historical,
        mesActualReal: parseFloat(row[layout.idxHistoricoEnd]) || 0,
        mesActualForecast: parseFloat(row[layout.idxMesForecast]) || 0,
        promHist: parseFloat(row[layout.idxPromHist]) || 0,
        forecastIA: parseFloat(row[layout.idxForecastIA]) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      agency: agencyParam,
      agencies: AGENCIES,
      headers: {
        historical: historicalHeaders,
        mesActual,
        mesActualRealLabel: `${mesActual} real`,
        mesActualForecastLabel,
      },
      data: metrics,
    });
  } catch (error: any) {
    console.error('Error reading forecast data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
