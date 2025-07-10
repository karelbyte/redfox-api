# Servicio de Devoluciones a Proveedores

Este servicio permite realizar devoluciones de productos desde almacenes hacia proveedores, manteniendo un control preciso del inventario y un historial completo de todas las operaciones.

## Características

- **Devoluciones a proveedores**: Permite devolver productos desde un almacén hacia un proveedor
- **Gestión separada de detalles**: Las devoluciones se crean primero y luego se agregan los detalles uno por uno
- **Validación de stock**: Verifica que haya suficiente inventario en el almacén origen antes de procesar
- **Códigos únicos**: Genera códigos únicos automáticamente para cada devolución (formato: DEV + fecha + secuencial)
- **Historial completo**: Registra todas las operaciones en el historial de productos
- **Transacciones seguras**: Utiliza transacciones de base de datos para garantizar la integridad de los datos
- **Filtros y paginación**: Permite consultar devoluciones con filtros por almacén, proveedor y fechas
- **Procesamiento manual**: Las devoluciones se procesan manualmente cuando están listas

## Estructura de la Base de Datos

### Tabla: `returns`
- `id`: Identificador único (UUID)
- `code`: Código único de la devolución (formato: DEV + fecha + secuencial)
- `source_warehouse_id`: ID del almacén origen
- `target_provider_id`: ID del proveedor destino
- `date`: Fecha de la devolución
- `description`: Descripción opcional de la devolución
- `status`: Estado de la devolución (true = procesada, false = activa)
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### Tabla: `return_details`
- `id`: Identificador único (UUID)
- `return_id`: ID de la devolución padre
- `product_id`: ID del producto
- `quantity`: Cantidad devuelta
- `price`: Precio unitario del producto
- `created_at`, `updated_at`, `deleted_at`: Timestamps

## Endpoints de la API

### POST `/returns`
Crea una nueva devolución a proveedor (sin detalles).

**Body:**
```json
{
  "code": "DEV202412150001", // Opcional, se genera automáticamente
  "sourceWarehouseId": "uuid-del-almacen",
  "targetProviderId": "uuid-del-proveedor",
  "date": "2024-12-15",
  "description": "Devolución de productos defectuosos"
}
```

### POST `/returns/:id/details`
Agrega un detalle a una devolución existente.

**Body:**
```json
{
  "productId": "uuid-del-producto",
  "quantity": 5,
  "price": 25.50
}
```

### GET `/returns/:id/details`
Obtiene todos los detalles de una devolución con paginación.

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `productId`: Filtrar por producto específico

### GET `/returns/:id/details/:detailId`
Obtiene un detalle específico de una devolución.

### PUT `/returns/:id/details/:detailId`
Actualiza un detalle específico de una devolución.

**Body:**
```json
{
  "quantity": 10,
  "price": 30.00
}
```

### DELETE `/returns/:id/details/:detailId`
Elimina un detalle específico de una devolución.

### POST `/returns/:id/process`
Procesa una devolución, actualizando el inventario y registrando en el historial.

### GET `/returns`
Obtiene todas las devoluciones con paginación y filtros.

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `sourceWarehouseId`: Filtrar por almacén origen
- `targetProviderId`: Filtrar por proveedor destino
- `startDate`: Filtrar desde fecha
- `endDate`: Filtrar hasta fecha

### GET `/returns/:id`
Obtiene una devolución específica con todos sus detalles.

### DELETE `/returns/:id`
Elimina una devolución (solo si no ha sido procesada).

## Flujo de Trabajo

1. **Crear devolución**: Se crea la devolución con almacén origen y proveedor destino
2. **Agregar detalles**: Se agregan los productos a devolver con cantidades y precios
3. **Validar stock**: El sistema verifica que haya suficiente inventario en el almacén
4. **Procesar devolución**: Se actualiza el inventario y se registra en el historial
5. **Marcar como procesada**: La devolución se marca como procesada

## Validaciones

- El almacén origen debe existir y estar cerrado
- El proveedor destino debe existir
- Debe haber suficiente stock en el almacén origen
- No se puede procesar una devolución sin detalles
- No se puede eliminar una devolución ya procesada

## Códigos de Devolución

Los códigos se generan automáticamente con el formato: `DEV + YYYYMMDD + secuencial de 4 dígitos`

