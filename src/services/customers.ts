import { CustomerEntity, PaginatedResponse, PaginationInfo, TipoCliente, TipoIdentificacion } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: 'activo' | 'inactivo' | 'all';
}

export interface CreateCustomerBody {
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  nombre: string;
  email: string;
  telefono: string;
  departamento?: string;
  ciudad?: string;
  ubicacionLocal?: string;
  tipoCliente: TipoCliente;
  descuentoPersonalizado?: number;
}

export type UpdateCustomerBody = Partial<CreateCustomerBody> & { estado?: 'activo' | 'inactivo' };

export const listCustomers = async (
  params: ListCustomersParams = {}
): Promise<PaginatedResponse<CustomerEntity>> => {
  const url = new URL(`${BASE_URL}/clientes`);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.search) url.searchParams.set('search', params.search);
  if (params.estado) url.searchParams.set('estado', params.estado);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });

  // Manejo de 204 (sin contenido)
  if (res.status === 204) {
    return {
      status: 'Success',
      message: 'Sin contenido',
      data: {
        items: [],
        pagination: {
          page: params.page || 1,
          limit: params.limit || 10,
          total: 0,
          pages: 1,
        },
      },
    };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al listar clientes');

  // Soportar diferentes formatos de respuesta
  const payload = (data && data.data !== undefined) ? data.data : data;

  let items: CustomerEntity[] = [];
  let pagination: PaginationInfo = {
    page: params.page || 1,
    limit: params.limit || 10,
    total: 0,
    pages: 1,
  };

  if (Array.isArray(payload)) {
    // data es un array simple de clientes
    items = payload as CustomerEntity[];
    pagination = {
      page: params.page || 1,
      limit: params.limit || 10,
      total: items.length,
      pages: 1,
    };
  } else if (payload && Array.isArray(payload.items)) {
    // data.items y posiblemente data.pagination
    items = payload.items as CustomerEntity[];
    const p = payload.pagination || {};
    const page = Number(p.page || params.page || 1);
    const limit = Number(p.limit || params.limit || 10);
    const total = Number(p.total || items.length || 0);
    const pages = Number(p.pages || (total && limit ? Math.max(1, Math.ceil(total / limit)) : 1));
    pagination = { page, limit, total, pages };
  } else if (payload && Array.isArray((payload as any).clientes)) {
    // data.clientes y data.pagination (formato reportado actualmente por backend)
    const pld: any = payload;
    items = pld.clientes as CustomerEntity[];
    const p = pld.pagination || {};
    const page = Number(p.page || params.page || 1);
    const limit = Number(p.limit || params.limit || 10);
    const total = Number(p.total || items.length || 0);
    const pages = Number(p.pages || (total && limit ? Math.max(1, Math.ceil(total / limit)) : 1));
    pagination = { page, limit, total, pages };
  } else {
    // Forma desconocida o sin datos
    items = [];
    pagination = {
      page: params.page || 1,
      limit: params.limit || 10,
      total: 0,
      pages: 1,
    };
  }

  return {
    status: data?.status || 'Success',
    message: data?.message || 'OK',
    data: { items, pagination },
  };
};

export const getCustomerById = async (id: string): Promise<CustomerEntity> => {
  const res = await fetch(`${BASE_URL}/clientes/${id}`, { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error al obtener cliente');
  return data as CustomerEntity;
};

export const searchCustomers = async (
  q: string,
  tipo: TipoCliente | 'all' = 'all'
): Promise<CustomerEntity[]> => {
  const url = new URL(`${BASE_URL}/clientes/search`);
  url.searchParams.set('q', q);
  if (tipo && tipo !== 'all') url.searchParams.set('tipo', tipo);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error al buscar clientes');
  return data as CustomerEntity[];
};

export const createCustomer = async (body: CreateCustomerBody): Promise<CustomerEntity> => {
  const res = await fetch(`${BASE_URL}/clientes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al crear cliente');
  return data as CustomerEntity;
};

export const updateCustomer = async (id: string, body: UpdateCustomerBody): Promise<CustomerEntity> => {
  const res = await fetch(`${BASE_URL}/clientes/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al actualizar cliente');
  return data as CustomerEntity;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/clientes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al eliminar cliente');
  }
};


