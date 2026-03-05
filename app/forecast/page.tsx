'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Car, TrendingDown } from 'lucide-react';
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

function KpiCard({ title, forecast, real, forecastIA, icon, color, mes }: any) {
  const colors: any = { red: 'bg-red-500', dark: 'bg-gray-800' };
  const borders: any = { red: 'border-red-500', dark: 'border-gray-800' };

  return (
    <div className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${borders[color]} hover:shadow-xl transition-shadow`}>
      <div className={`${colors[color]} text-white p-3 rounded-lg w-fit mb-4 shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-4xl font-bold text-gray-900 mb-2" suppressHydrationWarning>
        {Math.round(forecastIA)}
      </p>
      <p className="text-xs text-gray-400" suppressHydrationWarning>
        {mes} real: {Math.round(real)
      </p>
    </div>
  );
}

function FunnelStep({ label, value, prevValue, isFirst }: { label: string; value: number; prevValue?: number; isFirst?: boolean }) {
  const conversionRate = !isFirst && prevValue && prevValue > 0 ? (value / prevValue) * 100 : 100;

  return (
    <div className="relative">
      {!isFirst && (
        <div className="flex items-center justify-center py-2">
          <TrendingDown className="text-gray-400" size={20} />
          <span className="ml-2 text-sm font-semibold text-gray-600">
            {conversionRate.toFixed(0)}%
          </span>
        </div>
      )}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-bold">{Math.round(value)}</p>
        </div>
      </div>
    </div>
  );
}

export default function ForecastDashboard() {
  const [data, setData] = useState<MetricData[]>([]);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [headers, setHeaders] = useState<Headers>({
    historical: [],
    mesActual: '',
    mesActualRealLabel: '',
    mesActualForecastLabel: '',
  });
  const [selectedAgency, setSelectedAgency] = useState('Total Grupo');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData(selectedAgency);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando datos...</p>
        </div>
      </div>
    );
  }

  const ventasNuevos = data.find(m => m.metric === 'Ventas Nuevos');
  const ventasSemi = data.find(m => m.metric === 'Ventas Seminuevos');
  const visitas = data.find(m => m.metric === 'Total visitas a piso');
  const leads = data.find(m => m.metric === 'Leads');
  const leadsContactados = data.find(m => m.metric === 'Leads Contactados');
  const citasAgendadas = data.find(m => m.metric === 'Citas Agendadas');
  const citasEfectivas = data.find(m => m.metric === 'Citas Efectivas');
  const pruebasManejo = data.find(m => m.metric === 'Pruebas de Manejo');
  const solicitudesFinanciera = data.find(m => m.metric === 'Solicitudes Financiera de Marca');
  const avaluos = data.find(m => m.metric === 'Avalúos');

  const mesActualLabel = headers.mesActual || 'Mar';
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-900 to-black text-white py-8 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image src="/logo.png" alt="Grupo Daytona" width={120} height={60} className="h-16 w-auto" />
              <div className="border-l-4 border-red-500 pl-4">
                <h1 className="text-3xl font-bold">Dashboard de Forecast</h1>
                <p className="text-gray-300 text-sm mt-1">{mesActualLabel} {currentYear}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Actualizado al dia de hoy</p>
              <p className="text-xs text-gray-500 mt-1">2026 Grupo Daytona. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 mb-8">
          <label htmlFor="agency-select" className="block text-gray-600 text-sm font-semibold uppercase tracking-widest mb-2">
            Seleccionar Agencia
          </label>
          <select
            id="agency-select"
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="w-full md:w-96 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-900 text-lg font-semibold bg-white hover:border-red-400 transition-colors"
          >
            {agencies.map((agency) => (
              <option key={agency} value={agency}>{agency}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Ventas Nuevos"
            forecast={ventasNuevos?.forecastIA || 0}
            real={ventasNuevos?.mesActualReal || 0}
            forecastIA={ventasNuevos?.forecastIA || 0}
            icon={<Car size={32} />}
            color="red"
            mes={mesActualLabel}
          />
          <KpiCard
            title="Ventas Seminuevos"
            forecast={ventasSemi?.forecastIA || 0}
            real={ventasSemi?.mesActualReal || 0}
            forecastIA={ventasSemi?.forecastIA || 0}
            icon={<Car size={32} />}
            color="dark"
            mes={mesActualLabel}
          />
          <KpiCard
            title="Visitas a Piso"
            forecast={visitas?.forecastIA || 0}
            real={visitas?.mesActualReal || 0}
            forecastIA={visitas?.forecastIA || 0}
            icon={<Users size={32} />}
            color="red"
            mes={mesActualLabel}
          />
          <KpiCard
            title="Leads"
            forecast={leads?.forecastIA || 0}
            real={leads?.mesActualReal || 0}
            forecastIA={leads?.forecastIA || 0}
            icon={<TrendingUp size={32} />}
            color="dark"
            mes={mesActualLabel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Funnel Digital / CRM</h2>
            <div className="space-y-0">
              <FunnelStep label="Leads" value={leads?.mesActualForecast || 0} isFirst />
              <FunnelStep
                label="Leads Contactados"
                value={leadsContactados?.mesActualForecast || 0}
                prevValue={leads?.mesActualForecast}
              />
              <FunnelStep
                label="Citas Agendadas"
                value={citasAgendadas?.mesActualForecast || 0}
                prevValue={leadsContactados?.mesActualForecast}
              />
              <FunnelStep
                label="Citas Efectivas"
                value={citasEfectivas?.mesActualForecast || 0}
                prevValue={citasAgendadas?.mesActualForecast}
              />
              <FunnelStep
                label="Ventas Nuevos"
                value={ventasNuevos?.mesActualForecast || 0}
                prevValue={citasEfectivas?.mesActualForecast}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 border-t-4 border-gray-800">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Funnel Showroom / Venta</h2>
            <div className="space-y-0">
              <FunnelStep label="Visitas a Piso" value={visitas?.mesActualForecast || 0} isFirst />
              <FunnelStep
                label="Pruebas de Manejo"
                value={pruebasManejo?.mesActualForecast || 0}
                prevValue={visitas?.mesActualForecast}
              />
              <FunnelStep
                label="Solicitudes Financiera"
                value={solicitudesFinanciera?.mesActualForecast || 0}
                prevValue={pruebasManejo?.mesActualForecast}
              />
              <FunnelStep
                label="Avalúos"
                value={avaluos?.mesActualForecast || 0}
                prevValue={solicitudesFinanciera?.mesActualForecast}
              />
              <FunnelStep
                label="Ventas Nuevos"
                value={ventasNuevos?.mesActualForecast || 0}
                prevValue={avaluos?.mesActualForecast}
              />
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm mt-8 pb-4">
          <p>2026 Grupo Daytona. Todos los derechos reservados. Dashboard de Forecast</p>
        </div>
      </div>
    </div>
  );
}
