import React, { useEffect, useState } from 'react';
import { CustomerEntity, PaginationInfo, TipoCliente, TipoIdentificacion } from '../../types';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer, CreateCustomerBody, UpdateCustomerBody } from '../../services/customers';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;

const defaultLimit = 10;

const CustomersContent: React.FC = () => {
  const [items, setItems] = useState<CustomerEntity[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: defaultLimit, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<'activo' | 'inactivo' | 'all'>('activo');
  const [tipoFilter, setTipoFilter] = useState<TipoCliente | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<CreateCustomerBody>({
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '',
    nombre: '',
    email: '',
    telefono: '',
    departamento: '',
    ciudad: '',
    ubicacionLocal: '',
    tipoCliente: 'individual',
    descuentoPersonalizado: 0,
  });

  const debouncedSearch = useDebounce(search, 400);

  const fetchData = async (page = pagination.page, limit = pagination.limit) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listCustomers({ page, limit, search: debouncedSearch || undefined, estado });
      let list = res.data.items;
      if (tipoFilter !== 'all') {
        list = list.filter((c) => c.tipoCliente === tipoFilter);
      }
      setItems(list);
      setPagination(res.data.pagination);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al cargar clientes';
      if (msg.toLowerCase().includes('token') || msg.includes('401')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pagination.limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, estado, tipoFilter]);

  const handleOpenCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm({
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '',
      nombre: '',
      email: '',
      telefono: '',
      departamento: '',
      ciudad: '',
      ubicacionLocal: '',
      tipoCliente: 'individual',
      descuentoPersonalizado: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: CustomerEntity) => {
    setMode('edit');
    setEditingId(c.id);
    setForm({
      tipoIdentificacion: c.tipoIdentificacion,
      numeroIdentificacion: c.numeroIdentificacion,
      nombre: c.nombre,
      email: c.email || '',
      telefono: c.telefono || '',
      departamento: c.departamento || '',
      ciudad: c.ciudad || '',
      ubicacionLocal: c.ubicacionLocal || '',
      tipoCliente: c.tipoCliente,
      descuentoPersonalizado: c.descuentoPersonalizado || 0,
    });
    setIsModalOpen(true);
  };

  const validateForm = (): string | null => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio';
    if (!form.numeroIdentificacion.trim()) return 'El número de identificación es obligatorio';
    if (!form.tipoIdentificacion) return 'El tipo de identificación es obligatorio';
    if (!emailRegex.test(form.email)) return 'Correo electrónico inválido';
    if (!phoneRegex.test(form.telefono)) return 'Teléfono inválido (10 dígitos)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateForm();
    if (validation) {
      setError(validation);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'create') {
        await createCustomer(form);
      } else if (editingId) {
        const body: UpdateCustomerBody = { ...form };
        await updateCustomer(editingId, body);
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al guardar cliente';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteCustomer(id);
      await fetchData();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar cliente';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    fetchData(nextPage, pagination.limit);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    fetchData(1, newLimit);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white light:text-gray-800">Clientes</h1>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Crear cliente"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenCreate(); }}
        >
          Nuevo Cliente
        </button>
      </div>

      <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow p-4 border dark:border-white/20 light:border-gray-200">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nombre, documento, email o ciudad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
              aria-label="Filtrar por estado"
            >
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
              <option value="all">Todos</option>
            </select>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md"
              aria-label="Filtrar por tipo de cliente"
            >
              <option value="all">Todos</option>
              <option value="individual">Individual</option>
              <option value="empresa">Empresa</option>
              <option value="mayorista">Mayorista</option>
            </select>
            <select
              value={pagination.limit}
              onChange={handleLimitChange}
              className="px-3 py-2 border border-gray-300 rounded-md"
              aria-label="Filas por página"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow overflow-hidden border dark:border-white/20 light:border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y dark:divide-white/10 light:divide-gray-200">
            <thead className="dark:bg-white/5 light:bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Ciudad</th>
                <th className="px-6 py-3 text-right text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="dark:bg-transparent light:bg-white divide-y dark:divide-white/10 light:divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center dark:text-white/70 light:text-gray-500">Cargando...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center dark:text-white/70 light:text-gray-500">No hay clientes</td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="dark:hover:bg-white/5 light:hover:dark:bg-white/5 light:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white light:text-gray-900">{c.nombre}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">{c.tipoIdentificacion}-{c.numeroIdentificacion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500 capitalize">{c.tipoCliente}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">{c.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">{c.telefono}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">{c.ciudad || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`Editar ${c.nombre}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`Eliminar ${c.nombre}`}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 dark:bg-white/5 light:bg-gray-50 flex items-center justify-between">
          <span className="text-sm dark:text-white/80 light:text-gray-600">
            Página {pagination.page} de {Math.max(1, pagination.pages)} — {pagination.total} registros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page <= 1}
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={pagination.page >= pagination.pages}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">{error}</div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[90]" role="dialog" aria-modal="true">
          <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border dark:border-white/20 light:border-gray-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold dark:text-white light:text-gray-900">{mode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="dark:text-white/70 light:text-gray-500 hover:dark:text-white/90 light:text-gray-700" aria-label="Cerrar">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Tipo Identificación</label>
                  <select
                    value={form.tipoIdentificacion}
                    onChange={(e) => setForm({ ...form, tipoIdentificacion: e.target.value as TipoIdentificacion })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="CC">CC</option>
                    <option value="NIT">NIT</option>
                    <option value="CE">CE</option>
                    <option value="TI">TI</option>
                    <option value="RC">RC</option>
                    <option value="PAS">PAS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Número Identificación</label>
                  <input
                    type="text"
                    value={form.numeroIdentificacion}
                    onChange={(e) => setForm({ ...form, numeroIdentificacion: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={form.departamento || ''}
                    onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={form.ciudad || ''}
                    onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={form.ubicacionLocal || ''}
                    onChange={(e) => setForm({ ...form, ubicacionLocal: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Tipo de Cliente</label>
                  <select
                    value={form.tipoCliente}
                    onChange={(e) => setForm({ ...form, tipoCliente: e.target.value as TipoCliente })}
                    className="w-full px-3 py-2 border rounded"
                    required
                  >
                    <option value="individual">Individual</option>
                    <option value="empresa">Empresa</option>
                    <option value="mayorista">Mayorista</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium dark:text-white/90 light:text-gray-700 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.descuentoPersonalizado || 0}
                    onChange={(e) => setForm({ ...form, descuentoPersonalizado: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const useDebounce = <T,>(value: T, delay = 400): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export default CustomersContent;


