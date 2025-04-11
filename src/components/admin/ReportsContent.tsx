import { useState } from 'react';

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

const ReportsContent = () => {
  const [timeRange, setTimeRange] = useState('week');
  const [reportType, setReportType] = useState('sales');

  // Mock data - Replace with real data from your backend
  const [salesByDay] = useState<SalesData[]>([
    { date: 'Lunes', amount: 450.75 },
    { date: 'Martes', amount: 375.25 },
    { date: 'Miércoles', amount: 625.50 },
    { date: 'Jueves', amount: 550.00 },
    { date: 'Viernes', amount: 825.75 },
    { date: 'Sábado', amount: 950.25 },
    { date: 'Domingo', amount: 325.50 }
  ]);

  const [categoryData] = useState<CategorySales[]>([
    { category: 'Cuadernos', amount: 1250.75, percentage: 35 },
    { category: 'Útiles', amount: 850.50, percentage: 25 },
    { category: 'Papelería', amount: 750.25, percentage: 20 },
    { category: 'Arte', amount: 650.00, percentage: 20 }
  ]);

  const [topProducts] = useState<ProductSales[]>([
    { name: 'Cuaderno Universitario', units: 45, revenue: 157.50 },
    { name: 'Lápiz 2B', units: 120, revenue: 90.00 },
    { name: 'Borrador', units: 80, revenue: 40.00 },
    { name: 'Cartulina A4', units: 60, revenue: 180.00 }
  ]);

  // Calcular el total de ventas para el período
  const totalSales = salesByDay.reduce((sum, day) => sum + day.amount, 0);
  const averageDailySales = totalSales / salesByDay.length;

  // Encontrar el día con más ventas
  const bestDay = salesByDay.reduce((max, day) => 
    day.amount > max.amount ? day : max
  );

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
            ${totalSales.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Promedio Diario</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ${averageDailySales.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Mejor Día</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {bestDay.date}
          </p>
          <p className="text-sm text-gray-500">${bestDay.amount.toFixed(2)}</p>
        </div>
      </div>

      {/* Gráfico de Ventas por Día */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Día</h3>
        <div className="h-64">
          <div className="flex h-full items-end space-x-2">
            {salesByDay.map((day) => {
              const height = (day.amount / bestDay.amount) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="mt-2 text-xs text-gray-600">{day.date}</div>
                  <div className="text-xs font-medium">${day.amount}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ventas por Categoría */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Categoría</h3>
        <div className="space-y-4">
          {categoryData.map((category) => (
            <div key={category.category}>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{category.category}</span>
                <span>${category.amount.toFixed(2)}</span>
              </div>
              <div className="mt-1 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full"
                  style={{ width: `${category.percentage}%` }}
                />
              </div>
            </div>
          ))}
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
                {topProducts.map((product) => (
                  <tr key={product.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.units}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${product.revenue.toFixed(2)}
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