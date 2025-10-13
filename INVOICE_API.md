# 📄 API de Facturación - Guía para Frontend

## 📋 Tabla de Contenidos
- [Introducción](#introducción)
- [Configuración](#configuración)
- [Endpoints Principales](#endpoints-principales)
- [Flujo de Trabajo](#flujo-de-trabajo)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Tipos de Datos](#tipos-de-datos)
- [Estados de Factura](#estados-de-factura)
- [Manejo de Errores](#manejo-de-errores)

## 🚀 Introducción

El módulo de facturación permite crear, gestionar y emitir facturas electrónicas (CFDI) integradas con FacturaAPI. Las facturas pueden crearse desde cero o convertir withdrawals existentes.

## ⚙️ Configuración

### Variables de Entorno Requeridas
```env
FACTURAPI_API_KEY=sk_test_tu_api_key_aqui
```

### Instalación de Dependencias
```bash
npm install facturapi
```

## 🛠️ Endpoints Principales

### Base URL
```
/api/invoices
```

### Autenticación
Todos los endpoints requieren autenticación mediante `AuthGuard`.

---

## 📊 Flujo de Trabajo

### 1. **Crear Factura desde Withdrawal**
```http
POST /api/invoices/convert-withdrawal
```

### 2. **Crear Factura Manual**
```http
POST /api/invoices
```

### 3. **Generar CFDI en FacturaAPI**
```http
POST /api/invoices/{id}/generate-cfdi
```

### 4. **Descargar PDF Timbrado**
```http
GET /api/invoices/{id}/pdf
```

### 5. **Descargar XML del CFDI**
```http
GET /api/invoices/{id}/xml
```

### 3. **Generar CFDI**
```http
POST /api/invoices/{id}/generate-cfdi
```

### 4. **Cancelar CFDI**
```http
POST /api/invoices/{id}/cancel-cfdi
```

---

## 💡 Ejemplos de Uso

### 1. Convertir Withdrawal a Factura

#### Request
```http
POST /api/invoices/convert-withdrawal
Content-Type: application/json
Authorization: Bearer {token}

{
  "withdrawal_id": "b901b4c1-f784-4693-8b03-a3670c16acc5",
  "invoice_code": "FAC-001-2024",
  "status": "DRAFT"
}
```

#### Response
```json
{
  "id": "invoice-uuid-123",
  "code": "FAC-001-2024",
  "date": "2024-01-15T00:00:00.000Z",
  "client": {
    "id": "client-uuid",
    "code": "CLI-001",
    "name": "Cliente Ejemplo",
    "tax_document": "RFC123456789",
    "description": "Cliente de prueba",
    "address": "Calle 123, Colonia Centro",
    "phone": "555-1234",
    "email": "cliente@email.com",
    "status": true,
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "withdrawal": {
    "id": "b901b4c1-f784-4693-8b03-a3670c16acc5",
    "code": "WIT-001",
    "destination": "Venta directa",
    "amount": 1160.00,
    "type": "POS",
    "status": true,
    "created_at": "2024-01-15T00:00:00.000Z"
  },
  "subtotal": 1000.00,
  "tax_amount": 160.00,
  "total_amount": 1160.00,
  "status": "DRAFT",
  "cfdi_uuid": null,
  "facturapi_id": null,
  "payment_method": "cash",
  "payment_conditions": null,
  "notes": null,
  "details": [
    {
      "id": "detail-uuid-1",
      "quantity": 2,
      "price": 500.00,
      "subtotal": 1000.00,
      "tax_rate": 16.00,
      "tax_amount": 160.00,
      "total": 1160.00,
      "product": {
        "id": "product-uuid",
        "name": "Producto Ejemplo",
        "slug": "producto-ejemplo",
        "description": "Descripción del producto",
        "sku": "SKU-001",
        "weight": 1.5,
        "width": 10.0,
        "height": 5.0,
        "length": 15.0,
        "brand": {
          "id": "brand-uuid",
          "code": "BRAND-001",
          "name": "Marca Ejemplo",
          "description": "Descripción de marca",
          "status": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        },
        "category": {
          "id": "category-uuid",
          "code": "CAT-001",
          "name": "Categoría Ejemplo",
          "description": "Descripción de categoría",
          "status": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        },
        "tax": {
          "id": "tax-uuid",
          "code": "IVA",
          "name": "IVA",
          "rate": 16.00,
          "description": "Impuesto al Valor Agregado",
          "status": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        },
        "measurement_unit": {
          "id": "unit-uuid",
          "code": "PZA",
          "description": "Pieza",
          "status": true,
          "created_at": "2024-01-01T00:00:00.000Z"
        },
        "is_active": true,
        "type": "tangible",
        "images": [],
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### 2. Crear Factura Manual

#### Request
```http
POST /api/invoices
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "FAC-002-2024",
  "date": "2024-01-15",
  "client_id": "client-uuid-123",
  "payment_method": "card",
  "payment_conditions": "Pago a 30 días",
  "notes": "Factura de prueba",
  "details": [
    {
      "product_id": "product-uuid-123",
      "quantity": 1,
      "price": 500.00,
      "tax_rate": 16.00
    },
    {
      "product_id": "product-uuid-456",
      "quantity": 2,
      "price": 250.00,
      "tax_rate": 16.00
    }
  ]
}
```

#### Response
```json
{
  "id": "invoice-uuid-456",
  "code": "FAC-002-2024",
  "date": "2024-01-15T00:00:00.000Z",
  "client": { /* ... datos del cliente ... */ },
  "withdrawal": null,
  "subtotal": 1000.00,
  "tax_amount": 160.00,
  "total_amount": 1160.00,
  "status": "DRAFT",
  "cfdi_uuid": null,
  "facturapi_id": null,
  "payment_method": "card",
  "payment_conditions": "Pago a 30 días",
  "notes": "Factura de prueba",
  "details": [ /* ... array de detalles ... */ ],
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### 3. Generar CFDI

#### Request
```http
POST /api/invoices/invoice-uuid-123/generate-cfdi
Authorization: Bearer {token}
```

#### Response
```json
{
  "id": "invoice-uuid-123",
  "code": "FAC-001-2024",
  "date": "2024-01-15T00:00:00.000Z",
  "client": { /* ... datos del cliente ... */ },
  "withdrawal": { /* ... datos del withdrawal ... */ },
  "subtotal": 1000.00,
  "tax_amount": 160.00,
  "total_amount": 1160.00,
  "status": "SENT",
  "cfdi_uuid": "12345678-1234-1234-1234-123456789012",
  "facturapi_id": "facturapi_internal_id_123",
  "payment_method": "cash",
  "payment_conditions": null,
  "notes": null,
  "details": [ /* ... array de detalles ... */ ],
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### 4. Cancelar CFDI

#### Request
```http
POST /api/invoices/invoice-uuid-123/cancel-cfdi
Content-Type: application/json
Authorization: Bearer {token}

{
  "reason": "Error en datos del cliente"
}
```

#### Response
```json
{
  "id": "invoice-uuid-123",
  "code": "FAC-001-2024",
  "date": "2024-01-15T00:00:00.000Z",
  "client": { /* ... datos del cliente ... */ },
  "withdrawal": { /* ... datos del withdrawal ... */ },
  "subtotal": 1000.00,
  "tax_amount": 160.00,
  "total_amount": 1160.00,
  "status": "CANCELLED",
  "cfdi_uuid": "12345678-1234-1234-1234-123456789012",
  "facturapi_id": "facturapi_internal_id_123",
  "payment_method": "cash",
  "payment_conditions": null,
  "notes": null,
  "details": [ /* ... array de detalles ... */ ],
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### 5. Listar Facturas

#### Request
```http
GET /api/invoices?page=1&limit=10&term=FAC-001
Authorization: Bearer {token}
```

#### Response
```json
{
  "data": [
    {
      "id": "invoice-uuid-123",
      "code": "FAC-001-2024",
      "date": "2024-01-15T00:00:00.000Z",
      "client": { /* ... datos del cliente ... */ },
      "withdrawal": { /* ... datos del withdrawal ... */ },
      "subtotal": 1000.00,
      "tax_amount": 160.00,
      "total_amount": 1160.00,
      "status": "SENT",
      "cfdi_uuid": "12345678-1234-1234-1234-123456789012",
      "facturapi_id": "facturapi_internal_id_123",
      "payment_method": "cash",
      "payment_conditions": null,
      "notes": null,
      "details": [ /* ... array de detalles ... */ ],
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### 6. Obtener Factura Específica

#### Request
```http
GET /api/invoices/invoice-uuid-123
Authorization: Bearer {token}
```

#### Response
```json
{
  "id": "invoice-uuid-123",
  "code": "FAC-001-2024",
  "date": "2024-01-15T00:00:00.000Z",
  "client": { /* ... datos del cliente ... */ },
  "withdrawal": { /* ... datos del withdrawal ... */ },
  "subtotal": 1000.00,
  "tax_amount": 160.00,
  "total_amount": 1160.00,
  "status": "SENT",
  "cfdi_uuid": "12345678-1234-1234-1234-123456789012",
  "facturapi_id": "facturapi_internal_id_123",
  "payment_method": "cash",
  "payment_conditions": null,
  "notes": null,
  "details": [ /* ... array de detalles ... */ ],
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

---

## 📝 Gestión de Detalles

### Agregar Detalle a Factura

#### Request
```http
POST /api/invoices/invoice-uuid-123/details
Content-Type: application/json
Authorization: Bearer {token}

{
  "product_id": "product-uuid-789",
  "quantity": 3,
  "price": 100.00,
  "tax_rate": 16.00
}
```

#### Response
```json
{
  "id": "detail-uuid-789",
  "quantity": 3,
  "price": 100.00,
  "subtotal": 300.00,
  "tax_rate": 16.00,
  "tax_amount": 48.00,
  "total": 348.00,
  "product": {
    "id": "product-uuid-789",
    "name": "Nuevo Producto",
    "slug": "nuevo-producto",
    "description": "Descripción del nuevo producto",
    "sku": "SKU-789",
    "weight": 0.5,
    "width": 5.0,
    "height": 3.0,
    "length": 8.0,
    "brand": { /* ... datos de marca ... */ },
    "category": { /* ... datos de categoría ... */ },
    "tax": { /* ... datos de impuesto ... */ },
    "measurement_unit": { /* ... datos de unidad ... */ },
    "is_active": true,
    "type": "tangible",
    "images": [],
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "created_at": "2024-01-15T00:00:00.000Z"
}
```

### Listar Detalles de Factura

#### Request
```http
GET /api/invoices/invoice-uuid-123/details?product_id=product-uuid-123
Authorization: Bearer {token}
```

#### Response
```json
{
  "data": [
    {
      "id": "detail-uuid-1",
      "quantity": 2,
      "price": 500.00,
      "subtotal": 1000.00,
      "tax_rate": 16.00,
      "tax_amount": 160.00,
      "total": 1160.00,
      "product": { /* ... datos del producto ... */ },
      "created_at": "2024-01-15T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 1,
    "totalPages": 1
  }
}
```

---

## 🏷️ Tipos de Datos

### InvoiceStatus
```typescript
enum InvoiceStatus {
  DRAFT = 'DRAFT',      // Borrador
  SENT = 'SENT',        // Enviada a FacturaAPI
  PAID = 'PAID',        // Pagada
  CANCELLED = 'CANCELLED' // Cancelada
}
```

### PaymentMethod
```typescript
enum PaymentMethod {
  CASH = 'cash',        // Efectivo
  CARD = 'card',        // Tarjeta
  TRANSFER = 'transfer', // Transferencia
  CHECK = 'check'       // Cheque
}
```

### Estructura de Cliente
```typescript
interface Client {
  id: string;
  code: string;
  name: string;
  tax_document: string;  // RFC
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  status: boolean;
  created_at: Date;
}
```

### Estructura de Producto
```typescript
interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  weight?: number;
  width?: number;
  height?: number;
  length?: number;
  brand?: Brand;
  category?: Category;
  tax?: Tax;
  measurement_unit: MeasurementUnit;
  is_active: boolean;
  type: 'digital' | 'service' | 'tangible';
  images: string[];
  created_at: Date;
}
```

---

## 🔄 Estados de Factura

### DRAFT (Borrador)
- ✅ Factura creada localmente
- ❌ No enviada a FacturaAPI
- ✅ Puede ser editada
- ❌ No tiene CFDI

### SENT (Enviada)
- ✅ Enviada a FacturaAPI
- ✅ CFDI generado
- ✅ UUID asignado
- ❌ No puede ser editada

### PAID (Pagada)
- ✅ CFDI generado
- ✅ Marcada como pagada
- ❌ No puede ser editada

### CANCELLED (Cancelada)
- ✅ CFDI cancelado en FacturaAPI
- ❌ No puede ser editada
- ❌ No puede ser reactivada

---

## ⚠️ Manejo de Errores

### Errores Comunes

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Error generating CFDI with FacturaAPI",
  "error": "Bad Request"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Invoice not found",
  "error": "Not Found"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Invoice code already exists",
  "error": "Conflict"
}
```

### Validaciones

#### Campos Requeridos
- `code`: Código único de factura
- `date`: Fecha de la factura
- `client_id`: ID del cliente
- `details`: Array con al menos un producto

#### Validaciones de Negocio
- El código de factura debe ser único
- El cliente debe existir
- Los productos deben existir
- Las cantidades deben ser mayores a 0
- Los precios deben ser mayores o iguales a 0

---

## 🚀 Ejemplo de Implementación Frontend

### React/TypeScript Example

```typescript
// Servicio de Facturación
class InvoiceService {
  private baseUrl = '/api/invoices';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async convertWithdrawalToInvoice(withdrawalId: string, invoiceCode: string) {
    const response = await fetch(`${this.baseUrl}/convert-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        withdrawal_id: withdrawalId,
        invoice_code: invoiceCode,
        status: 'DRAFT'
      })
    });

    if (!response.ok) {
      throw new Error('Error converting withdrawal to invoice');
    }

    return response.json();
  }

  async generateCFDI(invoiceId: string) {
    const response = await fetch(`${this.baseUrl}/${invoiceId}/generate-cfdi`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error generating CFDI');
    }

    return response.json();
  }

  async cancelCFDI(invoiceId: string, reason: string) {
    const response = await fetch(`${this.baseUrl}/${invoiceId}/cancel-cfdi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw new Error('Error canceling CFDI');
    }

    return response.json();
  }

  async getInvoices(page = 1, limit = 10, term = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(term && { term })
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error fetching invoices');
    }

    return response.json();
  }
}

// Hook de React
function useInvoices(token: string) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invoiceService = new InvoiceService(token);

  const convertWithdrawalToInvoice = async (withdrawalId: string, invoiceCode: string) => {
    try {
      setLoading(true);
      const invoice = await invoiceService.convertWithdrawalToInvoice(withdrawalId, invoiceCode);
      setInvoices(prev => [invoice, ...prev]);
      return invoice;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const generateCFDI = async (invoiceId: string) => {
    try {
      setLoading(true);
      const updatedInvoice = await invoiceService.generateCFDI(invoiceId);
      setInvoices(prev => 
        prev.map(invoice => 
          invoice.id === invoiceId ? updatedInvoice : invoice
        )
      );
      return updatedInvoice;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    invoices,
    loading,
    error,
    convertWithdrawalToInvoice,
    generateCFDI
  };
}
```

---

## 📚 Endpoints Completos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/invoices` | Crear factura manual |
| `GET` | `/api/invoices` | Listar facturas |
| `GET` | `/api/invoices/:id` | Obtener factura |
| `PUT` | `/api/invoices/:id` | Actualizar factura |
| `DELETE` | `/api/invoices/:id` | Eliminar factura |
| `POST` | `/api/invoices/convert-withdrawal` | Convertir withdrawal a factura |
| `POST` | `/api/invoices/:id/generate-cfdi` | Generar CFDI |
| `POST` | `/api/invoices/:id/cancel-cfdi` | Cancelar CFDI |
| `POST` | `/api/invoices/:id/details` | Agregar detalle |
| `GET` | `/api/invoices/:id/details` | Listar detalles |
| `GET` | `/api/invoices/:id/details/:detailId` | Obtener detalle |
| `PUT` | `/api/invoices/:id/details/:detailId` | Actualizar detalle |
| `DELETE` | `/api/invoices/:id/details/:detailId` | Eliminar detalle |

---

## 🔧 Consideraciones Técnicas

### Paginación
- Usar parámetros `page` y `limit` en queries
- Respuesta incluye `meta` con información de paginación

### Filtros
- Usar parámetro `term` para búsqueda por texto
- Filtrar por `product_id` en detalles

### Validaciones
- Todos los campos requeridos deben ser validados
- UUIDs deben tener formato válido
- Fechas en formato ISO 8601

### Manejo de Estados
- Verificar estado antes de operaciones
- Solo facturas en estado `DRAFT` pueden ser editadas
- Solo facturas con CFDI pueden ser canceladas

---

## 📄 Descarga de Documentos

### PDF Timbrado
```http
GET /api/invoices/{id}/pdf
```

**Descripción:** Descarga el PDF timbrado oficial del CFDI generado en FacturaAPI.

**Respuesta:** Archivo PDF binario con headers apropiados para descarga.

**Headers de Respuesta:**
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="factura.pdf"`

**Requisitos:**
- La factura debe tener un `cfdi_uuid` válido
- La factura debe haber sido generada exitosamente en FacturaAPI

### XML del CFDI
```http
GET /api/invoices/{id}/xml
```

**Descripción:** Descarga el archivo XML del CFDI para uso contable y fiscal.

**Respuesta:** Archivo XML del CFDI con headers apropiados para descarga.

**Headers de Respuesta:**
- `Content-Type: application/xml`
- `Content-Disposition: attachment; filename="factura.xml"`

**Requisitos:**
- La factura debe tener un `cfdi_uuid` válido
- La factura debe haber sido generada exitosamente en FacturaAPI

### Ejemplo de Uso en Frontend

#### React/TypeScript
```typescript
// Hook para descargar PDF
const useDownloadPDF = () => {
  const downloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Error downloading PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  };

  return { downloadPDF };
};

// Hook para descargar XML
const useDownloadXML = () => {
  const downloadXML = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/xml`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `factura_${invoiceId}.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Error downloading XML');
      }
    } catch (error) {
      console.error('Error downloading XML:', error);
      throw error;
    }
  };

  return { downloadXML };
};

// Componente de ejemplo
const InvoiceActions = ({ invoiceId }: { invoiceId: string }) => {
  const { downloadPDF } = useDownloadPDF();
  const { downloadXML } = useDownloadXML();

  return (
    <div className="flex gap-2">
      <button 
        onClick={() => downloadPDF(invoiceId)}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        📄 Descargar PDF
      </button>
      <button 
        onClick={() => downloadXML(invoiceId)}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        📋 Descargar XML
      </button>
    </div>
  );
};
```

#### JavaScript Vanilla
```javascript
// Función para descargar PDF
async function downloadPDF(invoiceId) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error('Error downloading PDF');
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
  }
}

// Función para descargar XML
async function downloadXML(invoiceId) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/xml`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura_${invoiceId}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error('Error downloading XML');
    }
  } catch (error) {
    console.error('Error downloading XML:', error);
  }
}
```

### Estados de Descarga

| Estado | Descripción | Acción Disponible |
|--------|-------------|-------------------|
| `DRAFT` | Factura creada pero no timbrada | ❌ No se puede descargar |
| `GENERATED` | CFDI generado en FacturaAPI | ✅ PDF y XML disponibles |
| `CANCELLED` | CFDI cancelado | ✅ PDF y XML disponibles (marcados como cancelados) |

### Manejo de Errores

```typescript
// Ejemplo de manejo de errores
try {
  await downloadPDF(invoiceId);
} catch (error) {
  if (error.message.includes('not been generated')) {
    // Mostrar mensaje: "La factura debe ser timbrada primero"
    showMessage('La factura debe ser timbrada primero');
  } else if (error.message.includes('not_found')) {
    // Mostrar mensaje: "Factura no encontrada"
    showMessage('Factura no encontrada');
  } else {
    // Error genérico
    showMessage('Error al descargar el documento');
  }
}
```

---

## 📞 Soporte

Para dudas o problemas con la API de facturación, contactar al equipo de desarrollo.

**Última actualización:** Enero 2024
