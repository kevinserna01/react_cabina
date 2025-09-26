import React, { useEffect, useMemo, useState } from 'react';
import { CarteraReportData } from '../../types';
import { exportCartera, getCarteraReport } from '../../services/reportsCartera';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CarteraReportsContent: React.FC = () => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [estado, setEstado] = useState<'pendiente' | 'pagada' | 'parcialmente_pagada' | 'vencida' | 'cancelada' | 'all'>('all');
  const [diasVencimiento, setDiasVencimiento] = useState<number>(0);
  const [data, setData] = useState<CarteraReportData>({ items: [], summary: { totalFacturado: 0, totalPendiente: 0, totalAbonado: 0, facturasPendientes: 0, facturasVencidas: 0 } });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getCarteraReport({ desde: desde || undefined, hasta: hasta || undefined, estado, diasVencimiento: diasVencimiento || undefined });
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar reporte';
      setError(msg);
      setData({ items: [], summary: { totalFacturado: 0, totalPendiente: 0, totalAbonado: 0, facturasPendientes: 0, facturasVencidas: 0 } });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const blob = await exportCartera({ desde: desde || undefined, hasta: hasta || undefined, estado, diasVencimiento: diasVencimiento || undefined, format });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-cartera.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al exportar';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Cartera</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')} className="px-3 py-2 bg-indigo-600 text-white rounded">Exportar PDF</button>
          <button onClick={() => handleExport('excel')} className="px-3 py-2 border rounded">Exportar Excel</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-3 py-2 border rounded" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="px-3 py-2 border rounded" />
          <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="px-3 py-2 border rounded">
            <option value="all">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcialmente_pagada">Parcialmente pagada</option>
            <option value="vencida">Vencida</option>
            <option value="pagada">Pagada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <input type="number" min={0} value={diasVencimiento} onChange={(e) => setDiasVencimiento(Number(e.target.value))} placeholder="Días venc." className="px-3 py-2 border rounded" />
          <button onClick={fetchData} className="px-3 py-2 border rounded">Aplicar</button>
          <button onClick={() => { setDesde(''); setHasta(''); setEstado('all'); setDiasVencimiento(0); fetchData(); }} className="px-3 py-2 border rounded">Limpiar</button>
        </div>
      </div>

      {isLoading && <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Cargando...</div>}
      {error && <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Total Facturado</div>
          <div className="text-xl font-semibold">{(data.summary.totalFacturado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Total Abonado</div>
          <div className="text-xl font-semibold">{(data.summary.totalAbonado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Saldo Pendiente</div>
          <div className="text-xl font-semibold">{(data.summary.totalPendiente || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Pendientes</div>
          <div className="text-xl font-semibold">{data.summary.facturasPendientes || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-xs text-gray-500">Vencidas</div>
          <div className="text-xl font-semibold">{data.summary.facturasVencidas || 0}</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="font-medium text-gray-700 mb-2">Total por Estado</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={useMemo(() => {
                const agg: Record<string, number> = {};
                data.items.forEach((r) => {
                  const k = (r.estado || 'desconocido');
                  agg[k] = (agg[k] || 0) + (r.total || 0);
                });
                return Object.entries(agg).map(([estado, total]) => ({ estado, total }));
              }, [data.items])}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="estado" fontSize={12} />
                <YAxis tickFormatter={(v) => v.toLocaleString('es-CO')} fontSize={12} />
                <Tooltip formatter={(v: any) => (Number(v) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} />
                <Bar dataKey="total" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="font-medium text-gray-700 mb-2">Participación por Cliente (Total Facturado)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={useMemo(() => {
                    const agg: Record<string, number> = {};
                    data.items.forEach((r) => {
                      const name = r.clienteNombre || 'Sin nombre';
                      agg[name] = (agg[name] || 0) + (r.total || 0);
                    });
                    return Object.entries(agg).map(([name, total]) => ({ name, total }));
                  }, [data.items])}
                  dataKey="total"
                  nameKey="name"
                  outerRadius={90}
                  label={(d) => `${d.name}`}
                >
                  {useMemo(() => {
                    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'];
                    const series = Object.entries(data.items.reduce((acc: Record<string, number>, r) => {
                      const key = r.clienteNombre || 'Sin nombre';
                      acc[key] = (acc[key] || 0) + (r.total || 0);
                      return acc;
                    }, {}));
                    return series.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />);
                  }, [data.items])}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: any) => (Number(v) || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 font-medium text-gray-700">Detalle</div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Factura</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Pendiente</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Días venc.</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Emisión</th>
                <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.items.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-6 text-center text-gray-500">Sin registros</td></tr>
              ) : data.items.map((r, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{r.numeroFactura || '-'}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{r.clienteNombre || '-'}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-500 capitalize">{r.estado || '-'}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{(r.total || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{(r.saldoPendiente || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{r.diasVencido ?? '-'}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{r.fechaEmision ? new Date(r.fechaEmision).toLocaleDateString('es-CO') : '-'}</td>
                  <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString('es-CO') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CarteraReportsContent;


