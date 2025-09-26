import { CarteraReportData, CarteraReportItem } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export interface CarteraParams {
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  estado?: 'pendiente' | 'pagada' | 'parcialmente_pagada' | 'vencida' | 'cancelada' | 'all';
  diasVencimiento?: number;
  format?: 'json' | 'pdf' | 'excel';
}

export const getCarteraReport = async (params: CarteraParams): Promise<CarteraReportData> => {
  const url = new URL(`${BASE_URL}/reportes/cartera`);
  if (params.desde) url.searchParams.set('desde', params.desde);
  if (params.hasta) url.searchParams.set('hasta', params.hasta);
  if (params.estado && params.estado !== 'all') url.searchParams.set('estado', params.estado);
  if (typeof params.diasVencimiento === 'number') url.searchParams.set('diasVencimiento', String(params.diasVencimiento));
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al obtener reporte de cartera');

  const payload = (data && data.data !== undefined) ? data.data : data;

  // Backend actual: { filtros, totalesGenerales, cartera: [{ cliente, facturas[], totalFacturado, ... }] }
  const cartera = Array.isArray(payload?.cartera) ? payload.cartera : [];

  const items: CarteraReportItem[] = [];
  let facturasPendientes = 0;
  let facturasVencidas = 0;

  cartera.forEach((entry: any) => {
    const cliente = entry?.cliente || {};
    const facturas = Array.isArray(entry?.facturas) ? entry.facturas : [];
    facturasPendientes += Number(entry?.facturasPendientes || 0);
    facturasVencidas += Number(entry?.facturasVencidas || 0);
    facturas.forEach((f: any) => {
      items.push({
        id: f.id,
        numeroFactura: f.numeroFactura,
        clienteNombre: cliente?.nombre || '-',
        estado: f.estado,
        total: Number(f.total || 0),
        saldoPendiente: Number(f.saldoPendiente || 0),
        diasVencido: (typeof f.diasVencido === 'number') ? f.diasVencido : undefined,
        fechaEmision: f.fechaEmision,
        fechaVencimiento: f.fechaVencimiento,
      });
    });
  });

  const totales = payload?.totalesGenerales || {};
  const summary = {
    totalFacturado: Number(totales.totalFacturado || 0),
    totalAbonado: Number(totales.totalAbonado || 0),
    totalPendiente: Number(totales.saldoPendiente || 0),
    facturasPendientes,
    facturasVencidas,
  };

  return { items, summary } as CarteraReportData;
};

export const getFacturasVencidas = async (diasVencimiento: number): Promise<CarteraReportData> => {
  const url = new URL(`${BASE_URL}/reportes/facturas-vencidas`);
  url.searchParams.set('diasVencimiento', String(diasVencimiento));

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al obtener facturas vencidas');
  const payload = (data && data.data !== undefined) ? data.data : data;
  const items = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
  const summary = payload?.summary || { totalFacturado: 0, totalPendiente: 0, totalAbonado: 0, facturasPendientes: 0, facturasVencidas: items.length };
  return { items, summary } as CarteraReportData;
};

export const getAnalisisPagos = async (params: { desde?: string; hasta?: string; metodoPago?: 'Efectivo' | 'Nequi' | 'Transferencia' | 'all' }): Promise<any> => {
  const url = new URL(`${BASE_URL}/reportes/analisis-pagos`);
  if (params.desde) url.searchParams.set('desde', params.desde);
  if (params.hasta) url.searchParams.set('hasta', params.hasta);
  if (params.metodoPago && params.metodoPago !== 'all') url.searchParams.set('metodoPago', params.metodoPago);
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error en análisis de pagos');
  return (data && data.data !== undefined) ? data.data : data;
};

export const exportCartera = async (params: CarteraParams): Promise<Blob> => {
  const url = new URL(`${BASE_URL}/reportes/cartera`);
  if (params.desde) url.searchParams.set('desde', params.desde);
  if (params.hasta) url.searchParams.set('hasta', params.hasta);
  if (params.estado && params.estado !== 'all') url.searchParams.set('estado', params.estado);
  if (typeof params.diasVencimiento === 'number') url.searchParams.set('diasVencimiento', String(params.diasVencimiento));
  url.searchParams.set('format', params.format || 'pdf');

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(err || 'Error al exportar reporte de cartera');
  }
  const blob = await res.blob();
  return blob;
};


