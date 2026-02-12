import { NextResponse } from "next/server";
import {
  getFebreroData,
  parseFebrero,
  buildMetricasFebrero,
} from "@/lib/googleSheets";

export async function GET() {
  try {
    const rows = await getFebreroData();
    const resumen = parseFebrero(rows as string[][]);
    const metricas = buildMetricasFebrero(resumen);

    return NextResponse.json({
      ok: true,
      metricas,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }
}
