import { Minus, Plus, ShoppingCart, X, Receipt, Save, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { listCustomers } from '../../services/customers';
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
  tipoIdentificacion?: string;
  ciudad?: string;
  tipoCliente?: string;
  descuentoPersonalizado?: number;
}

interface ExistingCustomer {
  id: string;
  nombre: string;
  documento: string;
  email: string;
  telefono: string;
  tipoIdentificacion?: string;
  ciudad?: string;
  tipoCliente?: string;
  descuentoPersonalizado?: number;
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
    phone: '',
    tipoIdentificacion: undefined,
    ciudad: undefined,
    tipoCliente: undefined,
    descuentoPersonalizado: undefined,
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Nequi' | 'Transferencia' | ''>('');
  // Estados legacy de tarjeta de cliente ya no usados (se migró a modales)
  // Mantenerlos eliminados para evitar warnings
  const [saleCode, setSaleCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  // El flujo de búsqueda ahora vive en el modal; controlado por isFindCustomerModalOpen
  const [searchDocument, setSearchDocument] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  
  // Nuevo estado para el modal de registro de clientes
  const [isRegisterCustomerModalOpen, setIsRegisterCustomerModalOpen] = useState(false);
  const [applyCustomerDiscount, setApplyCustomerDiscount] = useState<boolean>(false);
  const [isValidatingDocument, setIsValidatingDocument] = useState(false);
  const [documentExists, setDocumentExists] = useState(false);
  const [customerValidationMessage, setCustomerValidationMessage] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Legacy: ya no se usa el formulario inline

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
      // Extraer trabajador desde usuario guardado si existe
      const userStr = localStorage.getItem('user');
      let trabajadorCorreo: string | undefined;
      try {
        if (userStr) {
          const user = JSON.parse(userStr);
          trabajadorCorreo = user?.email || user?.correo || undefined;
        }
      } catch {}

      const discountPercent = applyCustomerDiscount && typeof customerData.descuentoPersonalizado === 'number' ? customerData.descuentoPersonalizado : 0;
      const saleData: any = {
        code: saleCode,
        productos: items.map(item => ({
          code: item.product.code,
          cantidad: item.quantity,
          precioUnitario: Math.max(0, Math.round(item.product.price || 0)),
          total: Math.max(0, Math.round((item.product.price || 0) * item.quantity)),
        })),
        metodoPago: selectedPaymentMethod,
        cliente: customerData.name ? {
          name: customerData.name,
          document: customerData.document,
          email: customerData.email,
          phone: customerData.phone
        } : null,
        descuentoAplicado: discountPercent || undefined,
        totalVenta: Math.round(total),
      };
      if (trabajadorCorreo) {
        saleData.trabajador = { correo: trabajadorCorreo };
      }

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
        // Manejar diferentes tipos de errores
        if (response.status === 409) {
          throw new Error('Ya existe una venta con ese código o no hay suficiente stock');
        } else if (response.status === 404) {
          const msg = (result?.message || '').toLowerCase();
          if (msg.includes('trabajador')) {
            throw new Error('Trabajador no encontrado. Verifique el correo del trabajador.');
          }
          throw new Error('Uno o más recursos no existen (producto/cliente/trabajador).');
        } else if (response.status === 400) {
          throw new Error(result.message || 'Datos de venta inválidos');
        } else {
          throw new Error(result.message || 'Error al procesar la venta');
        }
      }

      // Limpiar el carrito y cerrar el modal
      clearCart();
      setIsCheckoutModalOpen(false);
      setSelectedPaymentMethod('');
      setCustomerData({ name: '', document: '', email: '', phone: '' });
      setCustomer(null);
      setSaleCode('');

