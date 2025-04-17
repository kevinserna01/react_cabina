import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/es';  // Importar localización en español

interface Sale {
  Código: string;
  Cliente: string;
  Total: number;
  Método: string;
  Fecha: string;
}

interface TopProduct {
  Producto: string;
  Cantidad: number;
}

interface TotalSales {
  TotalVentas: number;
}

interface ApiResponse {
  status: string;
  message: string;
  data: {
    ventas: Sale[];
    total: TotalSales[];
    top: TopProduct[];
  };
}

interface Summary {
  totalVentas: number;
  promedioVenta: number;
  totalTransacciones: number;
  metodoPagoPopular: string;
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

  moment.locale('es'); // Configurar moment en español

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

  // Función para obtener el rango de fechas basado en el filtro
  const getDateRange = () => {
    const now = moment();

    if (timeRange === 'day') {
      return {
        startDate: selectedDate,
        endDate: selectedDate
      };
    }

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
        `https://back-papeleria-two.vercel.app/v1/papeleria/reportsapi?startDate=${startDate}&endDate=${endDate}`,
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
  }, [timeRange, reportType]);

  useEffect(() => {
    if (data?.data.ventas) {
      setSummary(calculateSummary(data.data.ventas));
    }
  }, [data?.data.ventas]);

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

  const filteredSales = filterSales(data.data.ventas);
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
                {reportType === 'top' && data.data.top.map((producto, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producto.Producto}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{producto.Cantidad}</td>
                  </tr>
                ))}
                {reportType === 'total' && data.data.total.map((total, index) => (
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