import React, { useEffect, useState } from 'react';
import { InvoiceEntity, InvoiceStatus, PaginationInfo } from '../../types';
import { createInvoice, listInvoices } from '../../services/invoices';
import { listCustomers } from '../../services/customers';

const InvoicesContent: React.FC = () => {
  const [items, setItems] = useState<InvoiceEntity[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 10, total: 0, pages: 1 });
  const [estado, setEstado] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  const [desde, setDesde] = useState<string>('');
  const [hasta, setHasta] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  type ProductoInput = { code: string; cantidad: string; precioUnitario: string };
  const [form, setForm] = useState({
    clienteId: '',
    productos: [{ code: '', cantidad: '', precioUnitario: '' } as ProductoInput],
    descuentoAplicado: 0,
    iva: 19,
    observaciones: '',
    metodoPago: 'Efectivo' as 'Efectivo' | 'Nequi' | 'Transferencia',
    diasVencimiento: 30,
  });
  const [clientesOptions, setClientesOptions] = useState<{ id: string; nombre: string }[]>([]);
  
  // Estados para el modal de plan de abonos
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  const fetchClientes = async () => {
    try {
      const res = await listCustomers({ page: 1, limit: 50, estado: 'activo' });
      const opts = (res.data.items || []).map((c: any) => ({ id: c.id, nombre: c.nombre }));
      setClientesOptions(opts);
    } catch {
      setClientesOptions([]);
    }
  };

  const fetchData = async (page = pagination.page, limit = pagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listInvoices({ page, limit, estado: estado === 'all' ? undefined : estado, clienteId: clienteId || undefined, desde: desde || undefined, hasta: hasta || undefined });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar facturas';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    fetchData(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado, clienteId, desde, hasta]);

  const handleAddProduct = () => {
    setForm((prev) => ({ ...prev, productos: [...prev.productos, { code: '', cantidad: '', precioUnitario: '' }] }));
  };

  const handleRemoveProduct = (index: number) => {
    setForm((prev) => ({ ...prev, productos: prev.productos.filter((_, i) => i !== index) }));
  };

  const handleProductChange = (index: number, field: 'code' | 'cantidad' | 'precioUnitario', value: string) => {
    setForm((prev) => ({
      ...prev,
      productos: prev.productos.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await createInvoice({
        clienteId: form.clienteId,
        productos: form.productos.map((p) => ({
          code: p.code.trim(),
          cantidad: Math.max(1, Number(p.cantidad || '0')),
          precioUnitario: Math.max(0, Number(p.precioUnitario || '0')),
        })),
        descuentoAplicado: form.descuentoAplicado,
        iva: form.iva,
        observaciones: form.observaciones,
        metodoPago: form.metodoPago,
        diasVencimiento: form.diasVencimiento,
      });
      setIsModalOpen(false);
      setForm({ clienteId: '', productos: [{ code: '', cantidad: '', precioUnitario: '' }], descuentoAplicado: 0, iva: 19, observaciones: '', metodoPago: 'Efectivo', diasVencimiento: 30 });
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al crear factura';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      // noop
    }
  };


  const openPlanDetails = async (invoiceId: string) => {
    setIsPlanModalOpen(true);
    setIsLoadingPlan(true);
    setError(null);
    
    try {
      const response = await fetch(`https://back-papeleria-two.vercel.app/v1/papeleria/facturas-plan/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al cargar detalles del plan');
      }

      setPlanData(result.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar detalles del plan';
      setError(msg);
      setPlanData(null);
    } finally {
      setIsLoadingPlan(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Facturación</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Nueva Factura
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, cliente o factura..."
            className="px-3 py-2 border rounded md:col-span-2"
            aria-label="Buscar facturas"
          />
          <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="px-3 py-2 border rounded">
            <option value="all">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="parcialmente_pagada">Parcialmente pagada</option>
            <option value="vencida">Vencida</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="px-3 py-2 border rounded">
            <option value="">Todos los clientes</option>
            {clientesOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="px-3 py-2 border rounded" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="px-3 py-2 border rounded" />
          <button onClick={() => fetchData(1, pagination.limit)} className="px-3 py-2 border rounded">Filtrar</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-2/6">Cliente</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-1/12">Estado</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-1/12">Total</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-2/12">Saldo</th>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider w-2/12">Fecha</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider w-2/12">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Cargando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Sin facturas</td></tr>
              ) : (
                (search.trim()
                  ? items.filter((f) => {
                      const q = search.trim().toLowerCase();
                      const byId = (f.id || '').toLowerCase().includes(q);
                      const byNum = (f.numeroFactura || '').toLowerCase().includes(q);
                      const byName = (f.cliente?.nombre || '').toLowerCase().includes(q);
                      return byId || byNum || byName;
                    })
                  : items
                ).map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs md:text-sm text-gray-900">
                      <div className="flex items-center justify-between gap-2" title={`ID: ${f.id}`}>
                        <div className="min-w-0">
                          <div className="truncate" aria-label="Nombre del cliente">{f.cliente?.nombre || f.clienteId}</div>
                          <div className="text-[11px] text-gray-500" aria-label="Número de factura">Factura: {f.numeroFactura || '-'}</div>
                        </div>
                        <button
                          onClick={() => handleCopyId(f.id)}
                          className="shrink-0 px-2 py-1 border rounded text-[11px] text-gray-600 hover:text-gray-800"
                          aria-label="Copiar ID de factura"
                          title={f.id}
                        >
                          Copiar ID
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs md:text-sm text-gray-500 capitalize whitespace-nowrap">{f.estado}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-gray-900 whitespace-nowrap">{(f.total ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                    <td className="px-4 py-3 text-xs md:text-sm text-gray-900">
                      <div className="whitespace-nowrap">Pend.: {(f.saldoPendiente ?? 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
                      <div className="whitespace-nowrap text-gray-500">Abono: {(Math.max(0, (f.total ?? 0) - (f.saldoPendiente ?? 0))).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div>
                    </td>
                    <td className="px-4 py-3 text-xs md:text-sm text-gray-500 whitespace-nowrap">{f.fechaEmision ? new Date(f.fechaEmision).toLocaleString('es-CO') : '-'}</td>
                    <td className="px-4 py-3 text-right text-xs md:text-sm">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openPlanDetails(f.id)} className="px-2 py-1 border rounded text-xs">Abonos</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600">Página {pagination.page} de {Math.max(1, pagination.pages)} — {pagination.total} registros</span>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData(pagination.page - 1, pagination.limit)} className="px-3 py-1 border rounded" disabled={pagination.page <= 1}>Anterior</button>
            <button onClick={() => fetchData(pagination.page + 1, pagination.limit)} className="px-3 py-1 border rounded" disabled={pagination.page >= pagination.pages}>Siguiente</button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Nueva Factura</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                    <select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })} className="w-full px-3 py-2 border rounded" required>
                      <option value="" disabled>Seleccione un cliente</option>
                      {clientesOptions.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                    <select value={form.metodoPago} onChange={(e) => setForm({ ...form, metodoPago: e.target.value as any })} className="w-full px-3 py-2 border rounded" required>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
                    <input type="number" min={0} max={100} value={form.iva} onChange={(e) => setForm({ ...form, iva: Number(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Días de vencimiento</label>
                    <input type="number" min={0} value={form.diasVencimiento} onChange={(e) => setForm({ ...form, diasVencimiento: Number(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Productos</label>
                  <div className="space-y-3">
                    {form.productos.map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <input placeholder="Código" value={p.code} onChange={(e) => handleProductChange(i, 'code', e.target.value)} className="w-full px-3 py-2 border rounded" required />
                        </div>
                        <div className="col-span-3">
                          <input
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={p.cantidad}
                            onChange={(e) => handleProductChange(i, 'cantidad', e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="Cantidad"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            inputMode="decimal"
                            value={p.precioUnitario}
                            onChange={(e) => handleProductChange(i, 'precioUnitario', e.target.value.replace(/[^0-9.]/g, ''))}
                            className="w-full px-3 py-2 border rounded"
                            placeholder="Precio"
                            required
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button type="button" onClick={() => handleRemoveProduct(i)} className="px-3 py-2 border rounded">✕</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddProduct} className="px-3 py-2 border rounded">Añadir producto</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                    <input type="number" min={0} max={100} value={form.descuentoAplicado} onChange={(e) => setForm({ ...form, descuentoAplicado: Number(e.target.value) })} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                    <input value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Crear</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Plan de Abonos */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Plan de Abonos</h2>
                <button 
                  onClick={() => {
                    setIsPlanModalOpen(false);
                    setPlanData(null);
                  }} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {isLoadingPlan ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando detalles del plan...</p>
                </div>
              ) : planData ? (
                <div className="space-y-6">
                  {/* Información de la Factura */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">Información de la Factura</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p><strong>Número:</strong> {planData.factura?.numeroFactura || 'N/A'}</p>
                        <p><strong>Estado:</strong> <span className={`px-2 py-1 rounded text-xs ${planData.factura?.estado === 'pagada' ? 'bg-green-100 text-green-800' : planData.factura?.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{planData.factura?.estado || 'N/A'}</span></p>
                        <p><strong>Total:</strong> ${(planData.factura?.total || 0).toLocaleString('es-CO')}</p>
                        <p><strong>Saldo Pendiente:</strong> ${(planData.factura?.saldoPendiente || 0).toLocaleString('es-CO')}</p>
                      </div>
                      <div>
                        <p><strong>Cliente:</strong> {planData.factura?.cliente?.nombre || 'N/A'}</p>
                        <p><strong>Email:</strong> {planData.factura?.cliente?.email || 'N/A'}</p>
                        <p><strong>Teléfono:</strong> {planData.factura?.cliente?.telefono || 'N/A'}</p>
                        <p><strong>Fecha Emisión:</strong> {planData.factura?.fechaEmision ? new Date(planData.factura.fechaEmision).toLocaleDateString('es-CO') : 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Información de la Venta Relacionada */}
                  {planData.venta && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3">Venta Relacionada</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p><strong>Código:</strong> {planData.venta.code || 'N/A'}</p>
                          <p><strong>Tipo de Venta:</strong> <span className={`px-2 py-1 rounded text-xs ${planData.venta.tipoVenta === 'contado' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{planData.venta.tipoVenta || 'N/A'}</span></p>
                        </div>
                        <div>
                          <p><strong>Estado Pago:</strong> <span className={`px-2 py-1 rounded text-xs ${planData.venta.estadoPago === 'pagada' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{planData.venta.estadoPago || 'N/A'}</span></p>
                          <p><strong>Vendedor:</strong> {planData.venta.trabajador?.nombre || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estadísticas del Plan */}
                  {planData.estadisticasPlan && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-3">Resumen del Plan</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">${planData.estadisticasPlan.totalPlaneado?.toLocaleString('es-CO') || '0'}</p>
                          <p className="text-sm text-gray-600">Total Planeado</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">${planData.estadisticasPlan.totalPagado?.toLocaleString('es-CO') || '0'}</p>
                          <p className="text-sm text-gray-600">Total Pagado</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{planData.estadisticasPlan.abonosPagados || 0}</p>
                          <p className="text-sm text-gray-600">Abonos Pagados</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{planData.estadisticasPlan.abonosPendientes || 0}</p>
                          <p className="text-sm text-gray-600">Abonos Pendientes</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Plan de Abonos */}
                  {planData.factura?.planAbonos && planData.factura.planAbonos.length > 0 ? (
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Plan de Abonos</h3>
                      <div className="space-y-3">
                        {planData.factura.planAbonos.map((abono: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${abono.estado === 'pagado' ? 'bg-green-50 border-green-200' : abono.estado === 'vencido' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">Abono #{abono.numero}</span>
                                  <span className={`px-2 py-1 rounded text-xs ${abono.estado === 'pagado' ? 'bg-green-100 text-green-800' : abono.estado === 'vencido' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {abono.estado?.toUpperCase() || 'PENDIENTE'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600">
                                  <strong>Monto:</strong> ${abono.monto?.toLocaleString('es-CO') || '0'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <strong>Fecha Programada:</strong> {abono.fechaProgramada ? new Date(abono.fechaProgramada).toLocaleDateString('es-CO') : 'N/A'}
                                </p>
                                {abono.estado === 'pagado' && (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      <strong>Fecha Pago:</strong> {abono.fechaPago ? new Date(abono.fechaPago).toLocaleDateString('es-CO') : 'N/A'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      <strong>Monto Pagado:</strong> ${abono.montoPagado?.toLocaleString('es-CO') || '0'}
                                    </p>
                                    {abono.montoPagado !== abono.monto && (
                                      <p className="text-sm text-blue-600">
                                        <strong>Diferencia:</strong> ${((abono.montoPagado || 0) - (abono.monto || 0)).toLocaleString('es-CO')}
                                      </p>
                                    )}
                                  </>
                                )}
                                {abono.observaciones && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    <strong>Observaciones:</strong> {abono.observaciones}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600">Esta factura no tiene un plan de abonos configurado.</p>
                    </div>
                  )}

                  {/* Historial de Abonos Reales */}
                  {planData.abonosReales && planData.abonosReales.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-lg font-semibold mb-4">Historial de Pagos</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-left text-sm text-gray-500">
                              <th className="px-3 py-2">Abono #</th>
                              <th className="px-3 py-2">Monto Pagado</th>
                              <th className="px-3 py-2">Método</th>
                              <th className="px-3 py-2">Fecha Pago</th>
                              <th className="px-3 py-2">Diferencia</th>
                              <th className="px-3 py-2">Tipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {planData.abonosReales.map((abono: any, index: number) => (
                              <tr key={index} className="border-t">
                                <td className="px-3 py-2 text-sm">{abono.numeroAbono || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm">${abono.montoPagado?.toLocaleString('es-CO') || '0'}</td>
                                <td className="px-3 py-2 text-sm">{abono.metodoPago || 'N/A'}</td>
                                <td className="px-3 py-2 text-sm">{abono.fechaPago ? new Date(abono.fechaPago).toLocaleDateString('es-CO') : 'N/A'}</td>
                                <td className="px-3 py-2 text-sm">
                                  {abono.diferencia !== 0 && (
                                    <span className={abono.diferencia > 0 ? 'text-green-600' : 'text-red-600'}>
                                      ${abono.diferencia?.toLocaleString('es-CO') || '0'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm">
                                  {abono.esAbonoLibre && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Abono Libre</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No se pudieron cargar los detalles del plan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">{error}</div>}
    </div>
  );
};

export default InvoicesContent;


