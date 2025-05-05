import { Minus, Plus, ShoppingCart, User, X, CreditCard, Receipt } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { Product } from '../../types';

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
  email: string;
  phone: string;
}

interface ExistingCustomer {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
}

// Función para verificar y reservar un código de venta
const checkAndReserveSaleCode = async (code: string): Promise<boolean> => {
  try {
    const response = await fetch(`https://back-papeleria-two.vercel.app/v1/papeleria/checkAndReserveSaleCodeapi/${code}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al verificar y reservar el código de venta');
    }
    
    const result = await response.json();
    return result.reserved;
  } catch (error) {
    console.error('Error checking and reserving sale code:', error);
    return false;
  }
};

// Función para liberar un código de venta reservado
const releaseSaleCode = async (code: string): Promise<void> => {
  try {
    await fetch(`https://back-papeleria-two.vercel.app/v1/papeleria/releaseSaleCodeapi/${code}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  } catch (error) {
    console.error('Error releasing sale code:', error);
  }
};

// Función para obtener el último código de venta registrado
const getLastRegisteredSaleCode = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/getLastSaleCodeapi', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener el último código de venta');
    }
    
    const result = await response.json();
    return result.lastCode;
  } catch (error) {
    console.error('Error getting last sale code:', error);
    return null;
  }
};

// Función para generar el código de venta
const generateSaleCode = async (): Promise<string> => {
  try {
    // Obtener el último código registrado del backendd
    const lastCode = await getLastRegisteredSaleCode();
    let nextNumber = 1;

    if (lastCode) {
      const lastNumber = parseInt(lastCode.split('-')[1]);
      nextNumber = lastNumber + 1;
    }

    let code = `VTA-${String(nextNumber).padStart(3, '0')}`;
    let codeReserved = await checkAndReserveSaleCode(code);

    // Si el código no está disponible, buscar el siguiente disponible
    while (!codeReserved) {
      nextNumber++;
      code = `VTA-${String(nextNumber).padStart(3, '0')}`;
      codeReserved = await checkAndReserveSaleCode(code);
    }

    return code;
  } catch (error) {
    console.error('Error generating sale code:', error);
    throw error;
  }
};

