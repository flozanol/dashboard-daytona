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

function addToColumn(col: string, offset: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let value = 0;
  
  // Convertir columna a número (A=0, B=1, ..., Z=25, AA=26, etc)
  for (let i = 0; i < col.length; i++) {
    value = value * 26 + (col.charCodeAt(i) - 64);
  }
  
  // Agregar offset
  value += offset;
  
  // Convertir de vuelta a letras
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  
  return result;
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

    // Calcular columna final (6 columnas después de la inicial)
    // Columna inicial + 6 = 7 columnas totales (Métrica, Dic, Ene, Feb real, Run-rate, Hist avg, Forecast IA)
    const endCol = addToColumn(agency.col, 6);
    const range = `'Dashboard Forecast'!${agency.col}7:${endCol}20`;
    
    console.log(`Reading range for ${agency.name}: ${range}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    
    console.log(`Rows retrieved for ${agency.name}:`, rows.length);
    
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
