import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import moment from 'moment';

interface SalesData {
  date: string;
  amount: number;
}

interface CategorySales {
  category: string;
  amount: number;
  percentage: number;
}

interface ProductSales {
  name: string;
  units: number;
  revenue: number;
}

interface ApiResponse {
  salesByDay: SalesData[];
  categoryData: CategorySales[];
  topProducts: ProductSales[];
  summary: {
    totalSales: number;
    averageDailySales: number;
    bestDay: {
      date: string;
      amount: number;
    };
  };
}

// Colores para los gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportsContent = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [reportType, setReportType] = useState('sales');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);

  // Función para obtener el rango de fechas basado en el filtro
  const getDateRange = () => {
    const now = moment();
    let startDate = now.clone();

    switch (timeRange) {
      case 'week':
        startDate = now.clone().subtract(7, 'days');
        break;
      case 'month':
        startDate = now.clone().startOf('month');
        break;
      case 'year':
        startDate = now.clone().startOf('year');
        break;
    }

    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: now.format('YYYY-MM-DD')
    };
  };

  // Función para obtener los datos del reporte
  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();

      const response = await fetch(
        `https://back-papeleria-two.vercel.app/v1/papeleria/reportsapi?startDate=${startDate}&endDate=${endDate}&type=${reportType}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Error al obtener los datos del reporte');
      }

      const responseData = await response.json();
      setData(responseData);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Error al cargar los datos del reporte');
    } finally {
      setIsLoading(false);
    }
  };

  // Efecto para cargar datos cuando cambien los filtros
  useEffect(() => {
    fetchReportData();
  }, [timeRange, reportType]);

  // Formateador de moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
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

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        No hay datos disponibles para mostrar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles de Reporte */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="week">Esta Semana</option>
          <option value="month">Este Mes</option>
          <option value="year">Este Año</option>
        </select>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="sales">Ventas</option>
          <option value="categories">Categorías</option>
          <option value="products">Productos</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Ventas Totales</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(data.summary.totalSales)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Promedio Diario</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(data.summary.averageDailySales)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Mejor Día</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {data.summary.bestDay.date}
          </p>
          <p className="text-sm text-gray-500">{formatCurrency(data.summary.bestDay.amount)}</p>
        </div>
      </div>

      {/* Gráfico de Ventas por Día */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Día</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.salesByDay}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              />
              <Bar 
                dataKey="amount" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ventas por Categoría */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Categoría</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                nameKey="category"
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {data.categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(_, entry) => entry[0].payload.category}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(_, entry: any) => {
                  if (entry && entry.payload) {
                    return <span className="text-sm text-gray-600">{entry.payload.category}</span>;
                  }
                  return '';
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Productos Más Vendidos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.topProducts.map((product) => (
                  <tr key={product.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
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
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Exportar PDF
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Exportar Excel
        </button>
      </div>
    </div>
  );
};

export default ReportsContent; 