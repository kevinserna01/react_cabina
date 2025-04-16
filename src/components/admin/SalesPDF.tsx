import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { Sale } from './SalesContent';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    alignItems: 'center',
    height: 24,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  column: {
    flexGrow: 1,
    fontSize: 12,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  table: {
    width: 'auto',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    minHeight: 24,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    padding: 4,
  },
  total: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderTopStyle: 'solid',
    paddingTop: 10,
  },
});

interface SalesPDFProps {
  sale: Sale;
}

const SalesPDF = ({ sale }: SalesPDFProps) => (
  <PDFViewer style={{ width: '100%', height: '80vh' }}>
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Comprobante de Venta</Text>
          <Text style={styles.text}>Código: {sale.code}</Text>
          <Text style={styles.text}>Fecha: {sale.fechaColombia}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.text, styles.bold]}>Información del Cliente:</Text>
          <Text style={styles.text}>
            {sale.cliente
              ? `${sale.cliente.nombre} (${sale.cliente.documento})`
              : 'Sin cliente registrado'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.text, styles.bold]}>Productos:</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Código</Text>
              <Text style={styles.tableCell}>Producto</Text>
              <Text style={styles.tableCell}>Cantidad</Text>
              <Text style={styles.tableCell}>Precio Unit.</Text>
              <Text style={styles.tableCell}>Total</Text>
            </View>
            {sale.productos.map((producto, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{producto.code}</Text>
                <Text style={styles.tableCell}>{producto.name}</Text>
                <Text style={styles.tableCell}>{producto.cantidad}</Text>
                <Text style={styles.tableCell}>
                  ${producto.precioUnitario.toLocaleString('es-CO')}
                </Text>
                <Text style={styles.tableCell}>
                  ${producto.total.toLocaleString('es-CO')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.total}>
          <Text style={[styles.text, styles.bold]}>
            Método de Pago: {sale.metodoPago}
          </Text>
          <Text style={[styles.text, styles.bold]}>
            Total: ${sale.totalVenta.toLocaleString('es-CO')}
          </Text>
        </View>
      </Page>
    </Document>
  </PDFViewer>
);

export default SalesPDF; 