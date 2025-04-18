import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/es';  // Importar localización en español
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface Sale {
  Código: string;
  Cliente: string;
  Total: number;
  Método: string;
  Fecha: string;
  Productos: {
    code: string;
    name: string;
    categoria: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
  }[];
}

interface TopProduct {
  Producto: string;
  Cantidad: number;
}

interface TotalSales {
  TotalVentas: number;
}

interface CategoryData {
  Categoria: string;
  CantidadVendida: number;
  TotalGenerado: number;
}

interface ApiResponse {
  status: string;
  message: string;
  data: {
    ventas: Sale[];
    total: TotalSales[];
    top: TopProduct[];
    categorias?: CategoryData[];
  };
}

interface Summary {
  totalVentas: number;
  promedioVenta: number;
  totalTransacciones: number;
  metodoPagoPopular: string;
}

// Colores para los gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface DailySales {
  fecha: string;
  total: number;
}

interface MonthlySales {
  mes: string;
  total: number;
  monthIndex?: number; // Optional property for sorting
}

interface YearlySales {
  año: string;
  total: number;
}

interface CategorySales {
  categoria: string;
  total: number;
  porcentaje: number;
}

const ReportsContent = () => {
  const [timeRange, setTimeRange] = useState('day');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('ventas');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);

  moment.locale('es'); // Configurar moment en español

  // Función para obtener el rango de fechas basado en el filtro
  const getDateRange = () => {
    // Configurar moment para usar la zona horaria de Colombia
    moment.tz.setDefault('America/Bogota');
    const now = moment();

    switch (timeRange) {
      case 'day':
        return {
          startDate: moment(selectedDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment(selectedDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
        };
      case 'week':
        const startOfWeek = moment(selectedDate || now).startOf('week');
        const endOfWeek = moment(selectedDate || now).endOf('week');
        return {
          startDate: startOfWeek.format('YYYY-MM-DD HH:mm:ss'),
          endDate: endOfWeek.format('YYYY-MM-DD HH:mm:ss')
        };
      case 'month':
        const startOfMonth = moment(selectedDate || now).startOf('month');
        const endOfMonth = moment(selectedDate || now).endOf('month');
        return {
          startDate: startOfMonth.format('YYYY-MM-DD HH:mm:ss'),
          endDate: endOfMonth.format('YYYY-MM-DD HH:mm:ss')
        };
      case 'year':
        const startOfYear = moment(selectedDate || now).startOf('year');
        const endOfYear = moment(selectedDate || now).endOf('year');
        return {
          startDate: startOfYear.format('YYYY-MM-DD HH:mm:ss'),
          endDate: endOfYear.format('YYYY-MM-DD HH:mm:ss')
        };
      default:
        return {
          startDate: moment(selectedDate).startOf('day').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment(selectedDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')
        };
    }
  };

  // Función para filtrar ventas por rango de fecha
  const filterSalesByDateRange = (ventas: Sale[]) => {
    const { startDate, endDate } = getDateRange();
    const start = moment.tz(startDate, 'America/Bogota');
    const end = moment.tz(endDate, 'America/Bogota');
    
    return ventas.filter(venta => {
      const ventaDate = moment.tz(venta.Fecha, 'America/Bogota');
      if (timeRange === 'day') {
        // Para día específico, comparamos la fecha completa incluyendo hora
        return ventaDate.isBetween(start, end, 'second', '[]');
      }
      // Para otros rangos, usamos el between con inclusión de límites
      return ventaDate.isBetween(start, end, 'day', '[]');
    });
  };

  // Función para calcular el resumen
  const calculateSummary = (ventas: Sale[]) => {
    if (!ventas.length) return null;

    const totalVentas = ventas.reduce((sum, venta) => sum + venta.Total, 0);
    const promedioVenta = totalVentas / ventas.length;
    const metodoPagoCounts = ventas.reduce((acc, venta) => {
      acc[venta.Método] = (acc[venta.Método] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const metodoPagoPopular = Object.entries(metodoPagoCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalVentas,
      promedioVenta,
      totalTransacciones: ventas.length,
      metodoPagoPopular
    };
  };

  // Función para filtrar ventas
  const filterSales = (ventas: Sale[]) => {
    if (!searchTerm) return ventas;
    
    const searchLower = searchTerm.toLowerCase();
    return ventas.filter(venta => 
      venta.Código.toLowerCase().includes(searchLower) ||
      venta.Cliente.toLowerCase().includes(searchLower) ||
      venta.Método.toLowerCase().includes(searchLower)
    );
  };

  // Función para ordenar ventas
  const sortSales = (ventas: Sale[]) => {
    if (!sortConfig) return ventas;

    return [...ventas].sort((a, b) => {
      if (a[sortConfig.key as keyof Sale] < b[sortConfig.key as keyof Sale]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key as keyof Sale] > b[sortConfig.key as keyof Sale]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Función para manejar el ordenamiento
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  // Función para procesar datos de ventas diarias
  const processDailySales = (ventas: Sale[]) => {
    const { startDate, endDate } = getDateRange();
    const start = moment(startDate);
    const end = moment(endDate);
    const days: DailySales[] = [];

    // Crear array con todos los días en el rango
    let currentDate = start.clone();
    while (currentDate.isSameOrBefore(end)) {
      days.push({
        fecha: currentDate.format('DD/MM'),
        total: 0
      });
      currentDate.add(1, 'day');
    }

    // Agregar las ventas a los días correspondientes
    ventas.forEach(venta => {
      const ventaDate = moment(venta.Fecha);
      if (ventaDate.isBetween(start, end, 'day', '[]')) {
        const fechaKey = ventaDate.format('DD/MM');
        const dayIndex = days.findIndex(day => day.fecha === fechaKey);
        if (dayIndex !== -1) {
          days[dayIndex].total += venta.Total;
        }
      }
    });

    return days;
  };

  // Función para procesar datos de ventas mensuales
  const processMonthlyData = (ventas: Sale[]) => {
    const months = moment.months();
    const monthlyData: MonthlySales[] = months.map((month, index) => ({
      mes: month,
      total: 0,
      monthIndex: index
    }));

    // Agrupar ventas por mes
    ventas.forEach(venta => {
      const ventaDate = moment(venta.Fecha);
      const monthIndex = ventaDate.month();
      monthlyData[monthIndex].total += venta.Total;
    });

    // Ordenar los meses cronológicamente y eliminar el campo auxiliar
    return monthlyData
      .sort((a, b) => a.monthIndex! - b.monthIndex!)
      .map(({ mes, total }) => ({ mes, total }));
  };

  // Función para procesar datos de ventas anuales
  const processYearlyData = (ventas: Sale[]): YearlySales[] => {
    // Obtener el año actual y generar array con los últimos 5 años
    const currentYear = moment().year();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());
    
    // Inicializar el mapa con todos los años en 0
    const yearTotals = new Map<string, number>();
    years.forEach(year => yearTotals.set(year, 0));

    // Procesar cada venta y acumular por año
    ventas.forEach(venta => {
      const year = moment(venta.Fecha).format('YYYY');
      if (yearTotals.has(year)) {
        yearTotals.set(year, yearTotals.get(year)! + venta.Total);
      }
    });

    // Convertir a array y ordenar
    return Array.from(yearTotals.entries())
      .map(([año, total]) => ({ año, total }))
      .sort((a, b) => parseInt(a.año) - parseInt(b.año));
  };

  // Función para procesar datos de ventas por categoría
  const processCategorySales = (ventas: Sale[]) => {
    // Si tenemos datos de categorías directamente del backend, usarlos
    if (data?.data?.categorias) {
      const categoryData = data.data.categorias.map(cat => ({
        categoria: cat.Categoria,
        total: cat.TotalGenerado,
        porcentaje: 0 // Se calculará después
      }));

      const totalVentas = categoryData.reduce((sum, cat) => sum + cat.total, 0);
      return categoryData.map(cat => ({
        ...cat,
        porcentaje: (cat.total / totalVentas) * 100
      })).sort((a, b) => b.total - a.total);
    }

    // Si no hay datos de categorías del backend, calcularlos de las ventas (caso de respaldo)
    const categoryAccumulator: Record<string, { total: number }> = {};
    
    ventas.forEach(venta => {
      if (venta.Productos && Array.isArray(venta.Productos)) {
        venta.Productos.forEach(producto => {
          if (producto && producto.categoria && producto.total) {
            const categoria = producto.categoria;
            if (!categoryAccumulator[categoria]) {
              categoryAccumulator[categoria] = { total: 0 };
            }
            categoryAccumulator[categoria].total += producto.total;
          }
        });
      }
    });

    if (Object.keys(categoryAccumulator).length === 0) {
      return [];
    }

    const totalVentas = Object.values(categoryAccumulator)
      .reduce((sum, { total }) => sum + total, 0);

    return Object.entries(categoryAccumulator)
      .map(([categoria, { total }]) => ({
        categoria,
        total,
        porcentaje: (total / totalVentas) * 100
      }))
      .sort((a, b) => b.total - a.total);
  };

  // Función para obtener los datos del reporte
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();

      // Log para depuración
      console.log('Fetching data with params:', {
        timeRange,
        startDate,
        endDate,
        selectedDate
      });

      let url;
      if (timeRange === 'day') {
        // Usar el endpoint específico para día
        url = new URL('https://back-papeleria-two.vercel.app/v1/papeleria/reportsapi/day');
        // Enviar la fecha con la zona horaria correcta
        const formattedDate = moment.tz(selectedDate, 'America/Bogota').format('YYYY-MM-DD');
        url.searchParams.append('date', formattedDate);
      } else {
        // Usar el endpoint general para otros rangos
        url = new URL('https://back-papeleria-two.vercel.app/v1/papeleria/reportsapi');
        url.searchParams.append('startDate', startDate);
        url.searchParams.append('endDate', endDate);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los datos del reporte');
      }

      const responseData = await response.json();
      console.log('API Response:', responseData);
      setData(responseData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Error al cargar los datos del reporte');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para exportar reportes
  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      setIsLoading(true);
      const { startDate, endDate } = getDateRange();
      
      const response = await fetch(
        `https://back-papeleria-two.vercel.app/v1/papeleria/reportsapi?startDate=${startDate}&endDate=${endDate}&type=${reportType}&format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al exportar el reporte');
      }

      // Crear blob y descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${reportType}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Error al exportar el reporte');
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para cargar datos cuando cambien los filtros
  useEffect(() => {
    fetchReportData();
  }, [timeRange, reportType, selectedDate]); // Añadir selectedDate como dependencia

  // Efecto para procesar los datos cuando cambian
  useEffect(() => {
    if (data?.data) {
      const filteredSales = data.data.ventas ? filterSalesByDateRange(data.data.ventas) : [];
      setSummary(calculateSummary(filteredSales));
      
      if (timeRange === 'day') {
        setDailySales([{
          fecha: moment(selectedDate).format('DD/MM'),
          total: filteredSales.reduce((sum, venta) => sum + venta.Total, 0)
        }]);
      } else {
        setDailySales(processDailySales(filteredSales));
      }

      // Procesar datos de categorías independientemente del timeRange
      const categoryData = processCategorySales(filteredSales);
      setCategorySales(categoryData);
    }
  }, [data?.data, timeRange, selectedDate]);

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

  if (!data || !data.data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        No hay datos disponibles para mostrar.
      </div>
    );
  }

  const filteredSales = data.data.ventas ? filterSales(data.data.ventas) : [];
  const sortedSales = sortSales(filteredSales);

  return (
    <div className="space-y-6">
      {/* Controles de Reporte */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="day">Día Específico</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mes</option>
          <option value="year">Este Año</option>
        </select>

        {timeRange === 'day' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={moment().format('YYYY-MM-DD')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ventas">Ventas</option>
          <option value="total">Total</option>
          <option value="top">Top Productos</option>
        </select>

        {reportType === 'ventas' && (
          <input
            type="text"
            placeholder="Buscar por código, cliente o método..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Resumen de Ventas */}
      {summary && reportType === 'ventas' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Total Ventas</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(summary.totalVentas)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Promedio por Venta</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(summary.promedioVenta)}
          </p>
        </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Total Transacciones</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary.totalTransacciones}
          </p>
        </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h4 className="text-sm font-medium text-gray-500">Método de Pago Popular</h4>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {summary.metodoPagoPopular}
            </p>
          </div>
        </div>
      )}

      {/* Gráficos */}
      {reportType === 'ventas' && (
        <div className="space-y-6">
          {timeRange === 'day' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas del Día</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha"
                      interval={0}
                      height={60}
                      tick={props => (
                        <g transform={`translate(${props.x},${props.y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor="middle"
                            fill="#6B7280"
                            fontSize={12}
                          >
                            {props.payload.value}
                          </text>
                        </g>
                      )}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="total"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
        </div>
      </div>
          )}

          {timeRange === 'week' && (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Día</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="fecha"
                      interval={0}
                      height={60}
                      tick={props => (
                        <g transform={`translate(${props.x},${props.y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor="middle"
                            fill="#6B7280"
                            fontSize={12}
                          >
                            {props.payload.value}
                          </text>
                        </g>
                      )}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="total"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
          </div>
        </div>
          )}

          {timeRange === 'month' && (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Mes (Línea)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={processMonthlyData(data.data.ventas)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="mes"
                      interval={0}
                      height={60}
                      tick={props => (
                        <g transform={`translate(${props.x},${props.y})`}>
                          <text
                            x={0}
                            y={0}
                            dy={16}
                            textAnchor="middle"
                            fill="#6B7280"
                            fontSize={12}
                          >
                            {props.payload.value}
                          </text>
                        </g>
                      )}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="total"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {timeRange === 'year' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Año (Barras)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processYearlyData(data.data.ventas)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="año"
                      interval={0}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                    />
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="total"
                      fill="#22C55E"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Gráfico de Ventas por Categoría */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Categoría</h3>
            <div className="h-80">
              {categorySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="categoria"
                      label={({ categoria, porcentaje }) => `${categoria} (${porcentaje.toFixed(1)}%)`}
                    >
                      {categorySales.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(value)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span className="text-sm text-gray-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No hay datos de categorías disponibles
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Datos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {reportType === 'ventas' && 'Detalle de Ventas'}
            {reportType === 'total' && 'Total de Ventas'}
            {reportType === 'top' && 'Productos Más Vendidos'}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportType === 'ventas' && (
                    <>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('Código')}
                      >
                        Código {sortConfig?.key === 'Código' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('Cliente')}
                      >
                        Cliente {sortConfig?.key === 'Cliente' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('Total')}
                      >
                        Total {sortConfig?.key === 'Total' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('Método')}
                      >
                        Método {sortConfig?.key === 'Método' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('Fecha')}
                      >
                        Fecha {sortConfig?.key === 'Fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                    </>
                  )}
                  {reportType === 'top' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                    </>
                  )}
                  {reportType === 'total' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Ventas</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reportType === 'ventas' && sortedSales.map((venta, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.Código}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.Cliente}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP',
                      minimumFractionDigits: 0
                    }).format(venta.Total)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{venta.Método}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {moment(venta.Fecha).format('DD/MM/YYYY HH:mm')}
                    </td>
                  </tr>
                ))}
                {reportType === 'top' && data.data.top && data.data.top.map((producto, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producto.Producto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producto.Cantidad}</td>
                  </tr>
                ))}
                {reportType === 'total' && data.data.total && data.data.total.map((total, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                      }).format(total.TotalVentas)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => handleExport('pdf')}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Exportando...' : 'Exportar PDF'}
        </button>
        <button
          onClick={() => handleExport('excel')}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Exportando...' : 'Exportar Excel'}
        </button>
      </div>
    </div>
  );
};

export default ReportsContent; 