'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Car } from 'lucide-react';

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
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Grupo Daytona</h1>
          <p className="text-xl">Forecast Febrero 2026</p>
          <p className="text-sm mt-2 opacity-80">© 2026 Grupo Daytona. Todos los derechos reservados.</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Selector de Agencia */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <label htmlFor="agency-select" className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Agencia
          </label>
          <select
            id="agency-select"
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
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
            color="blue"
          />
          <KpiCard
            title="Ventas Seminuevos"
            value={ventasSemi?.febForecastIA || 0}
            icon={<Car className="w-8 h-8" />}
            color="green"
          />
          <KpiCard
            title="Visitas a Piso"
            value={visitas?.febForecastIA || 0}
            icon={<Users className="w-8 h-8" />}
            color="purple"
          />
          <KpiCard
            title="Leads"
            value={leads?.febForecastIA || 0}
            icon={<TrendingUp className="w-8 h-8" />}
            color="orange"
          />
        </div>

        {/* Gráfica de Ventas */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Tendencia de Ventas - {selectedAgency}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ventasChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="nuevos" fill="#3b82f6" name="Nuevos" />
              <Bar dataKey="seminuevos" fill="#10b981" name="Seminuevos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de métricas */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Todas las Métricas - {selectedAgency}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4">Métrica</th>
                  <th className="text-right py-3 px-4">Dic</th>
                  <th className="text-right py-3 px-4">Ene</th>
                  <th className="text-right py-3 px-4">Feb Real</th>
                  <th className="text-right py-3 px-4">Feb Forecast IA</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{row.metric}</td>
                    <td className="py-3 px-4 text-right" suppressHydrationWarning>
                      {row.dec.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right" suppressHydrationWarning>
                      {row.jan.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right" suppressHydrationWarning>
                      {row.febReal.toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600" suppressHydrationWarning>
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
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900" suppressHydrationWarning>
        {Math.round(value)}
      </p>
    </div>
  );
}
