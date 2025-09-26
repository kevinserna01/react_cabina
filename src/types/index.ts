export interface Product {
  id: string;
  name: string;
  code: string;
  // Precio de venta (compatibilidad hacia atrás)
  price: number;
  // Nuevo: precio de costo y precio de venta explícitos
  costPrice?: number;
  salePrice?: number;
  // Margen de ganancia calculado por backend
  profitMargin?: number;
  stock: number;
  category: string;
  image?: string;
  description?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Customer {
  id?: string;
  name: string;
  document: string;
  email?: string;
  phone?: string;
}

// Cliente completo del backend (módulo de cartera/clientes)
export type TipoIdentificacion = 'CC' | 'NIT' | 'CE' | 'TI' | 'RC' | 'PAS';
export type TipoCliente = 'individual' | 'empresa' | 'mayorista';
export type EstadoCliente = 'activo' | 'inactivo';

export interface CustomerEntity {
  id: string;
  tipoIdentificacion: TipoIdentificacion;
  numeroIdentificacion: string;
  nombre: string;
  email: string;
  telefono: string;
  departamento?: string;
  ciudad?: string;
  ubicacionLocal?: string;
  tipoCliente: TipoCliente;
  descuentoPersonalizado?: number;
  estado?: EstadoCliente;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  status: 'Success' | 'Error';
  message: string;
  data: {
    items: T[];
    pagination: PaginationInfo;
  };
}

export interface Sale {
  id: string;
  items: CartItem[];
  customer?: Customer;
  total: number;
  date: Date;
  status: 'pending' | 'completed' | 'cancelled';
} 

// Facturación (backend moderno)
export type InvoiceStatus = 'pendiente' | 'pagada' | 'parcialmente_pagada' | 'vencida' | 'cancelada';

export interface InvoiceItem {
  code: string;
  cantidad: number;
  precioUnitario: number;
}

export interface InvoiceEntity {
  id: string;
  clienteId: string;
  // Cuando el backend incluye el cliente embebido en la factura
  cliente?: {
    id: string;
    nombre: string;
    tipoIdentificacion?: string;
    numeroIdentificacion?: string;
    email?: string;
    telefono?: string;
    ciudad?: string;
    ubicacionLocal?: string;
  };
  numeroFactura?: string;
  productos: InvoiceItem[];
  descuentoAplicado?: number; // porcentaje 0-100
  iva?: number; // porcentaje (ej. 19)
  observaciones?: string;
  metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia';
  diasVencimiento?: number;
  estado: InvoiceStatus;
  fechaEmision?: string; // YYYY-MM-DD HH:mm:ss
  total?: number;
  saldoPendiente?: number;
  fechaVencimiento?: string; // YYYY-MM-DD HH:mm:ss
}

// Abonos
export interface PaymentEntity {
  id: string;
  facturaId: string;
  clienteId?: string;
  montoAbono: number;
  metodoPago: 'Efectivo' | 'Nequi' | 'Transferencia';
  observaciones?: string;
  fechaRegistro?: string; // YYYY-MM-DD HH:mm:ss
  fechaAbono?: string; // ISO string, alias del backend
  usuarioRegistra?: string;
}

// Estado de Cuenta
export interface AccountCustomer {
  id: string;
  nombre: string;
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
  email?: string;
  telefono?: string;
  ciudad?: string;
  ubicacionLocal?: string;
}

export interface AccountSummary {
  totalFacturado: number;
  totalAbonado: number;
  saldoPendiente: number;
  facturasPendientes?: number;
  facturasVencidas?: number;
}

export interface AccountStatement {
  customer: AccountCustomer;
  summary: AccountSummary;
  invoices: InvoiceEntity[];
  payments: PaymentEntity[];
  metrics?: {
    diasVencimientoPromedio?: number;
    [key: string]: number | undefined;
  };
}

// Reportes de Cartera
export interface CarteraReportItem {
  id?: string;
  numeroFactura?: string;
  clienteNombre?: string;
  estado?: InvoiceStatus;
  total?: number;
  saldoPendiente?: number;
  metodoPago?: 'Efectivo' | 'Nequi' | 'Transferencia' | string;
  diasVencido?: number;
  fechaEmision?: string;
  fechaVencimiento?: string;
}

export interface CarteraReportSummary {
  totalFacturado: number;
  totalPendiente: number;
  totalAbonado: number;
  facturasPendientes: number;
  facturasVencidas: number;
}

export interface CarteraReportData {
  items: CarteraReportItem[];
  summary: CarteraReportSummary;
}

export interface InvoicePaginationResponse {
  status: 'Success' | 'Error';
  message: string;
  data: {
    items: InvoiceEntity[];
    pagination: PaginationInfo;
  };
}