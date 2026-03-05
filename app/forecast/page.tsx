'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Car } from 'lucide-react';
import Image from 'next/image';

type MetricData = {
  metric: string;
  historical: { [key: string]: number };
  mesActualReal: number;
  mesActualForecast: number;
  promHist: number;
  forecastIA: number;
};

type Headers = {
  historical: string[];
  mesActual: string;
  mesActualRealLabel: string;
  mesActualForecastLabel: string;
};

function KpiCard({ title, value, real, icon, color, mes }: any) {
  const colors: any = { red: 'bg-red-500', dark: 'bg-gray-800' };
  const borders: any = { red: 'border-red-500', dark: 'border-gray-800' };
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${borders[color]} hover:shadow-xl transition-shadow`}>
      <div className={`${colors[color]} text-white p-3 rounded-lg w-fit mb-4 shadow-md`}>{icon}</div>
      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-4xl font-bold text-gray-900 mb-2" suppressHydrationWarning>{Math.round(value)}</p>
      <p className="text-xs text-gray-400" suppressHydrationWarning>Real {mes}: {Math.round(real)}</p>
    </div>
  );
}

export default function ForecastDashboard() {
  const [data, setData] = useState<MetricData[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [headers, setHeaders] = useState<Headers>({ historical: [], mesActual: '', mesActualRealLabel: '', mesActualForecastLabel: '' });
  const [selectedAgency, setSelectedAgency] = useState('Total Grupo');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted) { fetchData(selectedAgency); }
  }, [selectedAgency, mounted]);

  const fetchData = (agency: string) => {
    setLoading(true);
    fetch(`/api/forecast?agency=${encodeURIComponent(agency)}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
          setAgencies(result.agencies || []);
          setHeaders(result.headers);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Cargando datos...</p>
        </div>
      </div>
    );
  }

  const ventasNuevos = data.find(m => m.metric === 'Ventas Nuevos');
  const ventasSemi = data.find(m => m.metric === 'Ventas Seminuevos');
  const visitas = data.find(m => m.metric === 'Total visitas a piso');
  const leads = data.find(m => m.metric === 'Leads');
  const mesActualLabel = headers.mesActual || 'Mes actual';

  const ventasChartData = [
    ...(headers.historical || []).map(mes => ({
      mes,
      nuevos: ventasNuevos?.historical[mes] || 0,
      seminuevos: ventasSemi?.historical[mes] || 0,
    })),
    { mes: headers.mesActualRealLabel || 'Real', nuevos: ventasNuevos?.mesActualReal || 0, seminuevos: ventasSemi?.mesActualReal || 0 },
    { mes: `${mesActualLabel} Forecast`, nuevos: ventasNuevos?.forecastIA || 0, seminuevos: ventasSemi?.forecastIA || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gradient-to-r from-black via-gray-900 to-black text-white py-6 px-6 shadow-2xl border-b-4 border-red-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Image src="/logo.png" alt="Grupo Daytona" width={180} height={60} className="object-contain" priority />
            <div className="border-l-2 border-red-500 pl-6">
              <h1 className="text-3xl font-bold tracking-wide">Dashboard de Forecast</h1>
              <p className="text-lg text-gray-300 capitalize">{mesActualLabel} 2026</p>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm text-gray-400">Actualizado al dia de hoy</p>
            <p className="text-xs text-gray-500 mt-1">2026 Grupo Daytona. Todos los derechos reservados.</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">

        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-l-4 border-red-500">
          abel htmlFor="agency-select" className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Seleccionar Agencia</label>
          <select id="agency-select" value={selectedAgency} onChange={(e) => setSelectedAgency(e.target.value)} className="w-full md:w-96 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-lg font-semibold bg-white hover:border-red-400 transition-colors">
            {agencies.map((agency) => (<option key={agency} value={agency}>{agency}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard title="Ventas Nuevos" value={ventasNuevos?.forecastIA || 0} real={ventasNuevos?.mesActualReal || 0} icon={<Car className="w-7 h-7" />} color="red" mes={mesActualLabel} />
          <KpiCard title="Ventas Seminuevos" value={ventasSemi?.forecastIA || 0} real={ventasSemi?.mesActualReal || 0} icon={<Car className="w-7 h-7" />} color="dark" mes={mesActualLabel} />
          <KpiCard title="Visitas a Piso" value={visitas?.forecastIA || 0} real={visitas?.mesActualReal || 0} icon={<Users className="w-7 h-7" />} color="red" mes={mesActualLabel} />
          <KpiCard title="Leads" value={leads?.forecastIA || 0} real={leads?.mesActualReal || 0} icon={<TrendingUp className="w-7 h-7" />} color="dark" mes={mesActualLabel} />
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border-t-4 border-red-500">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
            <div className="w-1 h-8 bg-red-500 rounded"></div>
            Tendencia de Ventas — {selectedAgency}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ventasChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" stroke="#6b7280" tick={{ fontSize: 13 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 13 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #e63946', borderRadius: '8px', color: '#fff' }} />
              <Legend />
              <Bar dataKey="nuevos" fill="#e63946" name="Nuevos" radius={[6, 6, 0, 0]} />
              <Bar dataKey="seminuevos" fill="#374151" name="Seminuevos" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-red-500">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
            <div className="w-1 h-8 bg-red-500 rounded"></div>
            Todas las Metricas — {selectedAgency}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left py-4 px-4 font-bold uppercase tracking-wide">Metrica</th>
                  {(headers.historical || []).map(mes => (<th key={mes} className="text-right py-4 px-4 font-bold uppercase tracking-wide">{mes}</th>))}
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide">{headers.mesActualRealLabel || 'Real'}</th>
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide bg-red-500">Forecast IA</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(row => row.metric).map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-100 hover:bg-red-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="py-3 px-4 font-semibold text-gray-900">{row.metric}</td>
                    {(headers.historical || []).map(mes => (<td key={mes} className="py-3 px-4 text-right text-gray-600" suppressHydrationWarning>{(row.historical[mes] || 0).toFixed(0)}</td>))}
                    <td className="py-3 px-4 text-right text-gray-600" suppressHydrationWarning>{row.mesActualReal.toFixed(0)}</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 text-base" suppressHydrationWarning>{row.forecastIA.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-400 text-xs">
          2026 Grupo Daytona. Todos los derechos reservados. Dashboard de Forecast
        </div>
      </div>
    </div>
  );
}