interface CartPanelProps {
  onStockUpdate: (productId: string, quantity: number) => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ onStockUpdate }) => {
  const { items, total, updateQuantity, removeItem, setCustomer, clearCart } = useCartStore();
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<CustomerData>({ 
    name: '', 
    document: '', 
    email: '', 
    phone: '' 
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Nequi' | 'Transferencia' | ''>('');
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [isWithoutCustomer, setIsWithoutCustomer] = useState(false);
  const [saleCode, setSaleCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [searchDocument, setSearchDocument] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Efecto para liberar el código cuando se cierra el modal sin completar la venta
  useEffect(() => {
    return () => {
      if (saleCode && !isCheckoutModalOpen) {
        releaseSaleCode(saleCode);
      }
    };
  }, [saleCode, isCheckoutModalOpen]);

  // Efecto para generar nuevo código cuando se abre el modal
  useEffect(() => {
    const generateNewCode = async () => {
      if (isCheckoutModalOpen && !saleCode) {
        setIsGeneratingCode(true);
        try {
          const newCode = await generateSaleCode();
          setSaleCode(newCode);
        } catch (error) {
          console.error('Error generating sale code:', error);
          setError('Error al generar el código de venta');
        } finally {
          setIsGeneratingCode(false);
        }
      }
    };

    generateNewCode();
  }, [isCheckoutModalOpen, saleCode]);

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

    // Validar datos del cliente si se está registrando uno
    if (customerData.name && (!customerData.email || !customerData.phone)) {
      setError('Por favor complete todos los datos del cliente');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const saleData = {
        code: saleCode,
        productos: items.map(item => ({
          code: item.product.code,
          cantidad: item.quantity
        })),
        metodoPago: selectedPaymentMethod,
        cliente: customerData.name ? {
          nombre: customerData.name,
          documento: customerData.document,
          email: customerData.email,
          telefono: customerData.phone
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
      setIsCheckoutModalOpen(false);
      setSelectedPaymentMethod('');
      setCustomerData({ name: '', document: '', email: '', phone: '' });
      setCustomer(null);
      setSaleCode('');

      // Mostrar mensaje de éxito
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
      setCustomerData({ name: '', document: '', email: '', phone: '' });
      setIsWithoutCustomer(true);
      setIsCustomerFormOpen(false);
    } else {
      setIsWithoutCustomer(false);
      setIsCustomerFormOpen(true);
    }
  };

  const handleSaveCustomer = () => {
    if (customerData.name && customerData.document && customerData.email && customerData.phone) {
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerData.email)) {
        setError('Por favor ingrese un correo electrónico válido');
        return;
      }

      // Validar formato de teléfono (10 dígitos)
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(customerData.phone)) {
        setError('Por favor ingrese un número de teléfono válido (10 dígitos)');
        return;
      }

      setCustomer({ 
        name: customerData.name, 
        document: customerData.document,
        email: customerData.email,
        phone: customerData.phone
      });
      setIsCustomerFormOpen(false);
      setIsWithoutCustomer(false);
    } else {
      setError('Por favor complete todos los campos del cliente');
    }
  };

  const handleQuantityChange = (product: Product, newQuantity: number) => {
    const oldQuantity = items.find(item => item.product.id === product.id)?.quantity || 0;
    const quantityDiff = newQuantity - oldQuantity;
    
    if (quantityDiff !== 0) {
      onStockUpdate(product.id, -quantityDiff);
      updateQuantity(product.id, newQuantity);
    }
  };

  const handleRemoveItem = (product: Product) => {
    const item = items.find(item => item.product.id === product.id);
    if (item) {
      onStockUpdate(product.id, item.quantity);
      removeItem(product.id);
    }
  };

  const handleClearCart = () => {
    items.forEach(item => {
      onStockUpdate(item.product.id, item.quantity);
    });
    clearCart();
  };

  // Función para buscar clientes por documento
  const handleSearchCustomers = async () => {
    if (!searchDocument.trim()) return;
    
    setIsLoadingCustomers(true);
    try {
      const response = await fetch(`https://back-papeleria-two.vercel.app/v1/papeleria/searchCustomersapi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documento: searchDocument.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error al buscar clientes');
      }

      const data = await response.json();
      setExistingCustomers(data);
    } catch (error) {
      console.error('Error searching customers:', error);
      setError('Error al buscar clientes');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Función para seleccionar un cliente existente
  const handleSelectExistingCustomer = (customer: ExistingCustomer) => {
    setCustomerData({
      name: customer.nombre,
      document: customer.documento,
      email: customer.email,
      phone: customer.telefono
    });
    setCustomer({
      name: customer.nombre,
      document: customer.documento,
      email: customer.email,
      phone: customer.telefono
    });
    setIsSearchingCustomer(false);
    setIsCustomerFormOpen(false);
    setIsWithoutCustomer(false);
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
              onClick={handleClearCart}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Limpiar
            </button>
          )}
        </div>
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
                    onClick={() => handleRemoveItem(item.product)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                  <button
                    onClick={() => handleQuantityChange(item.product, item.quantity - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Minus className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.product, item.quantity + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                  >
                    <Plus className="h-4 w-4 text-gray-600" />
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
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      )}

      {/* Modal de Resumen y Confirmación */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Resumen de Compra</h2>
                  <div className="mt-2 flex items-center text-gray-600">
                    <Receipt className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">
                      {isGeneratingCode ? 'Generando código...' : `Código de venta: ${saleCode}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Lista de productos (3 columnas) */}
                <div className="lg:col-span-3 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Productos</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center bg-white p-3 rounded-md shadow-sm">
                        <div>
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                        </div>
                        <p className="font-medium text-gray-900">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-lg font-medium">Total:</span>
                    <span className="text-xl font-bold text-indigo-600">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Panel lateral (2 columnas) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Selección de Cliente */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Cliente
                    </h3>
                    {!isCustomerFormOpen && !isSearchingCustomer ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => handleCustomerSelect(true)}
                          className={`w-full px-4 py-2 bg-white border rounded-md shadow-sm text-sm font-medium 
                            ${customerData.name 
                              ? 'border-indigo-500 text-indigo-700' 
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {customerData.name ? (
                            <div className="flex flex-col items-start">
                              <span className="text-xs text-gray-500">Cliente registrado</span>
                              <span className="font-medium">{customerData.name}</span>
                            </div>
                          ) : (
                            'Registrar Cliente'
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsSearchingCustomer(true);
                            setSearchDocument('');
                            setExistingCustomers([]);
                          }}
                          className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Buscar Cliente Existente
                        </button>
                        <button
                          onClick={() => handleCustomerSelect(false)}
                          className={`w-full px-4 py-2 bg-white border rounded-md shadow-sm text-sm font-medium 
                            ${isWithoutCustomer 
                              ? 'border-indigo-500 text-indigo-700 bg-indigo-50' 
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          Continuar sin Cliente
                        </button>
                      </div>
                    ) : isSearchingCustomer ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={searchDocument}
                            onChange={(e) => setSearchDocument(e.target.value)}
                            placeholder="Buscar por documento"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            onClick={handleSearchCustomers}
                            disabled={isLoadingCustomers || !searchDocument.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                          >
                            {isLoadingCustomers ? 'Buscando...' : 'Buscar'}
                          </button>
                        </div>
                        
                        {existingCustomers.length > 0 && (
                          <div className="mt-3 max-h-48 overflow-y-auto">
                            {existingCustomers.map((customer) => (
                              <button
                                key={customer.id}
                                onClick={() => handleSelectExistingCustomer(customer)}
                                className="w-full p-3 mb-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-left"
                              >
                                <div className="font-medium text-gray-900">{customer.nombre}</div>
                                <div className="text-sm text-gray-500">Documento: {customer.documento}</div>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setIsSearchingCustomer(false);
                              setSearchDocument('');
                              setExistingCustomers([]);
                            }}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          name="name"
                          placeholder="Nombre del cliente"
                          value={customerData.name}
                          onChange={handleCustomerDataChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                          type="text"
                          name="document"
                          placeholder="Documento"
                          value={customerData.document}
                          onChange={handleCustomerDataChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                          type="email"
                          name="email"
                          placeholder="Correo electrónico"
                          value={customerData.email}
                          onChange={handleCustomerDataChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <input
                          type="tel"
                          name="phone"
                          placeholder="Número de teléfono (3101234567)"
                          value={customerData.phone}
                          onChange={handleCustomerDataChange}
                          pattern="[0-9]{10}"
                          maxLength={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setIsCustomerFormOpen(false);
                              if (!customerData.name) {
                                setCustomerData({ name: '', document: '', email: '', phone: '' });
                              }
                            }}
                            className="px-3 py-1 text-gray-600 hover:text-gray-800"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleSaveCustomer}
                            disabled={!customerData.name || !customerData.document || !customerData.email || !customerData.phone}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Método de Pago */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Método de Pago
                    </h3>
                    <div className="space-y-2">
                      {['Efectivo', 'Nequi', 'Transferencia'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setSelectedPaymentMethod(method as any)}
                          className={`w-full px-4 py-3 rounded-md text-left font-medium ${
                            selectedPaymentMethod === method
                              ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Botón de Confirmación */}
                  <button
                    onClick={handleCreateSale}
                    disabled={!selectedPaymentMethod || isLoading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel; 