Ejemplo: `DEV202412150001`

## Historial de Productos

Al procesar una devolución, se registran las siguientes operaciones en el historial:

- **RETURN_OUT**: Salida de productos del almacén origen
- Se actualiza el inventario del almacén origen (reducción)
- Se registra la operación con cantidad, precio y stock actual

## Ejemplo de Respuesta

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "DEV202412150001",
  "sourceWarehouse": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "code": "ALM001",
    "name": "Almacén Principal",
    "address": "Av. Principal 123, Ciudad",
    "phone": "+1234567890",
    "is_open": false,
    "status": true,
    "currency": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "code": "USD",
      "name": "Dólar Estadounidense",
      "symbol": "$",
      "is_active": true,
      "created_at": "2024-12-15T10:00:00.000Z"
    },
    "created_at": "2024-12-15T10:00:00.000Z"
  },
  "targetProvider": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "code": "PROV001",
    "description": "Proveedor de Tecnología",
    "name": "Tech Solutions S.A.",
    "document": "12345678-9",
    "phone": "+1234567891",
    "email": "contact@techsolutions.com",
    "address": "Calle Proveedor 456, Ciudad",
    "status": true,
    "created_at": "2024-12-15T10:00:00.000Z"
  },
  "date": "2024-12-15T10:00:00.000Z",
  "description": "Devolución de productos defectuosos",
  "status": true,
  "details": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "product": {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "Laptop HP Pavilion",
        "slug": "laptop-hp-pavilion",
        "description": "Laptop de alto rendimiento",
        "sku": "LAP001",
        "weight": 2.5,
        "width": 35.0,
        "height": 2.5,
        "length": 25.0,
        "brand": {
          "id": "550e8400-e29b-41d4-a716-446655440006",
          "name": "HP",
          "is_active": true,
          "created_at": "2024-12-15T10:00:00.000Z"
        },
        "category": {
          "id": "550e8400-e29b-41d4-a716-446655440007",
          "name": "Electrónicos",
          "is_active": true,
          "created_at": "2024-12-15T10:00:00.000Z"
        },
        "tax": {
          "id": "550e8400-e29b-41d4-a716-446655440008",
          "name": "IVA",
          "percentage": 16.0,
          "is_active": true,
          "created_at": "2024-12-15T10:00:00.000Z"
        },
        "measurement_unit": {
          "id": "550e8400-e29b-41d4-a716-446655440009",
          "name": "Unidad",
          "symbol": "un",
          "is_active": true,
          "created_at": "2024-12-15T10:00:00.000Z"
        },
        "is_active": true,
        "type": "PRODUCT",
        "images": ["laptop-hp-1.jpg", "laptop-hp-2.jpg"],
        "created_at": "2024-12-15T10:00:00.000Z"
      },
      "quantity": 2,
      "price": 899.99,
      "created_at": "2024-12-15T10:00:00.000Z"
    }
  ],
  "created_at": "2024-12-15T10:00:00.000Z"
}
```

## Diferencias con Ajustes de Almacén

| Aspecto | Ajustes de Almacén | Devoluciones |
|---------|-------------------|--------------|
| **Origen** | Almacén | Almacén |
| **Destino** | Almacén | Proveedor |
| **Tipo de Operación** | Transferencia entre almacenes | Devolución a proveedor |
| **Código** | AJU + fecha + secuencial | DEV + fecha + secuencial |
| **Historial** | TRANSFER_OUT + TRANSFER_IN | RETURN_OUT |
| **Inventario** | Reduce origen, aumenta destino | Solo reduce origen |
| **Estado** | true = activo, false = procesado | true = procesado, false = activo |

## Casos de Uso

1. **Productos defectuosos**: Devolver productos con fallas de fabricación
2. **Productos vencidos**: Devolver productos que han expirado
3. **Errores de pedido**: Devolver productos que no corresponden al pedido
4. **Productos dañados**: Devolver productos que llegaron en mal estado
5. **Sobrestock**: Devolver productos que no se pueden vender

## Seguridad

- Todas las operaciones requieren autenticación
- Se valida el stock disponible antes de procesar
- Se utilizan transacciones para garantizar integridad
- No se pueden eliminar devoluciones procesadas
- Se mantiene un historial completo de todas las operaciones 