      // Mostrar mensaje de éxito con detalles de la venta
      alert(`Venta realizada con éxito\nCódigo: ${result.data.code}\nTotal: ${formatPrice(result.data.totalVenta)}`);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar clientes (GET) para listado inicial
  const fetchCustomersList = async () => {
    setIsLoadingCustomers(true);
    setError(null);
    try {
      const res = await listCustomers({ page: 1, limit: 100, estado: 'activo' });
      const items = (res.data?.items || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        documento: c.numeroIdentificacion || c.documento || '',
        email: c.email || '',
        telefono: c.telefono || '',
        tipoIdentificacion: c.tipoIdentificacion || '',
        ciudad: c.ciudad || '',
        tipoCliente: c.tipoCliente || '',
        descuentoPersonalizado: typeof c.descuentoPersonalizado === 'number' ? c.descuentoPersonalizado : undefined,
      }));
      setExistingCustomers(items);
      if (items.length === 0) {
        setError('No hay clientes registrados');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes');
      setExistingCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Legacy inline customer selection removed (handled by modals now)

  // Legacy inline customer save removed (handled by register modal)

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

  // Función para buscar clientes por documento (GET usando listCustomers search)
  const handleSearchCustomers = async () => {
    if (!searchDocument.trim()) {
      setError('Por favor ingrese un número de documento');
      return;
    }
    
    setIsLoadingCustomers(true);
    setError(null);
    try {
      const res = await listCustomers({ page: 1, limit: 100, search: searchDocument.trim(), estado: 'all' });
      const items = (res.data?.items || []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
        documento: c.numeroIdentificacion || c.documento || '',
        email: c.email || '',
        telefono: c.telefono || '',
        tipoIdentificacion: c.tipoIdentificacion || '',
        ciudad: c.ciudad || '',
        tipoCliente: c.tipoCliente || '',
        descuentoPersonalizado: typeof c.descuentoPersonalizado === 'number' ? c.descuentoPersonalizado : undefined,
      }));
      setExistingCustomers(items);
      if (items.length === 0) {
        setError('No se encontraron clientes con ese documento');
      }
    } catch (error) {
      console.error('Error searching customers:', error);
      setError(error instanceof Error ? error.message : 'Error al buscar clientes');
      setExistingCustomers([]);
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
      phone: customer.telefono,
      tipoIdentificacion: customer.tipoIdentificacion,
      ciudad: customer.ciudad,
      tipoCliente: customer.tipoCliente,
      descuentoPersonalizado: customer.descuentoPersonalizado,
    });
    setCustomer({
      name: customer.nombre,
      document: customer.documento,
      email: customer.email,
      phone: customer.telefono
    });
    setApplyCustomerDiscount(!!(customer.descuentoPersonalizado && customer.descuentoPersonalizado > 0));
    setCheckoutStep(3);
  };

  // Función para validar en tiempo real si el documento ya existe
  const validateCustomerDocument = async (document: string) => {
    if (!document || document.length < 4) return;
    
    setIsValidatingDocument(true);
    setCustomerValidationMessage(null);
    
    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/searchCustomersapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          documento: document.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Error al validar documento');
      }

      const data = await response.json();
      const exists = data.length > 0;
      
      setDocumentExists(exists);
      
      if (exists) {
        setCustomerValidationMessage('Este documento ya está registrado. Por favor utilice la opción "Buscar Cliente Existente".');
      } else {
        setCustomerValidationMessage('Documento disponible para registro.');
      }
    } catch (error) {
      console.error('Error validating customer document:', error);
      setCustomerValidationMessage('Error al validar el documento. Intente nuevamente.');
    } finally {
      setIsValidatingDocument(false);
    }
  };

  // Función para manejar el cambio en los campos del formulario de cliente en el modal
  const handleModalCustomerDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validar documento en tiempo real cuando cambia
    if (name === 'document' && value.length >= 4) {
      validateCustomerDocument(value);
    }
  };

  // Función para registrar un nuevo cliente
  const handleRegisterCustomer = async () => {
    if (!customerData.name || !customerData.document || !customerData.email || !customerData.phone) {
      setError('Por favor complete todos los campos del cliente');
      return;
    }

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

    if (documentExists) {
      setError('Este documento ya está registrado. Por favor utilice la opción "Buscar Cliente Existente".');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/createCustomerapi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          nombre: customerData.name,
          documento: customerData.document,
          email: customerData.email,
          telefono: customerData.phone
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al registrar el cliente');
      }

      // Guardar el cliente en el carrito
      setCustomer({ 
        name: customerData.name, 
        document: customerData.document,
        email: customerData.email,
        phone: customerData.phone
      });

      // Cerrar el modal y limpiar estados
      setIsRegisterCustomerModalOpen(false);
      setError(null);
      
    } catch (error) {
      console.error('Error registering customer:', error);
      setError(error instanceof Error ? error.message : 'Error al registrar el cliente');
    } finally {
      setIsLoading(false);
    }
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
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setCheckoutStep(2);
                  setSearchDocument('');
                  setExistingCustomers([]);
                  fetchCustomersList();
                }}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Buscar Cliente Existente
              </button>
              <button
                onClick={() => setIsRegisterCustomerModalOpen(true)}
                className="w-full bg-white border border-indigo-600 text-indigo-600 py-2 px-4 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Registrar Cliente
              </button>
              <button
                onClick={() => setCheckoutStep(3)}
                className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Elegir Método de Pago
              </button>
            </div>
              <button 
                onClick={() => setIsCheckoutModalOpen(true)}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : 'Confirmar Venta'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout (paso a paso) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">Checkout</h2>
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

              {/* Steps header */}
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <span className={`px-2 py-1 rounded ${checkoutStep === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>1. Productos</span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-1 rounded ${checkoutStep === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>2. Cliente</span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-1 rounded ${checkoutStep === 3 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>3. Pago</span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-1 rounded ${checkoutStep === 4 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>4. Resumen</span>
              </div>

              {/* Step content */}
              {checkoutStep === 1 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
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
                  <div className="flex justify-end">
                    <button onClick={() => setCheckoutStep(2)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Seleccionar Cliente</h3>
                    <div className="flex gap-2">
                      <button onClick={fetchCustomersList} className="px-3 py-1 border rounded">Cargar todos</button>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchDocument}
                          onChange={(e) => setSearchDocument(e.target.value)}
                          placeholder="Buscar por documento o texto"
                          className="px-3 py-1 border rounded"
                        />
                        <button onClick={handleSearchCustomers} disabled={isLoadingCustomers || !searchDocument.trim()} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:bg-indigo-300">Buscar</button>
                      </div>
                      <button onClick={() => setIsRegisterCustomerModalOpen(true)} className="px-3 py-1 border border-indigo-600 text-indigo-600 rounded">Registrar Cliente</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white rounded border">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Doc.</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Cliente</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desc. %</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {existingCustomers.length === 0 ? (
                          <tr><td colSpan={9} className="px-6 py-6 text-center text-gray-500">Sin clientes</td></tr>
                        ) : existingCustomers.map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-900">{c.nombre}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{c.documento}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{c.email || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{c.telefono || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{c.tipoIdentificacion || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{c.ciudad || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{c.tipoCliente || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{typeof c.descuentoPersonalizado === 'number' ? `${c.descuentoPersonalizado}%` : '-'}</td>
                            <td className="px-3 py-2 text-sm text-right">
                              <button onClick={() => handleSelectExistingCustomer(c)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Seleccionar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {customerData.name && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Cliente Seleccionado</h4>
                      <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div><span className="font-medium">Nombre:</span> {customerData.name}</div>
                        <div><span className="font-medium">Documento:</span> {customerData.document}</div>
                        <div><span className="font-medium">Email:</span> {customerData.email}</div>
                        <div><span className="font-medium">Teléfono:</span> {customerData.phone}</div>
                        <div><span className="font-medium">Tipo Doc.:</span> {customerData.tipoIdentificacion || '-'}</div>
                        <div><span className="font-medium">Ciudad:</span> {customerData.ciudad || '-'}</div>
                        <div><span className="font-medium">Tipo Cliente:</span> {customerData.tipoCliente || '-'}</div>
                        <div><span className="font-medium">Desc. %:</span> {typeof customerData.descuentoPersonalizado === 'number' ? `${customerData.descuentoPersonalizado}%` : '-'}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(1)} className="px-4 py-2 border rounded">Atrás</button>
                    <button onClick={() => setCheckoutStep(3)} disabled={!customerData.name} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Método de Pago</h3>
                  <div className="space-y-2">
                    {['Efectivo', 'Nequi', 'Transferencia'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setSelectedPaymentMethod(method as any)}
                        className={`w-full px-4 py-3 rounded-md text-left font-medium ${selectedPaymentMethod === method ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(2)} className="px-4 py-2 border rounded">Atrás</button>
                    <button onClick={() => setCheckoutStep(4)} disabled={!selectedPaymentMethod} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Resumen</h3>
      <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div><span className="font-medium">Cliente:</span> {customerData.name}</div>
                      <div><span className="font-medium">Documento:</span> {customerData.document}</div>
                      <div><span className="font-medium">Email:</span> {customerData.email}</div>
                      <div><span className="font-medium">Teléfono:</span> {customerData.phone}</div>
                      <div><span className="font-medium">Método de Pago:</span> {selectedPaymentMethod}</div>
          <div className="col-span-1 md:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-medium">Total:</span>
                <span className="font-bold text-indigo-600">{formatPrice(total)}</span>
              </div>
              {typeof customerData.descuentoPersonalizado === 'number' && customerData.descuentoPersonalizado > 0 && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={applyCustomerDiscount}
                      onChange={(e) => setApplyCustomerDiscount(e.target.checked)}
                    />
                    <span>Aplicar descuento del cliente ({customerData.descuentoPersonalizado}%)</span>
                  </label>
                </div>
              )}
            </div>
            {applyCustomerDiscount && typeof customerData.descuentoPersonalizado === 'number' && customerData.descuentoPersonalizado > 0 && (
              <div className="mt-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Descuento ({customerData.descuentoPersonalizado}%):</span>
                  <span>-{formatPrice(Math.round((total * customerData.descuentoPersonalizado) / 100))}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total con descuento:</span>
                  <span>{formatPrice(Math.max(0, Math.round(total - (total * customerData.descuentoPersonalizado) / 100)))}</span>
                </div>
              </div>
            )}
          </div>
                    </div>
                    <div className="mt-4 max-h-48 overflow-y-auto">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-sm py-1">
                          <span>{item.product.name} × {item.quantity}</span>
                          <span>{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">{error}</div>
                  )}
                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(3)} className="px-4 py-2 border rounded">Atrás</button>
                    <button
                      onClick={handleCreateSale}
                      disabled={!selectedPaymentMethod || isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
                    >
                      {isLoading ? 'Procesando...' : 'Confirmar Pago'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nuevo Modal de Registro de Clientes */}
      {isRegisterCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Registrar Cliente</h2>
                </div>
                <button
                  onClick={() => setIsRegisterCustomerModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre completo</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    placeholder="Nombre del cliente"
                    value={customerData.name}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="document" className="block text-sm font-medium text-gray-700">Documento</label>
                  <input
                    id="document"
                    type="text"
                    name="document"
                    placeholder="Número de documento"
                    value={customerData.document}
                    onChange={handleModalCustomerDataChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:outline-none ${
                      documentExists 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : customerValidationMessage && !documentExists && customerData.document.length >= 4
                          ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
                          : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    }`}
                    required
                  />
                  {isValidatingDocument && (
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <span className="mr-2 animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></span>
                      Validando documento...
                    </p>
                  )}
                  {customerValidationMessage && !isValidatingDocument && (
                    <p className={`text-sm mt-1 flex items-center ${documentExists ? 'text-red-500' : 'text-green-500'}`}>
                      {documentExists ? (
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <div className="h-3.5 w-3.5 mr-1 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      {customerValidationMessage}
                    </p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={customerData.email}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="Número de teléfono (10 dígitos)"
                    value={customerData.phone}
                    onChange={handleModalCustomerDataChange}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleRegisterCustomer}
                    disabled={isLoading || documentExists}
                    className="w-full py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <span className="mr-2 animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Registrando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Registrar Cliente
                      </>
                    )}
          </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buscar Cliente Existente (removido en flujo de pasos) */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Buscar Cliente Existente</h2>
                <button onClick={() => {}} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchDocument}
                    onChange={(e) => setSearchDocument(e.target.value)}
                    placeholder="Buscar por documento o texto"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    onClick={handleSearchCustomers}
                    disabled={isLoadingCustomers || !searchDocument.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isLoadingCustomers ? 'Buscando...' : 'Buscar'}
                  </button>
                  <button
                    onClick={fetchCustomersList}
                    disabled={isLoadingCustomers}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {isLoadingCustomers ? 'Cargando...' : 'Cargar todos'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Doc.</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo Cliente</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desc. %</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {existingCustomers.length === 0 ? (
                        <tr><td colSpan={9} className="px-6 py-6 text-center text-gray-500">Sin clientes</td></tr>
                      ) : existingCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">{c.nombre}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{c.documento}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{c.email || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{c.telefono || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{c.tipoIdentificacion || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{c.ciudad || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{c.tipoCliente || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{typeof c.descuentoPersonalizado === 'number' ? `${c.descuentoPersonalizado}%` : '-'}</td>
                          <td className="px-3 py-2 text-sm text-right">
                            <button
                              onClick={() => { handleSelectExistingCustomer(c); }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button onClick={() => {}} className="px-4 py-2 text-gray-700 hover:text-gray-900">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Método de Pago (removido en flujo de pasos) */}
      {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Método de Pago</h2>
                <button onClick={() => {}} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
              </div>
              <div className="space-y-2">
                {['Efectivo', 'Nequi', 'Transferencia'].map((method) => (
                  <button
                    key={method}
                    onClick={() => { setSelectedPaymentMethod(method as any); }}
                    className={`w-full px-4 py-3 rounded-md text-left font-medium ${selectedPaymentMethod === method ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={() => {}} className="px-4 py-2 text-gray-700 hover:text-gray-900">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPanel; 