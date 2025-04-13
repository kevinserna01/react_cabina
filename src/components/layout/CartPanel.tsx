import { Minus, Plus, ShoppingCart, User, X } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../../store/cartStore';

// Función para formatear el precio en COP
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

interface CustomerData {
  name: string;
  document: string;
}

const CartPanel = () => {
  const { items, total, updateQuantity, removeItem, setCustomer, clearCart } = useCartStore();
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({ name: '', document: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'efectivo' | 'nequi' | 'transferencia' | ''>('');

  const handleCustomerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateSale = async () => {
    if (!selectedPaymentMethod) {
      setError('Por favor seleccione un método de pago');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const saleData = {
        productos: items.map(item => ({
          code: item.product.code,
          cantidad: item.quantity
        })),
        metodoPago: selectedPaymentMethod,
        cliente: customerData.name ? {
          nombre: customerData.name,
          documento: customerData.document
        } : null
      };

      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/createSaleapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(saleData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al procesar la venta');
      }

      // Limpiar el carrito y cerrar el modal
      clearCart();
      setIsPaymentModalOpen(false);
      setSelectedPaymentMethod('');
      setCustomerData({ name: '', document: '' });
      setCustomer(null);

      // Mostrar mensaje de éxito (puedes implementar un toast o alert aquí)
      alert('Venta realizada con éxito');

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomerSelect = (withCustomer: boolean) => {
    if (!withCustomer) {
      setCustomer(null);
      setCustomerData({ name: '', document: '' });
    }
    setIsCustomerModalOpen(false);
  };

  return (
    <div className="w-96 h-full bg-white shadow-lg flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Carrito de Compra
          </h2>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Limpiar
            </button>
          )}
        </div>

        <button 
          onClick={() => setIsCustomerModalOpen(true)}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <User className="h-5 w-5 mr-2" />
          {customerData.name ? customerData.name : 'Cliente'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            El carrito está vacío
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.product.id} className="flex items-center space-x-4">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.product.price)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-medium">Total:</span>
            <span className="text-lg font-bold">{formatPrice(total)}</span>
          </div>
          <button 
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      )}

      {/* Modal de Selección de Cliente */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Datos del Cliente</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={customerData.name}
                  onChange={handleCustomerDataChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                  Documento
                </label>
                <input
                  type="text"
                  id="document"
                  name="document"
                  value={customerData.document}
                  onChange={handleCustomerDataChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => handleCustomerSelect(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setCustomer({ name: customerData.name, document: customerData.document });
                    setIsCustomerModalOpen(false);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  disabled={!customerData.name || !customerData.document}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Método de Pago */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Método de Pago</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-3">
              {['efectivo', 'nequi', 'transferencia'].map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedPaymentMethod(method as any)}
                  className={`w-full px-4 py-3 border rounded-md text-left font-medium ${
                    selectedPaymentMethod === method
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedPaymentMethod('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSale}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={!selectedPaymentMethod || isLoading}
              >
                {isLoading ? 'Procesando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel; 