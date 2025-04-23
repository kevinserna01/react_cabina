import { useState, useEffect } from 'react';
import moment from 'moment-timezone';
import { Eye } from 'lucide-react';
import SalesPDF from './SalesPDF';

export interface Product {
  code: string;
  name: string;
  categoria: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface Sale {
  _id: string;
  code: string;
  fecha: string;
  hora: string;
  cliente: {
    nombre: string;
    documento: string;
  } | null;
  productos: Product[];
  totalVenta: number;
  metodoPago: string;
  createdAt: string;
  fechaColombia: string;
}

const SalesContent = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);

  // Función para obtener las ventas
  const fetchSales = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/salesapi', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener las ventas');
      }

      const data = await response.json();
      setSales(data);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setError('Error al cargar las ventas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = sales.filter(sale => {
    const saleDate = moment(sale.fechaColombia);
    if (startDate && saleDate.isBefore(startDate, 'day')) return false;
    if (endDate && saleDate.isAfter(endDate, 'day')) return false;
    if (selectedPaymentMethod && sale.metodoPago !== selectedPaymentMethod) return false;
    return true;
  });

  const totalSales = filteredSales
    .reduce((sum, sale) => sum + (sale.totalVenta || 0), 0);

  const totalItems = filteredSales
    .reduce((sum, sale) => sum + sale.productos.reduce((itemSum, item) => itemSum + (item.cantidad || 0), 0), 0);

  const handleViewPDF = (sale: Sale) => {
    setSelectedSale(sale);
    setIsPDFModalOpen(true);
  };

  // Función para exportar las ventas a PDF
  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/salesapi/export-pdf', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar a PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ventas.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError('Error al exportar a PDF');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para exportar las ventas a Excel
  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/salesapi/export-excel', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar a Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ventas.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Error al exportar a Excel');
    } finally {
      setIsLoading(false);
    }
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
      {/* Filtros y Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Nequi">Nequi</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total de Ventas</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${(totalSales || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Número de Transacciones</p>
              <p className="text-2xl font-semibold text-gray-900">
                {filteredSales.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Items Vendidos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalItems}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium text-gray-900">Ventas</h3>
          <div className="space-x-2">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Exportar PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Exportar Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.fechaColombia}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.cliente ? `${sale.cliente.nombre} (${sale.cliente.documento})` : 'Sin cliente'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.productos.reduce((sum, item) => sum + item.cantidad, 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(sale.totalVenta || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.metodoPago}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => handleViewPDF(sale)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50"
                      title="Ver PDF"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para PDF */}
      {isPDFModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Comprobante de Venta</h2>
              <button
                onClick={() => setIsPDFModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[80vh]">
              <SalesPDF sale={selectedSale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesContent; 