import { useState } from 'react';

interface SalesSummary {
  daily: number;
  weekly: number;
  monthly: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

const DashboardContent = () => {
  // Mock data - Replace with real data from your backend
  const [salesSummary] = useState<SalesSummary>({
    daily: 1250.50,
    weekly: 8750.75,
    monthly: 35000.00
  });

  const [topProducts] = useState<TopProduct[]>([
    { id: '1', name: 'Cuaderno Universitario', sales: 45, revenue: 157.50 },
    { id: '2', name: 'Lápiz 2B', sales: 120, revenue: 90.00 },
    { id: '3', name: 'Borrador', sales: 80, revenue: 40.00 },
    { id: '4', name: 'Cartulina A4', sales: 60, revenue: 180.00 },
  ]);

  const [lowStockItems] = useState([
    { id: '1', name: 'Cuaderno Universitario', stock: 5, minStock: 10 },
    { id: '2', name: 'Marcadores', stock: 3, minStock: 15 },
  ]);

  return (
    <div className="space-y-6">
      {/* Resumen de Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Ventas Hoy</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ${salesSummary.daily.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Ventas esta Semana</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ${salesSummary.weekly.toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Ventas este Mes</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            ${salesSummary.monthly.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Productos Más Vendidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900">Productos Más Vendidos</h3>
          <div className="mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
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
                  {topProducts.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sales}
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
      </div>

      {/* Alertas de Stock Bajo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <svg
              className="w-5 h-5 text-red-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Alertas de Stock Bajo
          </h3>
          <div className="mt-4">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Stock actual: {item.stock} / Mínimo requerido: {item.minStock}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Stock Bajo
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent; 