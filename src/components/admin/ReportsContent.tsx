import { useState, useEffect } from 'react';
import moment from 'moment';
import 'moment/locale/es';  // Importar localización en español
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Document, Page, Text, View, StyleSheet, Image, Svg, Path } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

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

// Estilos para el PDF del reporte
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
  title: {
    fontSize: 40,
    color: '#0d8afe',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 20,
  },
  table: {
    flexDirection: 'column',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0d8afe',
    padding: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    padding: 8,
    fontSize: 11,
  },
  tableCell: {
    flex: 1,
  },
  tableCellNarrow: {
    width: '15%',
  },
  tableCellWide: {
    width: '25%',
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
  summarySection: {
    marginBottom: 30,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'space-between',
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
  summaryIcon: {
    width: 24,
    height: 24,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    color: '#111827',
    fontWeight: 'bold',
  },
  summaryValueSmall: {
    fontSize: 16,
    color: '#111827',
    fontWeight: 'bold',
  },
  icon: {
    width: 12,
    height: 12,
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 10,
    color: '#4B5563',
  },
  chartSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  chartLabel: {
    flex: 1,
    fontSize: 10,
    color: '#4B5563',
  },
  chartValue: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },
  chartBar: {
    height: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryColor: {
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: 2,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 10,
    color: '#4B5563',
  },
  categoryValue: {
    fontSize: 10,
    color: '#111827',
    fontWeight: 'bold',
  },
});

