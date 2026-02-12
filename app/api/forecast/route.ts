import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "'Dashboard Forecast'!D7:J20",
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
