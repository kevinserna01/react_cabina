import { AccountStatement, InvoiceEntity, PaymentEntity } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export const getAccountStatement = async (clienteId: string): Promise<AccountStatement> => {
  const res = await fetch(`${BASE_URL}/estado-cuenta/${clienteId}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al obtener estado de cuenta');

  // Normalizar forma: { status, data: {...} } o directa
  const payload = (data && data.data !== undefined) ? data.data : data;

  // Mapear respuesta backend → AccountStatement
  const cliente = payload?.cliente || {};
  const resumen = payload?.resumenFinanciero || {};
  const facturas = Array.isArray(payload?.facturas) ? payload.facturas : [];
  const abonos = Array.isArray(payload?.abonos) ? payload.abonos : [];

  const mapped: AccountStatement = {
    customer: {
      id: cliente.id || '',
      nombre: cliente.nombre || '',
      tipoIdentificacion: cliente.tipoIdentificacion || undefined,
      numeroIdentificacion: cliente.numeroIdentificacion || undefined,
      email: cliente.email || undefined,
      telefono: cliente.telefono || undefined,
      ciudad: cliente.ciudad || undefined,
      ubicacionLocal: cliente.ubicacionLocal || undefined,
    },
    summary: {
      totalFacturado: Number(resumen.totalFacturado || 0),
      totalAbonado: Number(resumen.totalAbonado || 0),
      saldoPendiente: Number(resumen.saldoPendiente || 0),
      facturasPendientes: Number(resumen.facturasPendientes || 0),
      facturasVencidas: Number(resumen.facturasVencidas || 0),
    },
    invoices: (facturas as any[]).map((f): InvoiceEntity => ({
      id: f.id,
      clienteId: cliente.id || '',
      numeroFactura: f.numeroFactura,
      productos: [],
      descuentoAplicado: undefined,
      iva: undefined,
      observaciones: undefined,
      metodoPago: (f.metodoPago as any) || 'Efectivo',
      diasVencimiento: undefined,
      estado: f.estado,
      fechaEmision: f.fechaEmision,
      fechaVencimiento: f.fechaVencimiento,
      total: Number(f.total || 0),
      saldoPendiente: Number(f.saldoPendiente || 0),
    })),
    payments: (abonos as any[]).map((p): PaymentEntity => ({
      id: p.id,
      facturaId: p.facturaId,
      clienteId: cliente.id || undefined,
      montoAbono: Number(p.montoAbono || 0),
      metodoPago: p.metodoPago,
      observaciones: p.observaciones || undefined,
      fechaAbono: p.fechaAbono,
      fechaRegistro: p.fechaRegistro || undefined,
      usuarioRegistra: p.usuarioRegistra || undefined,
    })),
    metrics: {
      diasVencimientoPromedio: Number(resumen.diasVencimientoPromedio || 0),
      facturasParciales: Number(resumen.facturasParciales || 0),
      facturasPagadas: Number(resumen.facturasPagadas || 0),
    },
  };

  return mapped;
};


