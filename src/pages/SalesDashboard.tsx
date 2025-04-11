import Navbar from '../components/layout/Navbar';
import SearchBar from '../components/sales/SearchBar';
import ProductCard from '../components/sales/ProductCard';
import CartPanel from '../components/layout/CartPanel';
import { useCartStore } from '../store/cartStore';
import { Product } from '../types';
import { useNavigate } from 'react-router-dom';

// Mock data - Replace with your actual data source
const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Cuaderno Universitario',
    code: 'CU001',
    price: 3.50,
    stock: 50,
    category: 'Cuadernos'
  },
  {
    id: '2',
    name: 'Lápiz 2B',
    code: 'LP002',
    price: 0.75,
    stock: 100,
    category: 'Útiles'
  },
  // Add more mock products as needed
];

const SalesDashboard = () => {
  const { addItem } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Implement logout logic
    console.log('Logout clicked');
  };

  const handleProductSelect = (product: Product) => {
    addItem(product);
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
            <div className="mb-6">
              <SearchBar
                products={MOCK_PRODUCTS}
                onProductSelect={handleProductSelect}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MOCK_PRODUCTS.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleProductSelect}
                />
              ))}
            </div>
          </div>
        </main>

        <aside className="border-l border-gray-200">
          <CartPanel />
        </aside>
      </div>

      {/* Botón de acceso a administración */}
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