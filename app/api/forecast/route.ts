import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const AGENCIES = [
  { name: 'Total Grupo', col: 'D' },
  { name: 'Acura Interlomas', col: 'K' },
  { name: 'GWM Morelos', col: 'R' },
  { name: 'GWM Iztapalapa', col: 'Y' },
  { name: 'Honda Cuajimalpa', col: 'AF' },
  { name: 'Honda Interlomas', col: 'AM' },
  { name: 'KIA Interlomas', col: 'AT' },
  { name: 'KIA Iztapalapa', col: 'BA' },
  { name: 'MG Cuajimalpa', col: 'BH' },
  { name: 'MG Interlomas', col: 'BO' },
  { name: 'MG Iztapalapa', col: 'BV' },
  { name: 'MG Santa Fe', col: 'CC' },
];

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

    // Leer nombres de agencias
    const agenciesResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Dashboard Forecast'!D1:CC1",
    });

    // Leer datos de la agencia seleccionada
    const endCol = String.fromCharCode(agency.col.charCodeAt(agency.col.length - 1) + 6);
    const range = `'Dashboard Forecast'!${agency.col}7:${endCol}20`;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    const metrics = rows.slice(1).map((row: any[]) => ({
      metric: row[0] || '',
      dec: parseFloat(row[1]) || 0,
      jan: parseFloat(row[2]) || 0,
      febReal: parseFloat(row[3]) || 0,
      febRunRate: parseFloat(row[4]) || 0,
      histAvg: parseFloat(row[5]) || 0,
      febForecastIA: parseFloat(row[6]) || 0,
    }));

    return NextResponse.json({
      success: true,
      month: 'Febrero 2026',
      agency: agency.name,
      agencies: AGENCIES.map(a => a.name),
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
