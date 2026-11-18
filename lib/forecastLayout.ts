// Detecta la estructura de "Dashboard Forecast" a partir de los encabezados de
// la fila 7, para no tener que editar columnas cada vez que se agrega un mes.
//
// Cada bloque de agencia se ve así:
//   Métrica | Dic | Ene | ... | <mes actual> | forecast | Promedio hist. mensual | Forecast IA

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

export function colToNumber(col: string): number {
  let result = 0;
  for (let i = 0; i < col.length; i++) result = result * 26 + (col.charCodeAt(i) - 64);
  return result;
}

export function numberToCol(num: number): string {
  let result = '';
  while (num > 0) {
    const remainder = (num - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

export type BlockRange = {
  startIdx: number; // índice (base 0) dentro de la fila leída desde la columna A
  endIdx: number;   // índice exclusivo
};

/** Posiciones de cada bloque: arrancan en cada celda "Métrica" de la fila de encabezados. */
export function findBlocks(headerRowFromA: string[]): BlockRange[] {
  const starts: number[] = [];
  headerRowFromA.forEach((cell, i) => {
    if (norm(cell) === 'métrica' || norm(cell) === 'metrica') starts.push(i);
  });
  return starts.map((startIdx, k) => ({
    startIdx,
    endIdx: k + 1 < starts.length ? starts[k + 1] : headerRowFromA.length,
  }));
}

export type BlockLayout = {
  idxMetrica: number;
  idxHistoricoStart: number;
  idxHistoricoEnd: number; // último mes con dato real = mes actual
  idxMesForecast: number;
  idxPromHist: number;
  idxForecastIA: number;
  mesActual: string;       // p. ej. "Nov"
};

/** Estructura interna de un bloque, a partir de sus encabezados (empezando en "Métrica"). */
export function parseBlockLayout(blockHeader: string[]): BlockLayout {
  const idxMesForecast = blockHeader.findIndex((c) => norm(c) === 'forecast');
  if (idxMesForecast < 3) {
    throw new Error('No se encontró la columna "forecast" en el bloque de encabezados');
  }
  const idxHistoricoEnd = idxMesForecast - 1;
  return {
    idxMetrica: 0,
    idxHistoricoStart: 1,
    idxHistoricoEnd,
    idxMesForecast,
    idxPromHist: idxMesForecast + 1,
    idxForecastIA: idxMesForecast + 2,
    mesActual: String(blockHeader[idxHistoricoEnd] ?? '').trim(),
  };
}
