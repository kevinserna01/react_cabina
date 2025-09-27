import { Minus, Plus, ShoppingCart, X, Receipt, Save, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { listCustomers, createCustomer } from '../../services/customers';
import { Product, CompletedSale } from '../../types';
import InvoicePDFModal from '../sales/InvoicePDFModal';

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
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  nombre: string;
  email: string;
  telefono: string;
  departamento?: string;
  ciudad?: string;
  ubicacionLocal?: string;
  tipoCliente: string;
  descuentoPersonalizado: number;
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Efectivo' | 'Nequi' | 'Transferencia' | ''>('');
  // Estados legacy de tarjeta de cliente ya no usados (se migró a modales)
  // Mantenerlos eliminados para evitar warnings
  const [saleCode, setSaleCode] = useState<string>('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  // El flujo de búsqueda ahora vive en el modal; controlado por isFindCustomerModalOpen
  const [searchDocument, setSearchDocument] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [itemsPerPage] = useState(10);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Nuevo estado para el modal de registro de clientes
  const [isRegisterCustomerModalOpen, setIsRegisterCustomerModalOpen] = useState(false);
  const [applyCustomerDiscount, setApplyCustomerDiscount] = useState<boolean>(false);
  const [isValidatingDocument, setIsValidatingDocument] = useState(false);
  const [documentExists, setDocumentExists] = useState(false);
  const [customerValidationMessage, setCustomerValidationMessage] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3 | 4>(1);
  
  // Estados para el modal de factura PDF
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [showInvoicePDFModal, setShowInvoicePDFModal] = useState(false);

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
    if (customerData.nombre && (!customerData.email || !customerData.telefono)) {
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
        cliente: customerData.nombre ? {
          name: customerData.nombre,
          document: customerData.numeroIdentificacion,
          email: customerData.email,
          phone: customerData.telefono
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

      // Preparar datos de venta completada
      const completedSaleData: CompletedSale = {
        id: result.data.id || result.data._id,
        code: result.data.code,
        totalVenta: result.data.totalVenta,
        cliente: customerData.nombre ? {
          name: customerData.nombre,
          document: customerData.numeroIdentificacion,
          email: customerData.email,
          phone: customerData.telefono
        } : undefined,
        metodoPago: selectedPaymentMethod,
        fecha: new Date().toISOString()
      };

      // Limpiar el carrito y cerrar el modal
      clearCart();
      setIsCheckoutModalOpen(false);
      setSelectedPaymentMethod('');
      setCustomerData({ 
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
      setCustomer(null);
      setSaleCode('');

      // Mostrar modal de factura PDF en lugar del alert
      setCompletedSale(completedSaleData);
      setShowInvoicePDFModal(true);

    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar la venta');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar clientes (GET) para listado inicial con paginación
  const fetchCustomersList = async (page: number = 1, search: string = '') => {
    setIsLoadingCustomers(true);
    setError(null);
    try {
      const res = await listCustomers({ 
        page, 
        limit: itemsPerPage, 
        estado: 'activo',
        search: search.trim() || undefined
      });
      
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
      setCurrentPage(page);
      setTotalPages(res.data?.pagination?.pages || 1);
      setTotalCustomers(res.data?.pagination?.total || 0);
      
      if (items.length === 0 && !search) {
        setError('No hay clientes registrados');
      } else if (items.length === 0 && search) {
        setError('No se encontraron clientes con ese criterio de búsqueda');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar clientes');
      setExistingCustomers([]);
      setTotalPages(1);
      setTotalCustomers(0);
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

  // Función para buscar clientes con debounce
  const handleSearchCustomers = async (searchTerm: string = searchDocument) => {
    if (!searchTerm.trim()) {
      setError('Por favor ingrese un criterio de búsqueda');
      return;
    }
    
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Crear nuevo timeout para debounce
    const timeout = setTimeout(async () => {
      await fetchCustomersList(1, searchTerm);
    }, 500);
    
    setSearchTimeout(timeout);
  };

  // Función para manejar cambios en el input de búsqueda
  const handleSearchInputChange = (value: string) => {
    setSearchDocument(value);
    
    // Si el campo está vacío, cargar todos los clientes
    if (!value.trim()) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      fetchCustomersList(1, '');
    } else {
      // Buscar con debounce
      handleSearchCustomers(value);
    }
  };

  // Función para seleccionar un cliente existente
  const handleSelectExistingCustomer = (customer: ExistingCustomer) => {
    setCustomerData({
      tipoIdentificacion: customer.tipoIdentificacion || 'CC',
      numeroIdentificacion: customer.documento,
      nombre: customer.nombre,
      email: customer.email,
      telefono: customer.telefono,
      departamento: '',
      ciudad: customer.ciudad || '',
      ubicacionLocal: '',
      tipoCliente: customer.tipoCliente || 'individual',
      descuentoPersonalizado: customer.descuentoPersonalizado || 0,
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

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchCustomersList(page, searchDocument);
    }
  };

  // Función para limpiar búsqueda
  const handleClearSearch = () => {
    setSearchDocument('');
    fetchCustomersList(1, '');
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

  // Función para validar el formulario completo
  const validateCustomerForm = (): string | null => {
    if (!customerData.nombre.trim()) return 'El nombre es obligatorio';
    if (!customerData.numeroIdentificacion.trim()) return 'El número de identificación es obligatorio';
    if (!customerData.tipoIdentificacion) return 'El tipo de identificación es obligatorio';
    if (!customerData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) return 'Correo electrónico inválido';
    if (!customerData.telefono || !/^\d{10}$/.test(customerData.telefono)) return 'Teléfono inválido (10 dígitos)';
    return null;
  };

  // Función para manejar el cambio en los campos del formulario de cliente en el modal
  const handleModalCustomerDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validar documento en tiempo real cuando cambia
    if (name === 'numeroIdentificacion' && value.length >= 4) {
      validateCustomerDocument(value);
    }
  };

  // Función para registrar un nuevo cliente
  const handleRegisterCustomer = async () => {
    // Validar formulario
    const validation = validateCustomerForm();
    if (validation) {
      setError(validation);
      return;
    }

    if (documentExists) {
      setError('Este documento ya está registrado. Por favor utilice la opción "Buscar Cliente Existente".');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Usar el servicio correcto de customers
      await createCustomer({
        tipoIdentificacion: customerData.tipoIdentificacion as any,
        numeroIdentificacion: customerData.numeroIdentificacion,
        nombre: customerData.nombre,
        email: customerData.email,
        telefono: customerData.telefono,
        departamento: customerData.departamento || '',
        ciudad: customerData.ciudad || '',
        ubicacionLocal: customerData.ubicacionLocal || '',
        tipoCliente: customerData.tipoCliente as any,
        descuentoPersonalizado: customerData.descuentoPersonalizado || 0
      });

      // Guardar el cliente en el carrito
      setCustomer({ 
        name: customerData.nombre, 
        document: customerData.numeroIdentificacion,
        email: customerData.email,
        phone: customerData.telefono
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
    <div className="w-full sm:w-96 h-full bg-white shadow-lg flex flex-col">
      {/* Header compacto */}
      <div className="p-2 sm:p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold flex items-center">
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Carrito</span>
            <span className="sm:hidden">Carrito</span>
            {items.length > 0 && (
              <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </h2>
          {items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista de productos compacta */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <ShoppingCart className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">El carrito está vacío</p>
          </div>
        ) : (
          <div className="p-2">
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.product.id} className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="text-xs font-medium text-gray-900 truncate" title={item.product.name}>
                        {item.product.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {formatPrice(item.product.price)}
                        </p>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleQuantityChange(item.product, item.quantity - 1)}
                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Minus className="h-3 w-3 text-gray-600" />
                          </button>
                          <span className="text-xs font-medium w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.product, item.quantity + 1)}
                            className="w-5 h-5 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Plus className="h-3 w-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.product)}
                      className="p-1 rounded-full hover:bg-red-100 transition-colors ml-1"
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer compacto con total y botón */}
      {items.length > 0 && (
        <div className="border-t bg-gray-50 p-2 sm:p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Total:</span>
            <span className="text-lg font-bold text-indigo-600">{formatPrice(total)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            className="w-full bg-indigo-600 text-white py-2 px-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium text-sm transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : 'Confirmar Venta'}
          </button>
        </div>
      )}

      {/* Modal de Checkout (paso a paso) */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="p-3 sm:p-4">
              {/* Header compacto */}
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Checkout</h2>
                  <div className="flex items-center text-gray-600 text-xs sm:text-sm">
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span>
                      {isGeneratingCode ? 'Generando código...' : `Código: ${saleCode}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Steps header compacto */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm mb-3">
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
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="text-base font-medium text-gray-900 mb-3">Productos</h3>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex justify-between items-center bg-white p-2 rounded border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                            <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-medium text-gray-900 ml-2">{formatPrice(item.product.price * item.quantity)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-base font-medium">Total:</span>
                      <span className="text-lg font-bold text-indigo-600">{formatPrice(total)}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setCheckoutStep(2)} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 2 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                    <h3 className="text-base font-medium text-gray-900">Seleccionar Cliente</h3>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => fetchCustomersList(1, '')} 
                        className="px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 text-xs font-medium"
                      >
                        Cargar todos
                      </button>
                      <button 
                        onClick={() => setIsRegisterCustomerModalOpen(true)} 
                        className="px-3 py-1.5 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-xs font-medium"
                      >
                        Registrar Cliente
                      </button>
                    </div>
                  </div>

                  {/* Barra de búsqueda mejorada */}
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={searchDocument}
                          onChange={(e) => handleSearchInputChange(e.target.value)}
                          placeholder="Buscar por nombre, documento, email..."
                          className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {searchDocument && (
                          <button
                            onClick={handleClearSearch}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    {isLoadingCustomers && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>

                  {/* Información de resultados */}
                  {totalCustomers > 0 && (
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCustomers)} de {totalCustomers} clientes
                      </span>
                      {searchDocument && (
                        <span className="text-indigo-600">
                          Resultados para: "{searchDocument}"
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tabla de clientes optimizada */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {existingCustomers.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Sin clientes</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchDocument ? 'No se encontraron clientes con ese criterio de búsqueda.' : 'No hay clientes registrados.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descuento</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {existingCustomers.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-2">
                                    <div className="flex flex-col">
                                      <div className="text-xs font-medium text-gray-900 truncate max-w-24">
                                        {c.nombre}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {c.tipoCliente || 'Cliente'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="text-xs text-gray-900">{c.documento}</div>
                                    <div className="text-xs text-gray-500">{c.tipoIdentificacion || 'CC'}</div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-col">
                                      <div className="text-xs text-gray-900 truncate max-w-24">
                                        {c.email || '-'}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {c.telefono || '-'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                                      c.descuentoPersonalizado && c.descuentoPersonalizado > 0 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {typeof c.descuentoPersonalizado === 'number' ? `${c.descuentoPersonalizado}%` : '0%'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button 
                                      onClick={() => handleSelectExistingCustomer(c)} 
                                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                      Seleccionar
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

                  {customerData.nombre && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Cliente Seleccionado</h4>
                      <div className="text-xs text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-1">
                        <div><span className="font-medium">Nombre:</span> {customerData.nombre}</div>
                        <div><span className="font-medium">Documento:</span> {customerData.numeroIdentificacion}</div>
                        <div><span className="font-medium">Email:</span> {customerData.email}</div>
                        <div><span className="font-medium">Teléfono:</span> {customerData.telefono}</div>
                        <div><span className="font-medium">Tipo Doc.:</span> {customerData.tipoIdentificacion || '-'}</div>
                        <div><span className="font-medium">Ciudad:</span> {customerData.ciudad || '-'}</div>
                        <div><span className="font-medium">Tipo Cliente:</span> {customerData.tipoCliente || '-'}</div>
                        <div><span className="font-medium">Desc. %:</span> {typeof customerData.descuentoPersonalizado === 'number' ? `${customerData.descuentoPersonalizado}%` : '-'}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(1)} className="px-3 py-1.5 border rounded text-sm">Atrás</button>
                    <button onClick={() => setCheckoutStep(3)} disabled={!customerData.nombre} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-sm">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 3 && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-gray-900">Método de Pago</h3>
                  <div className="space-y-2">
                    {['Efectivo', 'Nequi', 'Transferencia'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setSelectedPaymentMethod(method as any)}
                        className={`w-full px-3 py-2 rounded-md text-left text-sm font-medium ${selectedPaymentMethod === method ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(2)} className="px-3 py-1.5 border rounded text-sm">Atrás</button>
                    <button onClick={() => setCheckoutStep(4)} disabled={!selectedPaymentMethod} className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-sm">Siguiente</button>
                  </div>
                </div>
              )}

              {checkoutStep === 4 && (
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-gray-900">Resumen</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-1">
                      <div><span className="font-medium">Cliente:</span> {customerData.nombre}</div>
                      <div><span className="font-medium">Documento:</span> {customerData.numeroIdentificacion}</div>
                      <div><span className="font-medium">Email:</span> {customerData.email}</div>
                      <div><span className="font-medium">Teléfono:</span> {customerData.telefono}</div>
                      <div><span className="font-medium">Método de Pago:</span> {selectedPaymentMethod}</div>
                      <div className="col-span-1 md:col-span-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">Total:</span>
                            <span className="font-bold text-indigo-600">{formatPrice(total)}</span>
                          </div>
                          {typeof customerData.descuentoPersonalizado === 'number' && customerData.descuentoPersonalizado > 0 && (
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={applyCustomerDiscount}
                                  onChange={(e) => setApplyCustomerDiscount(e.target.checked)}
                                />
                                <span>Aplicar descuento ({customerData.descuentoPersonalizado}%)</span>
                              </label>
                            </div>
                          )}
                        </div>
                        {applyCustomerDiscount && typeof customerData.descuentoPersonalizado === 'number' && customerData.descuentoPersonalizado > 0 && (
                          <div className="mt-2 text-xs text-gray-700">
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
                    <div className="mt-3 max-h-32 overflow-y-auto">
                      {items.map((item) => (
                        <div key={item.product.id} className="flex justify-between text-xs py-1">
                          <span className="truncate">{item.product.name} × {item.quantity}</span>
                          <span className="ml-2">{formatPrice(item.product.price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {error && (
                    <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-xs">{error}</div>
                  )}
                  <div className="flex justify-between">
                    <button onClick={() => setCheckoutStep(3)} className="px-3 py-1.5 border rounded text-sm">Atrás</button>
                    <button
                      onClick={handleCreateSale}
                      disabled={!selectedPaymentMethod || isLoading}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 text-sm"
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

      {/* Modal de Registro de Clientes - Formulario Completo */}
      {isRegisterCustomerModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Registrar Cliente</h2>
                  <p className="text-sm text-gray-600 mt-1">Complete todos los campos para registrar un nuevo cliente</p>
                </div>
                <button
                  onClick={() => setIsRegisterCustomerModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleRegisterCustomer(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Identificación</label>
                  <select
                    value={customerData.tipoIdentificacion}
                    onChange={handleModalCustomerDataChange}
                    name="tipoIdentificacion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número Identificación</label>
                  <input
                    type="text"
                    name="numeroIdentificacion"
                    placeholder="Número de documento"
                    value={customerData.numeroIdentificacion}
                    onChange={handleModalCustomerDataChange}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-1 focus:outline-none ${
                      documentExists 
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                        : customerValidationMessage && !documentExists && customerData.numeroIdentificacion.length >= 4
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Nombre completo del cliente"
                    value={customerData.nombre}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="correo@ejemplo.com"
                    value={customerData.email}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    placeholder="Número de teléfono (10 dígitos)"
                    value={customerData.telefono}
                    onChange={handleModalCustomerDataChange}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    name="departamento"
                    placeholder="Departamento"
                    value={customerData.departamento || ''}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    name="ciudad"
                    placeholder="Ciudad"
                    value={customerData.ciudad || ''}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    name="ubicacionLocal"
                    placeholder="Dirección completa"
                    value={customerData.ubicacionLocal || ''}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
                  <select
                    value={customerData.tipoCliente}
                    onChange={handleModalCustomerDataChange}
                    name="tipoCliente"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="individual">Individual</option>
                    <option value="empresa">Empresa</option>
                    <option value="mayorista">Mayorista</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%)</label>
                  <input
                    type="number"
                    name="descuentoPersonalizado"
                    min={0}
                    max={100}
                    value={customerData.descuentoPersonalizado || 0}
                    onChange={handleModalCustomerDataChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {error && (
                  <div className="md:col-span-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsRegisterCustomerModalOpen(false)} 
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || documentExists}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center"
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
              </form>
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
                    onClick={() => handleSearchCustomers()}
                    disabled={isLoadingCustomers || !searchDocument.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                  >
                    {isLoadingCustomers ? 'Buscando...' : 'Buscar'}
                  </button>
                  <button
                    onClick={() => fetchCustomersList(1, '')}
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

      {/* Modal de Factura PDF */}
      {showInvoicePDFModal && completedSale && (
        <InvoicePDFModal
          isOpen={showInvoicePDFModal}
          onClose={() => {
            setShowInvoicePDFModal(false);
            setCompletedSale(null);
          }}
          sale={completedSale}
        />
      )}
    </div>
  );
};

export default CartPanel; 