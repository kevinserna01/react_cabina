import React, { useEffect, useState } from 'react';
import { AccountStatement } from '../../types';
import { getAccountStatement } from '../../services/account';
import { listCustomers } from '../../services/customers';

const AccountStatementContent: React.FC = () => {
  const [clienteId, setClienteId] = useState('');
  const [clientesOptions, setClientesOptions] = useState<{ id: string; nombre: string }[]>([]);
  const [data, setData] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClientes = async () => {
    try {
      const res = await listCustomers({ page: 1, limit: 100, estado: 'activo' });
      const opts = (res.data.items || []).map((c: any) => ({ id: c.id, nombre: c.nombre }));
      setClientesOptions(opts);
    } catch {
      setClientesOptions([]);
    }
  };

  const fetchData = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAccountStatement(id);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar estado de cuenta';
      setError(msg);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Estado de Cuenta</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full px-3 py-2 border rounded" required>
              <option value="" disabled>Seleccione un cliente</option>
              {clientesOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={() => fetchData(clienteId)} className="px-4 py-2 bg-blue-600 text-white rounded">Consultar</button>
            {data?.customer && (
              <div className="text-sm text-gray-600 self-center">NIT/ID: {data.customer?.numeroIdentificacion || '-'}</div>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Cargando...</div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 p-3 rounded">{error}</div>
      )}

      {data && !isLoading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">Total Facturado</div>
              <div className="text-xl font-semibold">{(data?.summary?.totalFacturado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">Total Abonado</div>
              <div className="text-xl font-semibold">{(data?.summary?.totalAbonado || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">Saldo Pendiente</div>
              <div className="text-xl font-semibold">{(data?.summary?.saldoPendiente || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-xs text-gray-500">Facturas Pendientes / Vencidas</div>
              <div className="text-xl font-semibold">{data?.summary?.facturasPendientes || 0} / {data?.summary?.facturasVencidas || 0}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 font-medium text-gray-700">Facturas</div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider w-2/6">Factura</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider w-1/6">Estado</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider w-1/6">Total</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider w-1/6">Pendiente</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider w-1/6">Fecha</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(Array.isArray(data?.invoices) ? data!.invoices : []).length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-6 text-center text-gray-500">Sin facturas</td></tr>
                  ) : (Array.isArray(data?.invoices) ? data!.invoices : []).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-900">
                        <div className="truncate" title={f.id}>Factura: {f.numeroFactura || '-'}
                          <span className="ml-2 text-[11px] text-gray-500">({f.id.slice(-6)})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-500 capitalize">{f.estado}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{(f.total ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{(f.saldoPendiente ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{f.fechaEmision ? new Date(f.fechaEmision).toLocaleString('es-CO') : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 font-medium text-gray-700">Abonos</div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Método</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-4 py-2 text-left text-[11px] text-gray-500 uppercase tracking-wider">Factura</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(Array.isArray(data?.payments) ? data!.payments : []).length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-6 text-center text-gray-500">Sin abonos</td></tr>
                  ) : (Array.isArray(data?.payments) ? data!.payments : []).map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{(p.fechaAbono || p.fechaRegistro) ? new Date((p.fechaAbono || p.fechaRegistro) as string).toLocaleString('es-CO') : '-'}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{p.metodoPago}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-900">{p.montoAbono.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                      <td className="px-4 py-3 text-xs md:text-sm text-gray-500">{p.facturaId.slice(-6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountStatementContent;


