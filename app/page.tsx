import React from "react";

type AgenciaMetricas = {
  agencia: string;
  visitas: number;
  pruebas: number;
  solicitudes: number;
  avaluos: number;
  ventas: number;
  convPruebasSobreVisitas: number;
  convVentasSobreVisitas: number;
  convVentasSobreAvaluos: number;
};

type TotalGrupoMetricas = {
  visitas: number;
  pruebas: number;
  solicitudes: number;
  avaluos: number;
  ventas: number;
  convPruebasSobreVisitas: number;
  convVentasSobreVisitas: number;
  convVentasSobreAvaluos: number;
};

type ApiResponse = {
  ok: boolean;
  metricas: {
    agencias: AgenciaMetricas[];
    totalGrupo: TotalGrupoMetricas;
  };
};

async function getData(): Promise<ApiResponse> {
  const res = await fetch("http://localhost:3000/api/febrero", {
    cache: "no-store",
  });
  return res.json();
}

export default async function Home() {
  const data = await getData();

  if (!data.ok) {
    return <main className="p-8">Error cargando datos</main>;
  }

  const { agencias, totalGrupo } = data.metricas;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Dashboard Febrero - Grupo Daytona
      </h1>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Total Grupo</h2>
        <div className="space-y-1">
          <p>Visitas: {totalGrupo.visitas}</p>
          <p>Pruebas: {totalGrupo.pruebas}</p>
          <p>Ventas: {totalGrupo.ventas}</p>
          <p>
            Conv. Pruebas / Visitas:{" "}
            {totalGrupo.convPruebasSobreVisitas.toFixed(1)}%
          </p>
          <p>
            Conv. Ventas / Visitas:{" "}
            {totalGrupo.convVentasSobreVisitas.toFixed(1)}%
          </p>
          <p>
            Conv. Ventas / Avalúos:{" "}
            {totalGrupo.convVentasSobreAvaluos.toFixed(1)}%
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Agencias - Conversión del embudo
        </h2>
        <table className="min-w-full border text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-left">Agencia</th>
              <th className="border px-2 py-1">Visitas</th>
              <th className="border px-2 py-1">Pruebas</th>
              <th className="border px-2 py-1">Solicitudes</th>
              <th className="border px-2 py-1">Avalúos</th>
              <th className="border px-2 py-1">Ventas</th>
              <th className="border px-2 py-1">Pruebas / Visitas</th>
              <th className="border px-2 py-1">Ventas / Visitas</th>
              <th className="border px-2 py-1">Ventas / Avalúos</th>
            </tr>
          </thead>
          <tbody>
            {agencias.map((a) => (
              <tr key={a.agencia}>
                <td className="border px-2 py-1 text-left">{a.agencia}</td>
                <td className="border px-2 py-1 text-center">{a.visitas}</td>
                <td className="border px-2 py-1 text-center">{a.pruebas}</td>
                <td className="border px-2 py-1 text-center">
                  {a.solicitudes}
                </td>
                <td className="border px-2 py-1 text-center">{a.avaluos}</td>
                <td className="border px-2 py-1 text-center">{a.ventas}</td>
                <td className="border px-2 py-1 text-center">
                  {a.convPruebasSobreVisitas.toFixed(1)}%
                </td>
                <td className="border px-2 py-1 text-center">
                  {a.convVentasSobreVisitas.toFixed(1)}%
                </td>
                <td className="border px-2 py-1 text-center">
                  {a.convVentasSobreAvaluos.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
