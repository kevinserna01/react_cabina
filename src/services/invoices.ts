import { InvoiceEntity, InvoiceItem, PaginationInfo } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  estado?: 'pendiente' | 'pagada' | 'parcialmente_pagada' | 'vencida' | 'cancelada' | 'all';
  clienteId?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export interface CreateInvoiceBody {
  clienteId: string;
  productos: InvoiceItem[];
  descuentoAplicado?: number;
  iva?: number;
  observaciones?: string;
  metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia';
  diasVencimiento?: number;
}

export const listInvoices = async (
  params: ListInvoicesParams = {}
): Promise<{ items: InvoiceEntity[]; pagination: PaginationInfo }> => {
  const url = new URL(`${BASE_URL}/facturas`);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.estado && params.estado !== 'all') url.searchParams.set('estado', params.estado);
  if (params.clienteId) url.searchParams.set('clienteId', params.clienteId);
  if (params.desde) url.searchParams.set('desde', params.desde);
  if (params.hasta) url.searchParams.set('hasta', params.hasta);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });

  if (res.status === 204) {
    return {
      items: [],
      pagination: { page: params.page || 1, limit: params.limit || 10, total: 0, pages: 1 },
    };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al listar facturas');

  const payload = (data && data.data !== undefined) ? data.data : data;

  // Normalizar respuesta
  let items: InvoiceEntity[] = [];
  let pagination: PaginationInfo = { page: params.page || 1, limit: params.limit || 10, total: 0, pages: 1 };

  if (Array.isArray(payload)) {
    items = payload as InvoiceEntity[];
    pagination = { page: params.page || 1, limit: params.limit || 10, total: items.length, pages: 1 };
  } else if (payload && Array.isArray(payload.items)) {
    items = payload.items as InvoiceEntity[];
    const p = payload.pagination || {};
    const page = Number(p.page || params.page || 1);
    const limit = Number(p.limit || params.limit || 10);
    const total = Number(p.total || items.length || 0);
    const pages = Number(p.pages || (total && limit ? Math.max(1, Math.ceil(total / limit)) : 1));
    pagination = { page, limit, total, pages };
  } else if (payload && Array.isArray((payload as any).facturas)) {
    // data.facturas y data.pagination (formato backend actual)
    const pld: any = payload;
    items = pld.facturas as InvoiceEntity[];
    const p = pld.pagination || {};
    const page = Number(p.page || params.page || 1);
    const limit = Number(p.limit || params.limit || 10);
    const total = Number(p.total || items.length || 0);
    const pages = Number(p.pages || (total && limit ? Math.max(1, Math.ceil(total / limit)) : 1));
    pagination = { page, limit, total, pages };
  }

  return { items, pagination };
};

export const getInvoiceById = async (id: string): Promise<InvoiceEntity> => {
  const res = await fetch(`${BASE_URL}/facturas/${id}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al obtener factura');
  return data as InvoiceEntity;
};

export const listInvoicesByCustomer = async (
  clienteId: string,
  params: Omit<ListInvoicesParams, 'clienteId'> = {}
): Promise<{ items: InvoiceEntity[]; pagination: PaginationInfo }> => {
  return listInvoices({ ...params, clienteId });
};

export const createInvoice = async (body: CreateInvoiceBody): Promise<InvoiceEntity> => {
  const res = await fetch(`${BASE_URL}/facturas`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al crear factura');
  return data as InvoiceEntity;
};

export const updateInvoiceStatus = async (
  id: string,
  estado: 'pendiente' | 'pagada' | 'parcialmente_pagada' | 'vencida' | 'cancelada',
  observaciones?: string
): Promise<InvoiceEntity> => {
  const res = await fetch(`${BASE_URL}/facturas/${id}/estado`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ estado, observaciones }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al actualizar estado');
  return data as InvoiceEntity;
};

// Editar plan de abonos de una factura
export interface EditInstallmentsBody {
  facturaId: string;
  abonos: Array<{
    numero: number;
    monto: number; // puede ser 0 (flexible)
    fechaProgramada?: string | null; // ISO o null para flexible
    estado?: 'pendiente' | 'pagado' | string;
    observaciones?: string;
    esFlexible?: boolean;
  }>;
}

export const editInvoiceInstallments = async (
  body: EditInstallmentsBody
): Promise<{
  facturaId: string;
  abonos: Array<{
    numero: number;
    monto: number;
    fechaProgramada: string;
    estado: string;
    observaciones?: string;
    esFlexible?: boolean;
  }>;
  totalAbonos?: number;
  totalFactura?: number;
  diferencia?: number;
}> => {
  const res = await fetch(`${BASE_URL}/editar-plan-abonos`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al editar plan de abonos');
  return data?.data || data;
};


// Sugerir montos automáticamente para un plan de abonos
export interface SuggestPaymentAmountsBody {
  facturaId: string;
  numeroAbonos: number; // total deseado de abonos
  abonosExistentes: Array<{
    numero: number;
    monto: number;
    estado?: string;
  }>;
  totalFactura?: number; // total de la factura (para cálculo en backend)
}

export interface SuggestPaymentAmountsResponse {
  facturaId: string;
  totalFactura: number;
  montoAsignado: number;
  montoDisponible: number;
  abonosExistentes: number;
  abonosRestantes: number;
  sugerencias: Array<{
    numero: number;
    monto: number;
    fechaProgramada?: string | null;
    estado?: string;
    observaciones?: string;
    esFlexible?: boolean;
    puedeModificar?: boolean;
    esRecalculo?: boolean;
    montoAnterior?: number;
  }>;
  totalSugerido: number;
  diferencia: number;
}

export const suggestPaymentAmounts = async (
  body: SuggestPaymentAmountsBody
): Promise<SuggestPaymentAmountsResponse> => {
  const res = await fetch(`${BASE_URL}/suggest-payment-amounts`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || 'Error al obtener sugerencias de abonos');
  // La API puede devolver { status, message, data }
  const payload = (data && (data as any).data) ? (data as any).data : data;
  return payload as SuggestPaymentAmountsResponse;
};