// SVG Icons como componentes (reutilizados de SalesPDF)
const CalendarIcon = () => (
  <Svg style={pdfStyles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </Svg>
);

const PhoneIcon = () => (
  <Svg style={pdfStyles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1z"/>
  </Svg>
);

const LocationIcon = () => (
  <Svg style={pdfStyles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </Svg>
);

// Actualizar los íconos para usar el estilo correcto
const MoneyIcon = () => (
  <Svg style={{ width: 24, height: 24, marginBottom: 10 }} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </Svg>
);

const AverageIcon = () => (
  <Svg style={{ width: 24, height: 24, marginBottom: 10 }} viewBox="0 0 24 24">
    <Path fill="#10B981" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/>
  </Svg>
);

const TransactionIcon = () => (
  <Svg style={{ width: 24, height: 24, marginBottom: 10 }} viewBox="0 0 24 24">
    <Path fill="#6366F1" d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </Svg>
);

const PaymentIcon = () => (
  <Svg style={{ width: 24, height: 24, marginBottom: 10 }} viewBox="0 0 24 24">
    <Path fill="#F59E0B" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </Svg>
);

// Componente ReportPDF
const ReportPDF = ({ data, timeRange, startDate, endDate, summary, dailySales, categorySales }: any) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      {/* Header */}
      <View style={pdfStyles.header}>
        <View style={pdfStyles.headerLeft}>
          <Image
            src="/assets/logo.png"
            style={pdfStyles.logo}
          />
          <Text style={pdfStyles.companyInfo}>NIT: 38670789-4</Text>
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.iconContainer}>
              <PhoneIcon />
            </View>
            <Text style={pdfStyles.infoText}>+57 310 4183311</Text>
          </View>
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.iconContainer}>
              <LocationIcon />
            </View>
            <Text style={pdfStyles.infoText}>Calle 17 N 14-25 Barrio La Pradera Jamundi</Text>
          </View>
        </View>
        <View style={pdfStyles.headerRight}>
          <Text style={pdfStyles.title}>REPORTE</Text>
          <View style={pdfStyles.infoRow}>
            <View style={pdfStyles.iconContainer}>
              <CalendarIcon />
            </View>
            <Text style={pdfStyles.infoText}>
              {timeRange === 'day' 
                ? `Fecha: ${moment(startDate).format('DD/MM/YYYY')}`
                : `Período: ${moment(startDate).format('DD/MM/YYYY')} - ${moment(endDate).format('DD/MM/YYYY')}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Updated Summary Section */}
      {summary && (
        <View style={pdfStyles.summarySection}>
          <View style={pdfStyles.summaryCard}>
            <MoneyIcon />
            <Text style={pdfStyles.summaryLabel}>Total Ventas</Text>
            <Text style={pdfStyles.summaryValue}>
              {formatCurrency(summary.totalVentas)}
            </Text>
          </View>
          
          <View style={pdfStyles.summaryCard}>
            <AverageIcon />
            <Text style={pdfStyles.summaryLabel}>Promedio por Venta</Text>
            <Text style={pdfStyles.summaryValue}>
              {formatCurrency(summary.promedioVenta)}
            </Text>
          </View>
          
          <View style={pdfStyles.summaryCard}>
            <TransactionIcon />
            <Text style={pdfStyles.summaryLabel}>Total Transacciones</Text>
            <Text style={pdfStyles.summaryValue}>
              {summary.totalTransacciones}
            </Text>
          </View>
          
          <View style={pdfStyles.summaryCard}>
            <PaymentIcon />
            <Text style={pdfStyles.summaryLabel}>Método de Pago Popular</Text>
            <Text style={pdfStyles.summaryValueSmall}>
              {summary.metodoPagoPopular}
            </Text>
          </View>
        </View>
      )}

      {/* Gráfico de Ventas */}
      <View style={pdfStyles.chartSection}>
        <Text style={pdfStyles.chartTitle}>
          {timeRange === 'day' ? 'Ventas del Día' : 'Ventas por Período'}
        </Text>
        {dailySales.map((sale: any, index: number) => {
          const maxValue = Math.max(...dailySales.map((s: any) => s.total));
          const percentage = (sale.total / maxValue) * 100;
          
          return (
            <View key={index}>
              <View style={pdfStyles.chartRow}>
                <Text style={pdfStyles.chartLabel}>{sale.fecha}</Text>
                <Text style={pdfStyles.chartValue}>
                  {formatCurrency(sale.total)}
                </Text>
              </View>
              <View style={{ width: '100%', height: 8, backgroundColor: '#F3F4F6', borderRadius: 4 }}>
                <View style={[pdfStyles.chartBar, { width: `${percentage}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Gráfico de Categorías */}
      {categorySales && categorySales.length > 0 && (
        <View style={pdfStyles.chartSection}>
          <Text style={pdfStyles.chartTitle}>Ventas por Categoría</Text>
          {categorySales.map((category: any, index: number) => (
            <View key={index} style={pdfStyles.categoryRow}>
              <View
                style={[
                  pdfStyles.categoryColor,
                  { backgroundColor: COLORS[index % COLORS.length] }
                ]}
              />
              <Text style={pdfStyles.categoryLabel}>
                {category.categoria}
              </Text>
              <Text style={pdfStyles.categoryValue}>
                {formatCurrency(category.total)} ({category.porcentaje.toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tabla de Ventas */}
      <View style={pdfStyles.table}>
        <View style={pdfStyles.tableHeader}>
          <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>CÓDIGO</Text>
          <Text style={[pdfStyles.tableCell, pdfStyles.tableCellWide]}>CLIENTE</Text>
          <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>TOTAL</Text>
          <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>MÉTODO</Text>
          <Text style={[pdfStyles.tableCell, pdfStyles.tableCellWide]}>FECHA</Text>
        </View>
        {data.ventas.map((venta: Sale, index: number) => (
          <View key={index} style={pdfStyles.tableRow}>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>{venta.Código}</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellWide]}>{venta.Cliente}</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>
              {formatCurrency(venta.Total)}
            </Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellNarrow]}>{venta.Método}</Text>
            <Text style={[pdfStyles.tableCell, pdfStyles.tableCellWide]}>
              {moment(venta.Fecha).format('DD/MM/YYYY HH:mm')}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={pdfStyles.footer}>
        <Text>Reporte generado el {moment().format('DD/MM/YYYY HH:mm')}</Text>
        <View style={[pdfStyles.infoRow, { justifyContent: 'center', marginTop: 8 }]}>
          <View style={pdfStyles.iconContainer}>
            <PhoneIcon />
          </View>
          <Text>Para cualquier consulta, contáctenos al (+57) 310 4183311</Text>
        </View>
      </View>
    </Page>
  </Document>
);

// Función para formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
};

const ReportsContent = () => {
  const [timeRange, setTimeRange] = useState('day');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('ventas');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);

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
          'Content-Type': 'application/json'
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
    } finally {
      setIsLoading(false);
    }
  };

  // Función para exportar reportes
  const handleExport = async () => {
    try {
      setIsLoading(true);
      setExportError(null);
      const { startDate, endDate } = getDateRange();
      
      // Validar si hay datos para exportar en el día seleccionado
      if (timeRange === 'day') {
        const ventas = data?.data?.ventas || [];
        const filtered = filterSalesByDateRange(ventas);
        if (!filtered.length) {
          setExportError('No hay datos para exportar en el día seleccionado.');
          setIsLoading(false);
          return;
        }
      }
      
      // Generar el PDF directamente
      const blob = await pdf(
        <ReportPDF 
          data={data?.data}
          timeRange={timeRange}
          startDate={startDate}
          endDate={endDate}
          summary={summary}
          dailySales={dailySales}
          categorySales={categorySales}
        />
      ).toBlob();

      // Descargar el PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${moment().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
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

  // Mostrar error de exportación si existe
  const exportErrorBanner = exportError ? (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
      {exportError}
    </div>
  ) : null;

  if (!data || !data.data) {
    return (
      <>
        {exportErrorBanner}
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          No hay datos disponibles para mostrar.
        </div>
      </>
    );
  }

  const filteredSales = data.data.ventas ? filterSales(data.data.ventas) : [];
  const sortedSales = sortSales(filteredSales);

  return (
    <div className="space-y-6">
      {exportErrorBanner}
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
          onClick={handleExport}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Exportando...' : 'Exportar PDF'}
        </button>
      </div>
    </div>
  );
};

export default ReportsContent; 