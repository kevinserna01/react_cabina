const BASE_URL = 'https://back-papeleria-two.vercel.app/v1/papeleria';

const getAuthHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
});

export interface CategoryEntity {
  id: string;
  name: string;
  description?: string;
}

export const createCategory = async (body: { name: string; description?: string }): Promise<CategoryEntity> => {
  const res = await fetch(`${BASE_URL}/categorias`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al crear categoría');
  return (data?.data || data) as CategoryEntity;
};

export const listCategories = async (): Promise<CategoryEntity[]> => {
  const res = await fetch(`${BASE_URL}/categorias`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data?.message || 'Error al listar categorías');
  return (data?.data || data) as CategoryEntity[];
};

export const updateCategory = async (id: string, body: { name?: string; description?: string }): Promise<CategoryEntity> => {
  const res = await fetch(`${BASE_URL}/categorias/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Error al actualizar categoría');
  return (data?.data || data) as CategoryEntity;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/categorias/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Error al eliminar categoría');
  }
};


