import React, { useEffect, useState } from 'react';
import { InvoiceEntity, InvoiceStatus, PaginationInfo } from '../../types';
import { createInvoice, listInvoices, updateInvoiceStatus } from '../../services/invoices';
import { createPayment, listPaymentsByInvoice } from '../../services/payments';
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
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [paymentsInvoiceId, setPaymentsInvoiceId] = useState<string>('');
  const [payments, setPayments] = useState<{ id: string; montoAbono: number; metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia'; observaciones?: string; fechaRegistro?: string }[]>([]);
  const [newPayment, setNewPayment] = useState<{ montoAbono: number; metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia'; observaciones?: string }>({ montoAbono: 0, metodoPago: 'Efectivo', observaciones: '' });

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

  const handleChangeStatus = async (id: string, estado: InvoiceStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      await updateInvoiceStatus(id, estado);
      fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar estado';
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

  const openPayments = async (invoiceId: string) => {
    setIsPaymentsOpen(true);
    setPaymentsInvoiceId(invoiceId);
    try {
      const res = await listPaymentsByInvoice(invoiceId);
      setPayments(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar abonos';
      setError(msg);
      setPayments([]);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await createPayment({
        facturaId: paymentsInvoiceId,
        montoAbono: newPayment.montoAbono,
        metodoPago: newPayment.metodoPago,
        observaciones: newPayment.observaciones,
      });
      const res = await listPaymentsByInvoice(paymentsInvoiceId);
      setPayments(res);
      // Refrescar facturas para actualizar estado/saldo
      fetchData(pagination.page, pagination.limit);
      setNewPayment({ montoAbono: 0, metodoPago: 'Efectivo', observaciones: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al registrar abono';
      setError(msg);
    } finally {
      setIsLoading(false);
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
                        <button onClick={() => handleChangeStatus(f.id, 'pagada')} className="px-2 py-1 border rounded text-xs">Pagada</button>
                        <button onClick={() => openPayments(f.id)} className="px-2 py-1 border rounded text-xs">Abonos</button>
                        <button onClick={() => handleChangeStatus(f.id, 'cancelada')} className="px-2 py-1 border rounded text-xs">Cancelar</button>
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
      {isPaymentsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Abonos</h2>
                <button onClick={() => setIsPaymentsOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Registrar abono</h3>
                <form onSubmit={handleCreatePayment} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Monto (COP)</label>
                    <input type="number" min={1} value={newPayment.montoAbono} onChange={(e) => setNewPayment({ ...newPayment, montoAbono: Number(e.target.value) })} className="w-full px-3 py-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Método de pago</label>
                    <select value={newPayment.metodoPago} onChange={(e) => setNewPayment({ ...newPayment, metodoPago: e.target.value as any })} className="w-full px-3 py-2 border rounded" required>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Nequi">Nequi</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">Observaciones</label>
                    <input value={newPayment.observaciones || ''} onChange={(e) => setNewPayment({ ...newPayment, observaciones: e.target.value })} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div className="md:col-span-4 flex justify-end">
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Registrar</button>
                  </div>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Historial de abonos</h3>
                <div className="bg-gray-50 rounded p-3">
                  {payments.length === 0 ? (
                    <div className="text-sm text-gray-500">Sin abonos</div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="px-2 py-1">Fecha</th>
                          <th className="px-2 py-1">Método</th>
                          <th className="px-2 py-1">Monto</th>
                          <th className="px-2 py-1">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="text-sm">
                            <td className="px-2 py-1">{(p as any).fechaAbono ? new Date((p as any).fechaAbono).toLocaleString('es-CO') : (p.fechaRegistro ? new Date(p.fechaRegistro).toLocaleString('es-CO') : '-')}</td>
                            <td className="px-2 py-1">{p.metodoPago}</td>
                            <td className="px-2 py-1">{p.montoAbono.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                            <td className="px-2 py-1">{p.observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">{error}</div>}
    </div>
  );
};

export default InvoicesContent;


