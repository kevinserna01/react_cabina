import { PaymentEntity } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export const createPayment = async (
  body: {
    facturaId: string;
    montoAbono: number;
    metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia';
    observaciones?: string;
    usuarioRegistra?: string;
  }
): Promise<PaymentEntity> => {
  const res = await fetch(`${BASE_URL}/abonos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al registrar abono');
  return data as PaymentEntity;
};

export const listPaymentsByInvoice = async (
  facturaId: string
): Promise<PaymentEntity[]> => {
  const res = await fetch(`${BASE_URL}/abonos/factura/${facturaId}`, { headers: getAuthHeaders() });
  if (res.status === 204) return [];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || 'Error al obtener abonos de la factura');

  // Normalizar formatos: [], { data: [] }, { data: { abonos: [] } }, { abonos: [] }
  const payload = (data && (data as any).data !== undefined) ? (data as any).data : data;
  if (Array.isArray(payload)) return payload as PaymentEntity[];
  if (payload && Array.isArray((payload as any).items)) return (payload as any).items as PaymentEntity[];
  if (payload && Array.isArray((payload as any).abonos)) return (payload as any).abonos as PaymentEntity[];
  return [];
};

export const listPaymentsByCustomer = async (
  clienteId: string,
  params: { desde?: string; hasta?: string } = {}
): Promise<PaymentEntity[]> => {
  const url = new URL(`${BASE_URL}/abonos/cliente/${clienteId}`);
  if (params.desde) url.searchParams.set('desde', params.desde);
  if (params.hasta) url.searchParams.set('hasta', params.hasta);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  if (res.status === 204) return [];
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || 'Error al obtener abonos del cliente');

  const payload = (data && (data as any).data !== undefined) ? (data as any).data : data;
  if (Array.isArray(payload)) return payload as PaymentEntity[];
  if (payload && Array.isArray((payload as any).items)) return (payload as any).items as PaymentEntity[];
  if (payload && Array.isArray((payload as any).abonos)) return (payload as any).abonos as PaymentEntity[];
  return [];
};


