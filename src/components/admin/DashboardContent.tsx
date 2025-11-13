import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/es';

interface SalesSummary {
  daily: number;
  weekly: number;
  monthly: number;
}

interface TopProduct {
  id: string;
  _id?: string;
  name: string;
  sales: number;
  revenue: number;
  category: string;
}

interface LowStockItem {
  id: string;
  _id?: string;
  name: string;
  stock: number;
  minStock: number;
  category: string;
  lastUpdate: string;
}

interface ApiResponse {
  status: string;
  message: string;
  data: {
    salesSummary: SalesSummary;
    topProducts: TopProduct[];
    lowStockItems: LowStockItem[];
  };
}

const DashboardContent = () => {
  // Configurar moment en español
  moment.locale('es');
  
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    daily: 0,
    weekly: 0,
    monthly: 0
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [currentTime, setCurrentTime] = useState(moment().locale('es'));

  // Función para formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Función para obtener datos del dashboard
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Obtener la fecha actual y el rango de la semana
      const today = moment().format('YYYY-MM-DD');
      const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');
      
      const response = await fetch(
        `https://back-papeleria-two.vercel.app/v1/papeleria/dashboardapi?date=${today}&weekStart=${startOfWeek}&weekEnd=${endOfWeek}`, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar los datos del dashboard');
      }

      const result: ApiResponse = await response.json();

      if (result.status === "Success") {
        // Asegurarse de que los datos tengan el formato correcto
        const formattedData = {
          salesSummary: {
            daily: result.data.salesSummary.daily || 0,
            weekly: result.data.salesSummary.weekly || 0,
            monthly: result.data.salesSummary.monthly || 0
          },
          topProducts: result.data.topProducts.map((product: any) => ({
            id: product._id || product.id || 'unknown',
            name: product.name || 'Producto sin nombre',
            category: product.category || 'Sin categoría',
            sales: Number(product.sales) || 0,
            revenue: Number(product.revenue) || 0
          })),
          lowStockItems: result.data.lowStockItems.map((item: any) => ({
            id: item._id || item.id || 'unknown',
            name: item.name || 'Producto sin nombre',
            stock: Number(item.stock) || 0,
            minStock: Number(item.minStock) || 0,
            category: item.category || 'Sin categoría',
            lastUpdate: item.lastUpdate || new Date().toISOString()
          }))
        };

        // Log para depuración
        console.log('Fecha enviada al backend:', today);
        console.log('Rango semanal enviado:', startOfWeek, 'a', endOfWeek);
        console.log('Ventas del día:', formattedData.salesSummary.daily);
        console.log('Ventas de la semana:', formattedData.salesSummary.weekly);

        setSalesSummary(formattedData.salesSummary);
        setTopProducts(formattedData.topProducts);
        setLowStockItems(formattedData.lowStockItems);
      } else {
        throw new Error(result.message || 'Error al procesar los datos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar datos iniciales y configurar actualización periódica
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 300000); // Actualizar cada 5 minutos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lowStockItems.length > 0) {
      setShowLowStockAlert(true);
      // Ocultar la alerta después de 10 segundos
      const timer = setTimeout(() => {
        setShowLowStockAlert(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [lowStockItems]);

  // Actualizar la hora cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(moment().locale('es'));
    }, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, []);

  // Función para obtener el color de la alerta según el nivel de stock
  const getStockAlertColor = (stock: number, minStock: number) => {
    const percentage = (stock / minStock) * 100;
    if (percentage <= 25) return 'bg-red-100 text-red-800';
    if (percentage <= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 dark:border-white/50 light:border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dark:bg-red-900/20 light:bg-red-50 border dark:border-red-500/50 light:border-red-200 dark:text-red-200 light:text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  // Obtener información del usuario
  const userName = localStorage.getItem('userName') || 'Usuario';
  const userRole = localStorage.getItem('userRole') || 'admin';

  // Función para obtener el saludo según la hora
  const getGreeting = () => {
    const hour = currentTime.hour();
    if (hour >= 5 && hour < 12) return '¡Buenos días';
    if (hour >= 12 && hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de Bienvenida con Fecha y Hora */}
      <div className="dark:bg-gradient-to-r dark:from-blue-900/30 dark:via-purple-900/30 dark:to-blue-900/30
                      light:bg-gradient-to-r light:from-blue-50 light:via-purple-50 light:to-blue-50
                      backdrop-blur-xl border dark:border-white/20 light:border-blue-200
                      rounded-2xl shadow-xl p-6 overflow-hidden relative">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Mensaje de bienvenida */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold dark:text-white light:text-gray-900">
              {getGreeting()}, {userName}! 👋
            </h1>
            <p className="text-base dark:text-white/70 light:text-gray-600">
              Bienvenido a tu panel de {userRole === 'admin' ? 'administración' : 'control'}
            </p>
          </div>
          
          {/* Fecha y Hora */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 dark:text-white light:text-gray-900">
              <svg className="w-5 h-5 dark:text-blue-400 light:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-lg font-semibold">
                {currentTime.format('dddd, D [de] MMMM [de] YYYY')}
              </span>
            </div>
            <div className="flex items-center gap-2 dark:text-white/80 light:text-gray-700">
              <svg className="w-4 h-4 dark:text-blue-400 light:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base font-medium">
                {currentTime.format('h:mm A')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Stock Bajo - Moderna */}
      {showLowStockAlert && lowStockItems.length > 0 && (
        <div className="fixed top-24 right-6 z-[70] max-w-md animate-in slide-in-from-right-5 fade-in duration-500">
          <div className="relative dark:bg-gradient-to-br dark:from-red-900/40 dark:to-orange-900/40 
                          light:bg-gradient-to-br light:from-red-50 light:to-orange-50
                          backdrop-blur-xl border-2 dark:border-red-500/50 light:border-red-300
                          rounded-2xl shadow-2xl overflow-hidden">
            {/* Línea decorativa animada */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse"></div>
            
            <div className="p-6">
              {/* Header con icono y botón cerrar */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Icono animado */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                    <div className="relative bg-red-500 dark:bg-red-600 p-3 rounded-full">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Título */}
                  <div>
                    <h3 className="text-lg font-bold dark:text-white light:text-red-900">
                      Stock Bajo
                    </h3>
                    <p className="text-xs dark:text-red-200 light:text-red-700 font-medium">
                      {lowStockItems.length} {lowStockItems.length === 1 ? 'producto necesita' : 'productos necesitan'} atención
                    </p>
                  </div>
                </div>
                
                {/* Botón cerrar */}
                <button
                  onClick={() => setShowLowStockAlert(false)}
                  className="p-1.5 rounded-lg dark:text-white/70 light:text-red-700 
                           dark:hover:bg-white/10 light:hover:bg-red-100 
                           transition-colors duration-200"
                  aria-label="Cerrar alerta"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Lista de productos */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {lowStockItems.slice(0, 5).map((item, index) => (
                  <div 
                    key={item.id}
                    className="group p-3 rounded-xl dark:bg-white/5 light:bg-white/60 
                             dark:hover:bg-white/10 light:hover:bg-white/80
                             border dark:border-white/10 light:border-red-200
                             transition-all duration-200 animate-in fade-in slide-in-from-left-3"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium dark:text-white light:text-gray-900 truncate">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                                         bg-red-500/20 dark:text-red-200 light:text-red-700 border dark:border-red-500/30 light:border-red-300">
                            Stock: {item.stock}
                          </span>
                          <span className="text-xs dark:text-white/50 light:text-gray-600">
                            Mín: {item.minStock}
                          </span>
                        </div>
                      </div>
                      
                      {/* Indicador de urgencia */}
                      <div className="flex-shrink-0">
                        {item.stock === 0 ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-red-600 text-white">
                            Agotado
                          </span>
                        ) : item.stock <= item.minStock / 2 ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-orange-500 text-white">
                            Crítico
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded-lg bg-yellow-500 text-white">
                            Bajo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {lowStockItems.length > 5 && (
                  <div className="mt-3 text-center">
                    <button className="text-sm font-medium dark:text-red-200 light:text-red-700 
                                     dark:hover:text-white light:hover:text-red-900
                                     underline underline-offset-2 transition-colors">
                      Ver {lowStockItems.length - 5} productos más
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg border dark:border-white/20 light:border-gray-200 dark:hover:bg-white/15 light:hover:shadow-md transition-all">
          <h3 className="text-sm font-medium dark:text-white/70 light:text-gray-500">Ventas Hoy</h3>
          <p className="mt-2 text-3xl font-semibold dark:text-white light:text-gray-900">
            {formatCurrency(salesSummary.daily)}
          </p>
        </div>
        <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg border dark:border-white/20 light:border-gray-200 dark:hover:bg-white/15 light:hover:shadow-md transition-all">
          <h3 className="text-sm font-medium dark:text-white/70 light:text-gray-500">Ventas esta Semana</h3>
          <p className="mt-2 text-3xl font-semibold dark:text-white light:text-gray-900">
            {formatCurrency(salesSummary.weekly)}
          </p>
        </div>
        <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm p-6 rounded-lg shadow-lg border dark:border-white/20 light:border-gray-200 dark:hover:bg-white/15 light:hover:shadow-md transition-all">
          <h3 className="text-sm font-medium dark:text-white/70 light:text-gray-500">Ventas este Mes</h3>
          <p className="mt-2 text-3xl font-semibold dark:text-white light:text-gray-900">
            {formatCurrency(salesSummary.monthly)}
          </p>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-lg border dark:border-white/20 light:border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium dark:text-white light:text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Productos Más Vendidos
          </h3>
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                      Unidades Vendidas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium dark:text-white/70 light:text-gray-500 uppercase tracking-wider">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="dark:bg-transparent light:bg-white divide-y dark:divide-white/10 light:divide-gray-200">
                  {topProducts.length > 0 ? (
                    topProducts.map((product) => (
                      <tr key={product.id} className="dark:hover:bg-white/5 light:hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white light:text-gray-900">
                        {product.name}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white/70 light:text-gray-500">
                          {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white light:text-gray-900">
                        {product.sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white light:text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm dark:text-white/70 light:text-gray-500">
                        No hay datos de productos vendidos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de Stock Bajo */}
      <div className="dark:bg-white/10 light:bg-white backdrop-blur-sm rounded-lg shadow-lg border dark:border-white/20 light:border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium dark:text-white light:text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Alertas de Stock Bajo
          </h3>
          <div className="mt-4">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
              <div
                key={item.id}
                  className="flex items-center justify-between py-3 border-b dark:border-white/10 light:border-gray-200 last:border-0 dark:hover:bg-white/5 light:hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium dark:text-white light:text-gray-900">{item.name}</p>
                  <p className="text-sm dark:text-white/70 light:text-gray-500">
                    Stock actual: {item.stock} / Mínimo requerido: {item.minStock}
                  </p>
                    <p className="text-xs dark:text-white/50 light:text-gray-400">
                      Última actualización: {moment(item.lastUpdate).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockAlertColor(item.stock, item.minStock)}`}>
                    {item.stock <= item.minStock ? 'Stock Crítico' : 'Stock Bajo'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 dark:text-white/70 light:text-gray-500">
                No hay alertas de stock bajo en este momento
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent; 