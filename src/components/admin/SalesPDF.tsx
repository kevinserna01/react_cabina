import { Document, Page, Text, View, StyleSheet, PDFViewer, Image, Svg, Path } from '@react-pdf/renderer';
import { Sale } from './SalesContent';

const styles = StyleSheet.create({
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
  invoiceInfo: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  clientSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#0d8afe',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  clientInfo: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
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
    width: '40%',
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
  totals: {
    marginLeft: 'auto',
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    fontSize: 12,
    color: '#4B5563',
  },
  totalRowBold: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0d8afe',
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    width: 12,
    height: 12,
    marginRight: 6,
  },
  iconContainer: {
    marginRight: 5,
  },
  infoText: {
    fontSize: 10,
    color: '#4B5563',
  },
  methodIcon: {
    width: 14,
    height: 14,
    marginRight: 8,
  }
});

// SVG Icons as components
const PhoneIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M20 15.5c-1.2 0-2.4-.2-3.6-.6-.3-.1-.7 0-1 .2l-2.2 2.2c-2.8-1.4-5.1-3.8-6.6-6.6l2.2-2.2c.3-.3.4-.7.2-1-.3-1.1-.5-2.3-.5-3.5 0-.6-.4-1-1-1H4c-.6 0-1 .4-1 1 0 9.4 7.6 17 17 17 .6 0 1-.4 1-1v-3.5c0-.6-.4-1-1-1zM19 12h2c0-4.4-3.6-8-8-8v2c3.3 0 6 2.7 6 6zm-4 0h2c0-2.2-1.8-4-4-4v2c1.1 0 2 .9 2 2z"/>
  </Svg>
);

const LocationIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </Svg>
);

const CalendarIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </Svg>
);

const CodeIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6z"/>
  </Svg>
);

const PaymentIcon = () => (
  <Svg style={styles.icon} viewBox="0 0 24 24">
    <Path fill="#0d8afe" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
  </Svg>
);

interface SalesPDFProps {
  sale: Sale;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
};

const SalesPDF = ({ sale }: SalesPDFProps) => (
  <PDFViewer style={{ width: '100%', height: '80vh' }}>
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              src="/assets/logo.png"
              style={styles.logo}
            />
            <Text style={styles.companyInfo}>NIT: 38670789-4</Text>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <PhoneIcon />
              </View>
              <Text style={styles.infoText}>+57 310 4183311</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <LocationIcon />
              </View>
              <Text style={styles.infoText}>Calle 17 N 14-25 Barrio La Pradera Jamundi</Text>
            </View>
            <Text style={styles.companyInfo}>Jamundi, Colombia</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>FACTURA</Text>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <CalendarIcon />
              </View>
              <Text style={styles.invoiceInfo}>FECHA: {sale.fechaColombia}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <CodeIcon />
              </View>
              <Text style={styles.invoiceInfo}>CODIGO #: {sale.code}</Text>
            </View>
          </View>
        </View>

        {/* Client Information */}
        <View style={styles.clientSection}>
          <Text style={styles.sectionTitle}>CLIENTE</Text>
          <Text style={styles.clientInfo}>
            {sale.cliente
              ? `${sale.cliente.nombre}\nDocumento: ${sale.cliente.documento}`
              : 'Cliente General'}
          </Text>
        </View>

        {/* Products Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableCellNarrow]}>CÓDIGO</Text>
            <Text style={[styles.tableCell, styles.tableCellWide]}>PRODUCTO</Text>
            <Text style={[styles.tableCell, styles.tableCellNarrow]}>CANT.</Text>
            <Text style={[styles.tableCell, styles.tableCellNarrow]}>PRECIO</Text>
            <Text style={[styles.tableCell, styles.tableCellNarrow]}>TOTAL</Text>
          </View>
          {sale.productos.map((producto, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.tableCellNarrow]}>{producto.code}</Text>
              <Text style={[styles.tableCell, styles.tableCellWide]}>{producto.name}</Text>
              <Text style={[styles.tableCell, styles.tableCellNarrow]}>{producto.cantidad}</Text>
              <Text style={[styles.tableCell, styles.tableCellNarrow]}>
                {formatCurrency(producto.precioUnitario)}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellNarrow]}>
                {formatCurrency(producto.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(sale.totalVenta)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA (0%):</Text>
            <Text>{formatCurrency(0)}</Text>
          </View>
          <View style={styles.totalRowBold}>
            <Text>TOTAL:</Text>
            <Text>{formatCurrency(sale.totalVenta)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 20 }]}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <PaymentIcon />
              </View>
              <Text>Método de Pago:</Text>
            </View>
            <Text>{sale.metodoPago}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>¡Gracias por su compra!</Text>
          <View style={[styles.infoRow, { justifyContent: 'center', marginTop: 8 }]}>
            <View style={styles.iconContainer}>
              <PhoneIcon />
            </View>
            <Text>Para cualquier consulta, contáctenos al (+57) 310 4183311 o visítenos en Calle 17 N 14-25 Barrio La Pradera Jamundi</Text>
          </View>
        </View>
      </Page>
    </Document>
  </PDFViewer>
);

export default SalesPDF; 