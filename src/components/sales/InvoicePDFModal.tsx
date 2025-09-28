import { useState } from 'react';
import { X, FileText, Download, Mail, Eye, Send, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { CompletedSale } from '../../types';

interface InvoicePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: CompletedSale;
}

const InvoicePDFModal: React.FC<InvoicePDFModalProps> = ({ isOpen, onClose, sale }) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState(sale.cliente?.email || '');
  const [emailSubject, setEmailSubject] = useState(`Gracias por tu compra, ${sale.cliente?.name || 'Cliente'}`);
  
  // Función para formatear precios - debe estar antes de las funciones que la usan
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const generateEmailMessage = () => {
    let message = `Estimado ${sale.cliente?.name || 'Cliente'}, adjunto encontrará la factura de su compra (${sale.code}).`;
    
    if (sale.tipoVenta === 'financiado' && sale.planAbonos && sale.planAbonos.length > 0) {
      message += `\n\nSu compra ha sido configurada con un plan de abonos:\n`;
      sale.planAbonos.forEach((abono, index) => {
        message += `• Abono ${index + 1}: ${formatPrice(abono.monto)} - Fecha: ${new Date(abono.fechaProgramada).toLocaleDateString()}\n`;
      });
      message += `\nRecuerde realizar los pagos en las fechas programadas.`;
    } else if (sale.tipoVenta === 'contado') {
      message += ` El pago ha sido realizado en su totalidad.`;
    }
    
    message += `\n\nGracias por elegirnos.`;
    return message;
  };

  const generateWhatsAppMessage = () => {
    let message = `¡Hola ${sale.cliente?.name || 'Cliente'}! 🎉\n\nGracias por tu compra en La Cabina Telecomunicaciones.\n\n📋 *Factura:* ${sale.code}\n💰 *Total:* ${formatPrice(sale.totalVenta)}\n💳 *Método de pago:* ${sale.metodoPago}`;
    
    if (sale.tipoVenta === 'financiado' && sale.planAbonos && sale.planAbonos.length > 0) {
      message += `\n\n📅 *Tipo de Venta:* Financiado\n*Plan de Abonos:*`;
      sale.planAbonos.forEach((abono, index) => {
        message += `\n• Abono ${index + 1}: ${formatPrice(abono.monto)} - ${new Date(abono.fechaProgramada).toLocaleDateString()}`;
      });
    } else if (sale.tipoVenta === 'contado') {
      message += `\n\n💰 *Tipo de Venta:* Contado (Pago completo)`;
    }
    
    message += `\n\nAdjunto encontrará su factura en PDF.\n\n¡Esperamos verte pronto! 😊`;
    return message;
  };

  const [emailMessage, setEmailMessage] = useState(generateEmailMessage());
  const [whatsappMessage, setWhatsappMessage] = useState(generateWhatsAppMessage());
  const [whatsappNumber, setWhatsappNumber] = useState(sale.cliente?.phone || '');
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Usar la nueva ruta mejorada - prioriza factura si está disponible
  const pdfUrl = sale.facturaId 
    ? `https://back-papeleria-two.vercel.app/v1/papeleria/factura-pdf/${sale.facturaId}`
    : `https://back-papeleria-two.vercel.app/v1/papeleria/invoice-pdf/${sale.id}`;

  // Función para mostrar PDF en nueva ventana
  const handleViewPDF = () => {
    setIsLoadingPDF(true);
    setError(null);
    try {
      window.open(pdfUrl, '_blank', 'width=800,height=900,scrollbars=yes,resizable=yes');
    } catch (error) {
      setError('Error al abrir el PDF. Verifique que su navegador permita ventanas emergentes.');
    } finally {
      setIsLoadingPDF(false);
    }
  };


  // Función para descargar PDF
  const handleDownloadPDF = () => {
    setError(null);
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `factura-${sale.code}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setError('Error al descargar el PDF. Intente nuevamente.');
    }
  };

  // Función para enviar PDF por email usando N8N
  const handleSendEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setError('Por favor ingrese un correo electrónico válido');
      return;
    }

    if (!sale.id) {
      setError('ID de venta no encontrado. Por favor, intente nuevamente.');
      return;
    }

    setIsSendingEmail(true);
    setError(null);

    try {
      const requestBody = {
        saleId: sale.id,
        email: emailAddress,
        subject: emailSubject,
        message: emailMessage
      };

      console.log('Enviando email con datos:', requestBody);

      const response = await fetch('https://back-papeleria-two.vercel.app/v1/papeleria/send-invoice-n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error response:', result);
        throw new Error(result.message || 'Error al enviar el email');
      }

      setEmailSent(true);
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailSent(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending email:', error);
      setError(error instanceof Error ? error.message : 'Error al enviar el correo electrónico');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Función para enviar por WhatsApp
  const handleSendWhatsapp = () => {
    if (!whatsappNumber || whatsappNumber.length < 10) {
      setError('Por favor ingrese un número de WhatsApp válido');
      return;
    }

    // Limpiar el número (remover espacios, guiones, etc.)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    
    // Si no tiene código de país, agregar +57 (Colombia)
    const formattedNumber = cleanNumber.startsWith('57') ? `+${cleanNumber}` : `+57${cleanNumber}`;
    
    // Crear mensaje con URL del PDF
    const messageWithPDF = `${whatsappMessage}\n\n📄 *Factura PDF:* ${pdfUrl}`;
    
    // Codificar el mensaje para URL
    const encodedMessage = encodeURIComponent(messageWithPDF);
    
    // Crear URL de WhatsApp
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Mostrar confirmación
    setWhatsappSent(true);
    setTimeout(() => {
      setWhatsappModalOpen(false);
      setWhatsappSent(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-1 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl min-h-[85vh] max-h-[98vh] my-2 sm:my-8">
        <div className="flex flex-col">
          {/* Header */}
          <div className="p-3 sm:p-6 border-b bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 mr-2 sm:mr-3 flex-shrink-0" />
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">¡Venta Exitosa!</h2>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    <p><span className="font-medium">Código:</span> {sale.code}</p>
                    <p><span className="font-medium">Total:</span> {formatPrice(sale.totalVenta)}</p>
                    <p><span className="font-medium">Método de Pago:</span> {sale.metodoPago}</p>
                    {sale.numeroFactura && (
                      <p><span className="font-medium">Factura:</span> {sale.numeroFactura}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {sale.tipoVenta && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        sale.tipoVenta === 'contado' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {sale.tipoVenta === 'contado' ? '💰 Contado' : '📅 Financiado'}
                      </span>
                    )}
                    {sale.estadoPago && (
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        sale.estadoPago === 'pagada' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.estadoPago}
                      </span>
                    )}
                  </div>
                  {sale.cliente && (
                    <p className="mt-1"><span className="font-medium">Cliente:</span> {sale.cliente.name}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-1 sm:p-2 flex-shrink-0"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6">
            <div className="space-y-3 sm:space-y-6">
              {/* Plan de abonos si es financiado */}
              {sale.tipoVenta === 'financiado' && sale.planAbonos && sale.planAbonos.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-2 sm:p-4 border border-blue-200">
                  <h4 className="text-sm sm:text-lg font-semibold text-blue-900 mb-2 sm:mb-3 flex items-center">
                    📅 Plan de Abonos Configurado
                  </h4>
                  <div className="space-y-1 sm:space-y-2">
                    {sale.planAbonos.map((abono, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded p-2 sm:p-3 border border-blue-100 gap-1 sm:gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-blue-900 text-xs sm:text-sm">Abono #{index + 1}</span>
                          <p className="text-xs text-gray-600">
                            Fecha: {new Date(abono.fechaProgramada).toLocaleDateString()}
                          </p>
                          {abono.observaciones && (
                            <p className="text-xs text-gray-500">{abono.observaciones}</p>
                          )}
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="font-bold text-blue-900 text-xs sm:text-base">{formatPrice(abono.monto)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                    <span className="font-medium text-blue-900 text-xs sm:text-base">Total del Plan:</span>
                    <span className="font-bold text-blue-900 text-sm sm:text-lg">
                      {formatPrice(sale.planAbonos.reduce((sum, abono) => sum + abono.monto, 0))}
                    </span>
                  </div>
                  {sale.diasVencimiento && (
                    <div className="mt-1 sm:mt-2 text-xs text-blue-700">
                      <strong>Días de vencimiento:</strong> {sale.diasVencimiento} días
                    </div>
                  )}
                  {sale.observaciones && (
                    <div className="mt-1 sm:mt-2 text-xs text-blue-700">
                      <strong>Observaciones:</strong> {sale.observaciones}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-blue-500 mx-auto mb-1 sm:mb-3" />
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
                  Factura PDF Generada
                </h3>
                <p className="text-xs text-gray-600 mb-2 sm:mb-4">
                  Su factura ha sido generada exitosamente. Seleccione una opción:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-3">
                {/* Descargar */}
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center p-1.5 sm:p-3 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors"
                >
                  <Download className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-green-900 text-xs">Descargar</div>
                    <div className="text-xs text-green-700">Guardar en dispositivo</div>
                  </div>
                </button>

                {/* Ver PDF */}
                <button
                  onClick={handleViewPDF}
                  disabled={isLoadingPDF}
                  className="flex items-center justify-center p-1.5 sm:p-3 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
                >
                  <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-blue-900 text-xs">Visualizar PDF</div>
                    <div className="text-xs text-blue-700">Abrir en nueva ventana</div>
                  </div>
                </button>

                {/* Enviar por Email */}
                <button
                  onClick={() => setEmailModalOpen(true)}
                  className="flex items-center justify-center p-1.5 sm:p-3 bg-orange-50 border-2 border-orange-200 rounded-lg hover:bg-orange-100 hover:border-orange-300 transition-colors"
                >
                  <Mail className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-orange-900 text-xs">Enviar Email</div>
                    <div className="text-xs text-orange-700">Enviar por correo</div>
                  </div>
                </button>

                {/* Enviar por WhatsApp */}
                <button
                  onClick={() => setWhatsappModalOpen(true)}
                  className="flex items-center justify-center p-1.5 sm:p-3 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-600 mr-1.5 sm:mr-2 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="font-semibold text-green-900 text-xs">Enviar WhatsApp</div>
                    <div className="text-xs text-green-700">Enviar por WhatsApp</div>
                  </div>
                </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Enviar Factura por Email</h3>
                <button
                  onClick={() => {
                    setEmailModalOpen(false);
                    setEmailSent(false);
                    setError(null);
                    // Resetear campos a valores por defecto
                    setEmailAddress(sale.cliente?.email || '');
                    setEmailSubject(`Gracias por tu compra, ${sale.cliente?.name || 'Cliente'}`);
                    setEmailMessage(`Estimado ${sale.cliente?.name || 'Cliente'}, adjunto encontrará la factura de su compra (${sale.code}). Gracias por elegirnos.`);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!emailSent ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Correo electrónico
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Asunto del email
                    </label>
                    <input
                      id="subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Asunto del email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Mensaje del email
                    </label>
                    <textarea
                      id="message"
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Mensaje del email"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <p><strong>Factura:</strong> {sale.code}</p>
                    <p><strong>Total:</strong> {formatPrice(sale.totalVenta)}</p>
                    <p><strong>Cliente:</strong> {sale.cliente?.name || 'Sin cliente'}</p>
                  </div>

                  {/* Vista previa del email */}
                  <div className="border rounded-md p-3 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa del email:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Para:</strong> {emailAddress || 'correo@ejemplo.com'}</p>
                      <p><strong>Asunto:</strong> {emailSubject}</p>
                      <div className="mt-2 p-2 bg-white rounded border-l-2 border-blue-200">
                        <p className="whitespace-pre-wrap">{emailMessage}</p>
                        <p className="mt-2 text-gray-500 italic">[PDF adjunto: factura-{sale.numeroFactura || sale.code}.pdf]</p>
                      </div>
                    </div>
                  </div>


                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        // Restaurar valores por defecto
                        setEmailAddress(sale.cliente?.email || '');
                        setEmailSubject(`Gracias por tu compra, ${sale.cliente?.name || 'Cliente'}`);
                        setEmailMessage(generateEmailMessage());
                      }}
                      className="px-4 py-2 text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                    >
                      Restaurar por defecto
                    </button>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setEmailModalOpen(false);
                          setError(null);
                          // Resetear campos a valores por defecto
                          setEmailAddress(sale.cliente?.email || '');
                          setEmailSubject(`Gracias por tu compra, ${sale.cliente?.name || 'Cliente'}`);
                          setEmailMessage(`Estimado ${sale.cliente?.name || 'Cliente'}, adjunto encontrará la factura de su compra (${sale.code}). Gracias por elegirnos.`);
                        }}
                        className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={isSendingEmail || !emailAddress}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
                      >
                        {isSendingEmail ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Enviar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-green-900 mb-2">¡Email Enviado!</h4>
                  <p className="text-green-700">
                    La factura ha sido enviada exitosamente a {emailAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <MessageCircle className="h-6 w-6 text-green-600 mr-2" />
                  Enviar Factura por WhatsApp
                </h3>
                <button
                  onClick={() => {
                    setWhatsappModalOpen(false);
                    setWhatsappSent(false);
                    setError(null);
                    // Resetear campos a valores por defecto
                    setWhatsappNumber(sale.cliente?.phone || '');
                    setWhatsappMessage(`¡Hola ${sale.cliente?.name || 'Cliente'}! 🎉\n\nGracias por tu compra en La Cabina Telecomunicaciones.\n\n📋 *Factura:* ${sale.code}\n💰 *Total:* ${formatPrice(sale.totalVenta)}\n💳 *Método de pago:* ${sale.metodoPago}\n\nAdjunto encontrará su factura en PDF.\n\n¡Esperamos verte pronto! 😊`);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!whatsappSent ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-1">
                      Número de WhatsApp
                    </label>
                    <input
                      id="whatsappNumber"
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="3001234567 o +573001234567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Incluya el código de país (+57) o solo el número (se agregará automáticamente)
                    </p>
                  </div>

                  <div>
                    <label htmlFor="whatsappMessage" className="block text-sm font-medium text-gray-700 mb-1">
                      Mensaje de WhatsApp
                    </label>
                    <textarea
                      id="whatsappMessage"
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      placeholder="Mensaje de WhatsApp"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use *texto* para negrita, _texto_ para cursiva. El enlace del PDF se agregará automáticamente.
                    </p>
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    <p><strong>Factura:</strong> {sale.code}</p>
                    <p><strong>Total:</strong> {formatPrice(sale.totalVenta)}</p>
                    <p><strong>Cliente:</strong> {sale.cliente?.name || 'Sin cliente'}</p>
                  </div>

                  {/* Vista previa del mensaje de WhatsApp */}
                  <div className="border rounded-md p-3 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Vista previa del mensaje:</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Para:</strong> {whatsappNumber || '3001234567'}</p>
                      <div className="mt-2 p-3 bg-white rounded border-l-4 border-green-200">
                        <p className="whitespace-pre-wrap">{whatsappMessage}</p>
                        <p className="mt-2 text-gray-500 italic">📄 *Factura PDF:* [Enlace se agregará automáticamente]</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <button
                      onClick={() => {
                        // Restaurar valores por defecto
                        setWhatsappNumber(sale.cliente?.phone || '');
                        setWhatsappMessage(`¡Hola ${sale.cliente?.name || 'Cliente'}! 🎉\n\nGracias por tu compra en La Cabina Telecomunicaciones.\n\n📋 *Factura:* ${sale.code}\n💰 *Total:* ${formatPrice(sale.totalVenta)}\n💳 *Método de pago:* ${sale.metodoPago}\n\nAdjunto encontrará su factura en PDF.\n\n¡Esperamos verte pronto! 😊`);
                      }}
                      className="px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-green-50"
                    >
                      Restaurar por defecto
                    </button>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setWhatsappModalOpen(false);
                          setError(null);
                          // Resetear campos a valores por defecto
                          setWhatsappNumber(sale.cliente?.phone || '');
                          setWhatsappMessage(`¡Hola ${sale.cliente?.name || 'Cliente'}! 🎉\n\nGracias por tu compra en La Cabina Telecomunicaciones.\n\n📋 *Factura:* ${sale.code}\n💰 *Total:* ${formatPrice(sale.totalVenta)}\n💳 *Método de pago:* ${sale.metodoPago}\n\nAdjunto encontrará su factura en PDF.\n\n¡Esperamos verte pronto! 😊`);
                        }}
                        className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSendWhatsapp}
                        disabled={!whatsappNumber}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Abrir WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-green-900 mb-2">¡WhatsApp Abierto!</h4>
                  <p className="text-green-700">
                    Se abrió WhatsApp con el mensaje preparado para {whatsappNumber}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicePDFModal;
