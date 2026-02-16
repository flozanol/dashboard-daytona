'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Car } from 'lucide-react';
import Image from 'next/image';

type MetricData = {
  metric: string;
  dec: number;
  jan: number;
  febReal: number;
  febRunRate: number;
  histAvg: number;
  febForecastIA: number;
};

export default function ForecastDashboard() {
  const [data, setData] = useState<MetricData[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState('Total Grupo');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchData(selectedAgency);
  }, [selectedAgency]);

  const fetchData = (agency: string) => {
    setLoading(true);
    fetch(`/api/forecast?agency=${encodeURIComponent(agency)}`)
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setData(result.data);
          setAgencies(result.agencies || []);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl text-gray-600">Cargando datos...</div>
      </div>
    );
  }

  const ventasNuevos = data.find(m => m.metric === 'Ventas Nuevos');
  const ventasSemi = data.find(m => m.metric === 'Ventas Seminuevos');
  const visitas = data.find(m => m.metric === 'Total visitas a piso');
  const leads = data.find(m => m.metric === 'Leads');

  const ventasChartData = [
    { mes: 'Dic', nuevos: ventasNuevos?.dec || 0, seminuevos: ventasSemi?.dec || 0 },
    { mes: 'Ene', nuevos: ventasNuevos?.jan || 0, seminuevos: ventasSemi?.jan || 0 },
    { mes: 'Feb Real', nuevos: ventasNuevos?.febReal || 0, seminuevos: ventasSemi?.febReal || 0 },
    { mes: 'Feb Forecast', nuevos: ventasNuevos?.febForecastIA || 0, seminuevos: ventasSemi?.febForecastIA || 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-black via-gray-900 to-black text-white py-6 px-6 shadow-2xl border-b-4 border-red-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Image 
              src="/logo.png" 
              alt="Grupo Daytona Logo" 
              width={180} 
              height={60}
              className="object-contain"
              priority
            />
            <div className="border-l-2 border-red-500 pl-6">
              <h1 className="text-3xl font-bold">Dashboard de Forecast</h1>
              <p className="text-lg text-gray-300">Febrero 2026</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-4">
          <p className="text-xs text-gray-400">© 2026 Grupo Daytona. Todos los derechos reservados.</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Selector de Agencia */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-red-500">
          <label htmlFor="agency-select" className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">
            Seleccionar Agencia
          </label>
          <select
            id="agency-select"
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="w-full md:w-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-lg font-medium bg-white hover:border-red-400 transition-colors"
          >
            {agencies.map((agency) => (
              <option key={agency} value={agency}>
                {agency}
              </option>
            ))}
          </select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Ventas Nuevos"
            value={ventasNuevos?.febForecastIA || 0}
            icon={<Car className="w-8 h-8" />}
            color="red"
          />
          <KpiCard
            title="Ventas Seminuevos"
            value={ventasSemi?.febForecastIA || 0}
            icon={<Car className="w-8 h-8" />}
            color="gray"
          />
          <KpiCard
            title="Visitas a Piso"
            value={visitas?.febForecastIA || 0}
            icon={<Users className="w-8 h-8" />}
            color="red"
          />
          <KpiCard
            title="Leads"
            value={leads?.febForecastIA || 0}
            icon={<TrendingUp className="w-8 h-8" />}
            color="gray"
          />
        </div>

        {/* Gráfica de Ventas */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-t-4 border-red-500">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <div className="w-1 h-8 bg-red-500"></div>
            Tendencia de Ventas - {selectedAgency}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ventasChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" stroke="#1a1a1a" />
              <YAxis stroke="#1a1a1a" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '2px solid #e63946',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Legend />
              <Bar dataKey="nuevos" fill="#e63946" name="Nuevos" radius={[8, 8, 0, 0]} />
              <Bar dataKey="seminuevos" fill="#4b5563" name="Seminuevos" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de métricas */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-red-500">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
            <div className="w-1 h-8 bg-red-500"></div>
            Todas las Métricas - {selectedAgency}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-left py-4 px-4 font-bold uppercase tracking-wide">Métrica</th>
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide">Dic</th>
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide">Ene</th>
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide">Feb Real</th>
                  <th className="text-right py-4 px-4 font-bold uppercase tracking-wide bg-red-500">Feb Forecast IA</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-gray-900">{row.metric}</td>
                    <td className="py-3 px-4 text-right text-gray-700" suppressHydrationWarning>
                      {row.dec.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700" suppressHydrationWarning>
                      {row.jan.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700" suppressHydrationWarning>
                      {row.febReal.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-red-600 text-lg" suppressHydrationWarning>
                      {row.febForecastIA.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta KPI
function KpiCard({ title, value, icon, color }: any) {
  const colors: any = {
    red: 'bg-red-500',
    gray: 'bg-gray-800',
  };

  const borderColors: any = {
    red: 'border-red-500',
    gray: 'border-gray-800',
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${borderColors[color]} hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg shadow-md`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-bold uppercase tracking-wide mb-2">{title}</h3>
      <p className="text-4xl font-bold text-gray-900" suppressHydrationWarning>
        {Math.round(value)}
      </p>
    </div>
  );
}
