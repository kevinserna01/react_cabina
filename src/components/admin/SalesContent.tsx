import { useState, useEffect } from 'react';
import moment from 'moment-timezone';
import { Eye } from 'lucide-react';
import SalesPDF from './SalesPDF';
import { Document, Page, Text, View, StyleSheet, pdf, Image, Svg, Path } from '@react-pdf/renderer';

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

// Agregar los íconos SVG
const PhoneIcon = () => (
  <Svg style={{ width: 12, height: 12, marginRight: 6 }} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
  </Svg>
);

const LocationIcon = () => (
  <Svg style={{ width: 12, height: 12, marginRight: 6 }} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </Svg>
);

// Estilos para el PDF de exportación
const pdfStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    borderBottom: 1,
    borderBottomColor: '#0d8afe',
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
    width: '40%',
  },
  headerRight: {
    flexDirection: 'column',
    width: '40%',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    color: '#0d8afe',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  summarySection: {
    marginBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0d8afe',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    padding: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
  },
  headerCell: {
    flex: 1,
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#4B5563',
    fontSize: 10,
    borderTop: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  companyInfo: {
    fontSize: 10,
    color: '#4B5563',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
});

// Componente para el PDF de exportación
const SalesReportPDF = ({ sales, totalSales, totalItems, startDate, endDate }: { sales: Sale[], totalSales: number, totalItems: number, startDate: string, endDate: string }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header}>
        <View style={pdfStyles.headerLeft}>
          <Image
            src="/assets/logo.png"
            style={pdfStyles.logo}
          />
          <Text style={pdfStyles.companyInfo}>NIT: 38670789-4</Text>
          <View style={pdfStyles.infoRow}>
            <PhoneIcon />
            <Text style={pdfStyles.companyInfo}>+57 310 4183311</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <LocationIcon />
            <Text style={pdfStyles.companyInfo}>Calle 17 N 14-25 Barrio La Pradera Jamundi</Text>
          </View>
          <Text style={pdfStyles.companyInfo}>Jamundi, Colombia</Text>
        </View>
        <View style={pdfStyles.headerRight}>
          <Text style={pdfStyles.title}>VENTAS</Text>
          <Text style={pdfStyles.dateText}>
            Generado el: {moment().format('DD/MM/YYYY HH:mm')}
          </Text>
          {startDate && endDate && (
            <Text style={pdfStyles.dateText}>
              Período: {moment(startDate).format('DD/MM/YYYY')} - {moment(endDate).format('DD/MM/YYYY')}
            </Text>
          )}
        </View>
      </View>

      <View style={pdfStyles.summarySection}>
        <View style={pdfStyles.summaryCard}>
          <Text style={pdfStyles.summaryLabel}>Total de Ventas</Text>
          <Text style={pdfStyles.summaryValue}>
            ${totalSales.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
          </Text>
        </View>
        <View style={pdfStyles.summaryCard}>
          <Text style={pdfStyles.summaryLabel}>Número de Transacciones</Text>
          <Text style={pdfStyles.summaryValue}>{sales.length}</Text>
        </View>
        <View style={pdfStyles.summaryCard}>
          <Text style={pdfStyles.summaryLabel}>Total de Items Vendidos</Text>
          <Text style={pdfStyles.summaryValue}>{totalItems}</Text>
        </View>
      </View>

      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={pdfStyles.headerCell}>Código</Text>
          <Text style={pdfStyles.headerCell}>Fecha</Text>
          <Text style={pdfStyles.headerCell}>Cliente</Text>
          <Text style={pdfStyles.headerCell}>Items</Text>
          <Text style={pdfStyles.headerCell}>Total</Text>
          <Text style={pdfStyles.headerCell}>Método de Pago</Text>
        </View>
        {sales.map((sale, index) => (
          <View key={index} style={pdfStyles.tableRow}>
            <Text style={pdfStyles.tableCell}>{sale.code}</Text>
            <Text style={pdfStyles.tableCell}>{sale.fechaColombia}</Text>
            <Text style={pdfStyles.tableCell}>
              {sale.cliente ? `${sale.cliente.nombre}` : 'Sin cliente'}
            </Text>
            <Text style={pdfStyles.tableCell}>
              {sale.productos.reduce((sum, item) => sum + item.cantidad, 0)}
            </Text>
            <Text style={pdfStyles.tableCell}>
              ${sale.totalVenta.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
            </Text>
            <Text style={pdfStyles.tableCell}>{sale.metodoPago}</Text>
          </View>
        ))}
      </View>

      <View style={pdfStyles.footer}>
        <Text>© {new Date().getFullYear()} Papelería - Todos los derechos reservados</Text>
        <View style={[pdfStyles.infoRow, { justifyContent: 'center', marginTop: 8 }]}>
          <PhoneIcon />
          <Text>Para cualquier consulta, contáctenos al (+57) 310 4183311</Text>
        </View>
      </View>
    </Page>
  </Document>
);

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

  // Actualizar la función handleExportPDF
  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const blob = await pdf(
        <SalesReportPDF 
          sales={filteredSales} 
          totalSales={totalSales} 
          totalItems={totalItems}
          startDate={startDate}
          endDate={endDate}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${moment().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
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