import { useState, useEffect } from 'react';
import CartPanel from '../components/layout/CartPanel';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { useNavigate } from 'react-router-dom';
import React from 'react';

const SalesDashboard = () => {
  const { addItem } = useCartStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [userName, setUserName] = useState<string>('');
  
  // Estados para paginación y búsqueda de productos
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const updateProductStock = (productId: string, quantity: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? { ...p, stock: p.stock + quantity } 
          : p
      )
    );
  };

  // Función para cargar productos con paginación y búsqueda
  const fetchProducts = async (page: number = 1, search: string = '') => {
      setIsLoading(true);
      setError(null);
      try {
      // Construir URL con parámetros de paginación y búsqueda
      const url = new URL('https://back-papeleria-two.vercel.app/v1/papeleria/getProductsWithStockapi');
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', itemsPerPage.toString());
      if (search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Error al cargar los productos');
        }

        const result = await response.json();

        if (result.status === "Success") {
          // Mapear los datos al formato esperado por el componente
          const formattedProducts = result.data.map((item: any) => ({
          id: item.code,
            name: item.nombre,
            code: item.code,
          price: Number(item.salePrice ?? item.precio ?? item.price ?? 0),
          costPrice: item.precioCosto ?? item.costPrice ?? undefined,
          salePrice: item.salePrice ?? item.precio ?? undefined,
          profitMargin: item.margenGanancia ?? undefined,
            stock: item.stock,
          category: item.categoria,
        }));

        // Ordenar productos
        const sortedProducts = formattedProducts.sort((a: Product, b: Product) => {
          let aValue: any, bValue: any;
          
          switch (sortBy) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'code':
              aValue = a.code.toLowerCase();
              bValue = b.code.toLowerCase();
              break;
            case 'price':
              aValue = a.price;
              bValue = b.price;
              break;
            case 'stock':
              aValue = a.stock;
              bValue = b.stock;
              break;
            default:
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
          }

          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
        });

        setProducts(sortedProducts);
        setCurrentPage(page);
        setTotalPages(result.pagination?.pages || 1);
        setTotalProducts(result.pagination?.total || result.data.length);
        } else {
          throw new Error(result.message || 'Error al cargar los productos');
        }
      } catch (error) {
        console.error('Error:', error);
        setError(error instanceof Error ? error.message : 'Error al cargar los productos');
      } finally {
        setIsLoading(false);
      }
    };

  // Función para manejar búsqueda con debounce
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Crear nuevo timeout para debounce
    const timeout = setTimeout(() => {
      fetchProducts(1, term);
    }, 500);
    
    setSearchTimeout(timeout);
  };

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchProducts(page, searchTerm);
    }
  };

  // Función para cambiar ordenamiento
  const handleSort = (field: 'name' | 'code' | 'price' | 'stock') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    fetchProducts(1, '');
  }, [sortBy, sortOrder]);

  // Obtener nombre del usuario al montar
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.name || '');
      } catch {
        setUserName('');
      }
    }
  }, []);

  // Contador de sesión
  React.useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatSessionTime = (seconds: number) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatPrice = (value: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const handleProductSelect = (product: Product) => {
    if (product.stock > 0) {
      // Actualizar el stock en el estado local
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === product.id 
            ? { ...p, stock: p.stock - 1 } 
            : p
        )
      );
      // Agregar al carrito
      addItem(product);
    }
  };


  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow w-full">
        <div className="flex flex-col sm:flex-row w-full items-center justify-between py-3 sm:py-4 pl-3 pr-3 sm:pl-6 sm:pr-8 gap-y-2 sm:gap-y-0">
          {/* Logo, nombre papelería y usuario */}
          <div className="flex items-center flex-1 min-w-0 gap-1 w-full sm:w-auto">
            <img src="/assets/logo.png" alt="Logo Papelería" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-lg sm:text-2xl font-bold text-gray-900 truncate" aria-label="Nombre de la papelería">
                <span className="hidden sm:inline">La Cabina Telecomunicaciones</span>
                <span className="sm:hidden">La Cabina</span>
              </span>
              <span className="text-xs sm:text-sm text-gray-600 truncate" aria-label="Nombre del usuario">{userName}</span>
            </div>
          </div>
          {/* Contador de sesión y logout */}
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            <span className="text-xs sm:text-sm text-gray-600" aria-label="Tiempo de sesión">{formatSessionTime(sessionSeconds)}</span>
            <button
              onClick={handleLogout}
              className="px-2 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 text-xs sm:text-sm"
              aria-label="Cerrar sesión"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLogout(); }}
            >
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full">
        <main className="flex-1 p-2 sm:p-4 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Barra de búsqueda mejorada */}
            <div className="mb-4 sm:mb-6">
              <div className="relative">
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Buscar productos por nombre, código o categoría..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {searchTerm && (
                      <button
                        onClick={() => handleSearch('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="name">Ordenar por nombre</option>
                      <option value="code">Ordenar por código</option>
                      <option value="price">Ordenar por precio</option>
                      <option value="stock">Ordenar por stock</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
                
                {/* Información de resultados */}
                {totalProducts > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <span>
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalProducts)} de {totalProducts} productos
                    </span>
                    {searchTerm && (
                      <span className="text-indigo-600">
                        Resultados para: "{searchTerm}"
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin productos</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'No se encontraron productos con ese criterio de búsqueda.' : 'No hay productos disponibles.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('code')}
                            >
                              <div className="flex items-center">
                                Código
                                {sortBy === 'code' && (
                                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center">
                                Producto
                                {sortBy === 'name' && (
                                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('price')}
                            >
                              <div className="flex items-center">
                                Precio
                                {sortBy === 'price' && (
                                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th 
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSort('stock')}
                            >
                              <div className="flex items-center">
                                Stock
                                {sortBy === 'stock' && (
                                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                )}
                              </div>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900 font-mono">{product.code}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={product.name}>
                                {product.name}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">{product.category || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900 font-medium">{formatPrice(product.price)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  product.stock <= 0 
                                    ? 'bg-red-100 text-red-800' 
                                    : product.stock <= 5 
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                }`}>
                                  {product.stock}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <button
                                  onClick={() => handleProductSelect(product)}
                                  disabled={product.stock <= 0}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    product.stock <= 0 
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                                  }`}
                                  aria-label={`Agregar ${product.name} al carrito`}
                                >
                                  {product.stock <= 0 ? 'Sin stock' : 'Agregar'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Anterior
                          </button>
                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Siguiente
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700">
                              Página <span className="font-medium">{currentPage}</span> de{' '}
                              <span className="font-medium">{totalPages}</span>
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                              <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Anterior</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                              
                              {/* Números de página */}
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const startPage = Math.max(1, currentPage - 2);
                                const pageNum = startPage + i;
                                if (pageNum > totalPages) return null;
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                      pageNum === currentPage
                                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                              
                              <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <span className="sr-only">Siguiente</span>
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 order-last lg:order-none bg-white h-96 lg:h-full">
          <CartPanel onStockUpdate={updateProductStock} />
        </aside>
      </div>

    </div>
  );
};

export default SalesDashboard; 