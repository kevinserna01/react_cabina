import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import SearchBar from '../components/sales/SearchBar';
import ProductCard from '../components/sales/ProductCard';
import CartPanel from '../components/layout/CartPanel';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { useNavigate } from 'react-router-dom';

const SalesDashboard = () => {
  const { addItem } = useCartStore();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleProductSelect = (product: Product) => {
    if (product.stock > 0) {
      addItem(product);
    }
  };

  const handleAdminAccess = () => {
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Navbar onLogout={handleLogout} />
      
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-4 overflow-y-auto">
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

        <aside className="border-l border-gray-200">
          <CartPanel />
        </aside>
      </div>

      <div className="fixed bottom-8 right-8">
        <button
          onClick={handleAdminAccess}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          aria-label="Acceder al panel de administración"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
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