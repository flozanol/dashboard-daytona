import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

// ---------- AUTENTICACIÓN ----------

function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("Faltan variables de entorno de Google Sheets");
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });
}

// ---------- LECTURA DE FEBRERO ----------

export async function getFebreroData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Falta GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  // Nombre exacto de tu pestaña de consolidado de febrero
  const range = "Res Feb 26!A1:Z200";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  const rows = res.data.values || [];
  return rows;
}

// ---------- LECTURA DE DICIEMBRE Y ENERO ----------

export async function getDiciembreData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Falta GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const range = "Res Dic!A1:Z200";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values || [];
}

export async function getEneroData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Falta GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const range = "Res Ene26!A1:Z200";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values || [];
}

// ---------- TIPOS / PARSER BÁSICO ----------

export type AgenciaKey =
  | "Acura"
  | "GWM Cuernavaca"
  | "GWM Iztapalapa"
  | "Honda Cuajimalpa"
  | "Honda Interlomas"
  | "KIA Interlomas"
  | "KIA Iztapalapa"
  | "MG Cuajimalpa"
  | "MG Interlomas"
  | "MG Iztapalapa"
  | "MG Santa Fe";

export type MetricasAgencia = {
  visitas: number;
  pruebas: number;
  solicitudes: number;
  avaluos: number;
  ventasTotales: number;
};

export type FebreroResumen = {
  agencias: Record<AgenciaKey, MetricasAgencia>;
  totalGrupo: MetricasAgencia;
};

function toNumber(value: string | undefined): number {
  if (!value) return 0;
  const clean = value.replace("%", "").replace(",", ".");
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

export function parseFebrero(rows: string[][]): FebreroResumen {
  // La fila 3 (índice 2) es la cabecera con nombres de agencias
  const header = rows[2];
  const agenciaNames = header.slice(2, 13) as AgenciaKey[];

  const baseMetric: MetricasAgencia = {
    visitas: 0,
    pruebas: 0,
    solicitudes: 0,
    avaluos: 0,
    ventasTotales: 0,
  };

  const agencias: Record<AgenciaKey, MetricasAgencia> = {} as any;
  agenciaNames.forEach((name) => {
    agencias[name] = { ...baseMetric };
  });

  const totalGrupo: MetricasAgencia = { ...baseMetric };

  for (const row of rows) {
    const seccion = row[0];
    const categoria = row[1];

    if (!seccion || !categoria) continue;

    agenciaNames.forEach((agencia, index) => {
      const colIndex = 2 + index;
      const cell = row[colIndex];
      const valor = toNumber(cell);

      if (seccion === "VISITAS A PISO" && categoria === "TOTAL VISITAS A PISO") {
        agencias[agencia].visitas += valor;
        totalGrupo.visitas += valor;
      }

      if (seccion === "PRUEBAS DE MANEJO" && categoria === "TOTAL PRUEBAS") {
        agencias[agencia].pruebas += valor;
        totalGrupo.pruebas += valor;
      }

      if (seccion === "FINANCIERA" && categoria === "Solicitudes Financiera de Marca") {
        agencias[agencia].solicitudes += valor;
        totalGrupo.solicitudes += valor;
      }

      if (seccion === "AVALÚOS" && categoria === "Avalúos") {
        agencias[agencia].avaluos += valor;
        totalGrupo.avaluos += valor;
      }

      if (seccion === "RESULTADOS" && categoria === "VENTAS TOTALES") {
        agencias[agencia].ventasTotales += valor;
        totalGrupo.ventasTotales += valor;
      }
    });
  }

  return { agencias, totalGrupo };
}

// ---------- CONVERSIONES BÁSICAS PARA EL DASHBOARD ----------

export type ConversionesAgencia = {
  agencia: AgenciaKey;
  visitas: number;
  pruebas: number;
  solicitudes: number;
  avaluos: number;
  ventas: number;
  convPruebasSobreVisitas: number;
  convSolicitudesSobrePruebas: number;
  convAvaluosSobreSolicitudes: number;
  convVentasSobreAvaluos: number;
  convVentasSobreVisitas: number;
};

export type FebreroConMetricas = {
  agencias: ConversionesAgencia[];
  totalGrupo: ConversionesAgencia;
};

export function buildMetricasFebrero(resumen: FebreroResumen): FebreroConMetricas {
  const agenciasArray: ConversionesAgencia[] = [];

  const calcConv = (num: number, den: number) =>
    den === 0 ? 0 : (num / den) * 100;

  for (const agencia in resumen.agencias) {
    const aKey = agencia as AgenciaKey;
    const m = resumen.agencias[aKey];

    agenciasArray.push({
      agencia: aKey,
      visitas: m.visitas,
      pruebas: m.pruebas,
      solicitudes: m.solicitudes,
      avaluos: m.avaluos,
      ventas: m.ventasTotales,
      convPruebasSobreVisitas: calcConv(m.pruebas, m.visitas),
      convSolicitudesSobrePruebas: calcConv(m.solicitudes, m.pruebas),
      convAvaluosSobreSolicitudes: calcConv(m.avaluos, m.solicitudes),
      convVentasSobreAvaluos: calcConv(m.ventasTotales, m.avaluos),
      convVentasSobreVisitas: calcConv(m.ventasTotales, m.visitas),
    });
  }

  const g = resumen.totalGrupo;

  const totalGrupo: ConversionesAgencia = {
    agencia: "Acura", // no lo usamos como nombre real, luego mostramos "Grupo Daytona"
    visitas: g.visitas,
    pruebas: g.pruebas,
    solicitudes: g.solicitudes,
    avaluos: g.avaluos,
    ventas: g.ventasTotales,
    convPruebasSobreVisitas: calcConv(g.pruebas, g.visitas),
    convSolicitudesSobrePruebas: calcConv(g.solicitudes, g.pruebas),
    convAvaluosSobreSolicitudes: calcConv(g.avaluos, g.solicitudes),
    convVentasSobreAvaluos: calcConv(g.ventasTotales, g.avaluos),
    convVentasSobreVisitas: calcConv(g.ventasTotales, g.visitas),
  };

  return { agencias: agenciasArray, totalGrupo };
}
