import { useState, useEffect } from 'react';
import SearchBar from '../components/sales/SearchBar';
import ProductCard from '../components/sales/ProductCard';
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

  const updateProductStock = (productId: string, quantity: number) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.id === productId 
          ? { ...p, stock: p.stock + quantity } 
          : p
      )
    );
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getProductsWithStockapi', {
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
            id: item.code, // Usamos el código como ID
            name: item.nombre,
            code: item.code,
            price: item.precio,
            stock: item.stock,
            category: item.categoria
          }));
          setProducts(formattedProducts);
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

    fetchProducts();
  }, []);

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

  const handleAdminAccess = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white shadow w-full">
        <div className="flex flex-col sm:flex-row w-full items-center justify-between py-4 pl-4 pr-4 sm:pl-6 sm:pr-8 gap-y-2 sm:gap-y-0">
          {/* Logo, nombre papelería y usuario */}
          <div className="flex items-center flex-1 min-w-0 gap-1 w-full sm:w-auto">
            <img src="/assets/logo.png" alt="Logo Papelería" className="h-16 w-16 object-contain" />
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-2xl font-bold text-gray-900 truncate" aria-label="Nombre de la papelería">La Cabina Telecomunicaciones</span>
              <span className="text-sm text-gray-600 truncate" aria-label="Nombre del usuario">{userName}</span>
            </div>
          </div>
          {/* Contador de sesión y logout */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <span className="text-sm text-gray-600" aria-label="Tiempo de sesión">{formatSessionTime(sessionSeconds)}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              aria-label="Cerrar sesión"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLogout(); }}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden w-full">
        <main className="flex-1 p-4 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto">
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <div className="mb-6">
              <SearchBar
                products={products}
                onProductSelect={handleProductSelect}
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleProductSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="w-full sm:w-96 border-t sm:border-t-0 sm:border-l border-gray-200 order-last sm:order-none bg-white">
          <CartPanel onStockUpdate={updateProductStock} />
        </aside>
      </div>

      <div className="fixed bottom-4 sm:bottom-8 left-1/2 sm:left-auto right-auto sm:right-8 transform -translate-x-1/2 sm:translate-x-0 z-50">
        <button
          onClick={handleAdminAccess}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Acceder al panel de administración"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAdminAccess(); }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Admin</span>
        </button>
      </div>
    </div>
  );
};

export default SalesDashboard; 