import { Product } from '../types';

const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export interface NewProductBody {
  name: string;
  code: string;
  costPrice: number;
  salePrice: number;
  category?: string;
  description?: string;
  createNewCategory?: boolean;
}

export interface UpdateProductBody {
  code: string;
  costPrice?: number;
  salePrice?: number;
  category?: string;
  description?: string;
  createNewCategory?: boolean;
}

export const createProduct = async (body: NewProductBody): Promise<Product> => {
  if (body.costPrice < 0 || body.salePrice < 0) throw new Error('Los precios no pueden ser negativos');
  if (body.salePrice < body.costPrice) throw new Error('El precio de venta no puede ser menor al precio de costo');

  const res = await fetch(`${BASE_URL}/newproductapi`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al crear producto');
  return (data?.data || data) as Product;
};

export const updateProduct = async (body: UpdateProductBody): Promise<Product> => {
  if (typeof body.costPrice === 'number' && body.costPrice < 0) throw new Error('El precio de costo no puede ser negativo');
  if (typeof body.salePrice === 'number' && body.salePrice < 0) throw new Error('El precio de venta no puede ser negativo');
  if (typeof body.salePrice === 'number' && typeof body.costPrice === 'number' && body.salePrice < body.costPrice) {
    throw new Error('El precio de venta no puede ser menor al precio de costo');
  }

  const res = await fetch(`${BASE_URL}/updateProductapi`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al actualizar producto');
  return (data?.data || data?.producto || data) as Product;
};


