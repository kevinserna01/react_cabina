import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/es';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

      // Obtener la fecha actual y el rango de la semana en la zona horaria de Bogotá
      const today = moment().tz('America/Bogota').format('YYYY-MM-DD');
      const startOfWeek = moment().tz('America/Bogota').startOf('week').format('YYYY-MM-DD');
      const endOfWeek = moment().tz('America/Bogota').endOf('week').format('YYYY-MM-DD');
      
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Stock Bajo */}
      {showLowStockAlert && lowStockItems.length > 0 && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle className="text-red-800">¡Alerta de Stock Bajo!</AlertTitle>
            <AlertDescription className="text-red-700">
              Los siguientes productos tienen stock bajo:
              <ul className="mt-2 list-disc list-inside">
                {lowStockItems.slice(0, 3).map((item) => (
                  <li key={item.id}>
                    {item.name} - Stock actual: {item.stock} (Mínimo: {item.minStock})
                  </li>
                ))}
                {lowStockItems.length > 3 && (
                  <li>... y {lowStockItems.length - 3} productos más</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Resumen de Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Ventas Hoy</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(salesSummary.daily)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Ventas esta Semana</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(salesSummary.weekly)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Ventas este Mes</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(salesSummary.monthly)}
          </p>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidades Vendidas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.length > 0 ? (
                    topProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sales}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(product.revenue)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
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
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Stock actual: {item.stock} / Mínimo requerido: {item.minStock}
                  </p>
                    <p className="text-xs text-gray-400">
                      Última actualización: {moment(item.lastUpdate).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockAlertColor(item.stock, item.minStock)}`}>
                    {item.stock <= item.minStock ? 'Stock Crítico' : 'Stock Bajo'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
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