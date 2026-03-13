/**
 * Opciones para la generación de CFDI con Factura Green
 * Soporta todos los casos especiales de emisión de facturas
 */

export interface GenerateCFDIOptions {
  // Método de pago: PUE (Pago en Una Exhibición) o PPD (Pago en Parcialidades o Diferido)
  paymentMethod?: 'PUE' | 'PPD';

  // CASO 1: Precios dinámicos por producto (solo para productos con price.type = 'dynamic')
  // Key: product_id, Value: precio a usar
  itemPrices?: Record<string, number>;

  // CASO 2: Cambiar descripción de productos específicos
  // Key: product_id, Value: nueva descripción
  itemDescriptions?: Record<string, string>;

  // CASO 3: Descuentos por producto
  // Key: product_id, Value: descuento (< 1 = porcentaje, >= 1 = monto fijo)
  itemDiscounts?: Record<string, number>;

  // CASO 4: Datos de estudiante para productos IEDU (colegiaturas)
  // Key: product_id, Value: datos del estudiante
  ieduData?: Record<string, IEDUStudentData>;

  // CASO 5: Cambiar dirección del emisor (sucursales)
  businessAddress?: {
    street?: string;
    zip: string;
  };

  // CASO 6: Modificar fecha de emisión (hasta 72 horas atrás)
  // Valores posibles: '-1d', '-2d', '-3d'
  emmitDateOffset?: '-1d' | '-2d' | '-3d';

  // CASO 7: Condiciones de pago personalizadas
  // Por defecto es 'CONDICIONES', puede ser 'CONTADO', etc.
  paymentConditions?: string;

  // CASO 8: Complemento de donatarias
  donatarias?: DonatariasData;

  // CASO 9: Facturas globales (Público en General)
  global?: GlobalInvoiceData;
}

export interface IEDUStudentData {
  student_name: string;  // Nombre completo del estudiante
  student_popid: string; // CURP del estudiante
}

export interface DonatariasData {
  auth_number: string;   // Número de autorización del oficio
  auth_date: string;     // Fecha de autorización (formato: dd/mm/yyyy)
  legend?: string;       // Leyenda personalizada (opcional, usa default si no se proporciona)
}

export interface GlobalInvoiceData {
  period: string;        // Clave del mes (c_Meses): '01' a '12'
  periodicity: string;   // Clave de periodicidad (c_Periodicidad): '01' = Diario, '02' = Semanal, etc.
  year: string;          // Año de causación: '2024', '2025', etc.
  enforceGlobal?: boolean; // Si es false, no aplica reglas de producto global (default: true)
}
