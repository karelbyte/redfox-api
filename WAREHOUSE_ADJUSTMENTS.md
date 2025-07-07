# Servicio de Ajustes entre Almacenes

Este servicio permite realizar transferencias de productos entre diferentes almacenes, manteniendo un control preciso del inventario y un historial completo de todas las operaciones.

## Características

- **Transferencias entre almacenes**: Permite mover productos de un almacén origen a un almacén destino
- **Gestión separada de detalles**: Los ajustes se crean primero y luego se agregan los detalles uno por uno
- **Validación de stock**: Verifica que haya suficiente inventario en el almacén origen antes de procesar
- **Códigos únicos**: Genera códigos únicos automáticamente para cada ajuste (formato: AJU + fecha + secuencial)
- **Historial completo**: Registra todas las operaciones en el historial de productos
- **Transacciones seguras**: Utiliza transacciones de base de datos para garantizar la integridad de los datos
- **Filtros y paginación**: Permite consultar ajustes con filtros por almacén y fechas
- **Procesamiento manual**: Los ajustes se procesan manualmente cuando están listos

## Estructura de la Base de Datos

### Tabla: `warehouse_adjustments`
- `id`: Identificador único (UUID)
- `code`: Código único del ajuste (formato: AJU + fecha + secuencial)
- `source_warehouse_id`: ID del almacén origen
- `target_warehouse_id`: ID del almacén destino
- `date`: Fecha del ajuste
- `description`: Descripción opcional del ajuste
- `status`: Estado del ajuste (true = activo, false = procesado)
- `created_at`, `updated_at`, `deleted_at`: Timestamps

### Tabla: `warehouse_adjustment_details`
- `id`: Identificador único (UUID)
- `warehouse_adjustment_id`: ID del ajuste padre
- `product_id`: ID del producto
- `quantity`: Cantidad transferida
- `price`: Precio unitario del producto
- `created_at`, `updated_at`, `deleted_at`: Timestamps

## Endpoints de la API

### POST `/warehouse-adjustments`
Crea un nuevo ajuste entre almacenes (sin detalles).

**Body:**
```json
{
  "sourceWarehouseId": "uuid-del-almacen-origen",
  "targetWarehouseId": "uuid-del-almacen-destino",
  "date": "2024-12-01",
  "description": "Transferencia mensual de inventario"
}
```

**Respuesta:**
```json
{
  "id": "uuid-del-ajuste",
  "code": "AJU202412010001",
  "sourceWarehouse": {
    "id": "uuid-del-almacen-origen",
    "code": "ALM-CENTRAL",
    "name": "Almacén Central"
  },
  "targetWarehouse": {
    "id": "uuid-del-almacen-destino",
    "code": "ALM-NORTE",
    "name": "Almacén Norte"
  },
  "date": "2024-12-01T00:00:00.000Z",
  "description": "Transferencia mensual de inventario",
  "status": true,
  "details": [],
  "created_at": "2024-12-01T10:00:00.000Z"
}
```

### POST `/warehouse-adjustments/:id/details`
Agrega un detalle al ajuste.

**Body:**
```json
{
  "productId": "uuid-del-producto",
  "quantity": 10,
  "price": 25.50
}
```

**Respuesta:**
```json
{
  "id": "uuid-del-detalle",
  "product": {
    "id": "uuid-del-producto",
    "name": "Producto Ejemplo",
    "sku": "PROD-001"
  },
  "quantity": 10,
  "price": 25.50,
  "created_at": "2024-12-01T10:00:00.000Z"
}
```

### GET `/warehouse-adjustments/:id/details`
Obtiene los detalles de un ajuste con paginación y filtros.

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `productId`: Filtrar por producto específico

### PUT `/warehouse-adjustments/:id/details/:detailId`
Actualiza un detalle específico del ajuste.

**Body:**
```json
{
  "quantity": 15,
  "price": 30.00
}
```

### DELETE `/warehouse-adjustments/:id/details/:detailId`
Elimina un detalle específico del ajuste.

### POST `/warehouse-adjustments/:id/process`
Procesa el ajuste, actualizando el inventario y registrando en el historial.

**Respuesta:**
```json
{
  "id": "uuid-del-ajuste",
  "code": "AJU202412010001",
  "sourceWarehouse": { ... },
  "targetWarehouse": { ... },
  "date": "2024-12-01T00:00:00.000Z",
  "description": "Transferencia mensual de inventario",
  "status": false,
  "details": [
    {
      "id": "uuid-del-detalle",
      "product": { ... },
      "quantity": 10,
      "price": 25.50,
      "created_at": "2024-12-01T10:00:00.000Z"
    }
  ],
  "created_at": "2024-12-01T10:00:00.000Z"
}
```

### GET `/warehouse-adjustments`
Obtiene la lista de ajustes con paginación y filtros.

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10)
- `sourceWarehouseId`: Filtrar por almacén origen
- `targetWarehouseId`: Filtrar por almacén destino
- `startDate`: Fecha de inicio (formato: YYYY-MM-DD)
- `endDate`: Fecha de fin (formato: YYYY-MM-DD)

### GET `/warehouse-adjustments/:id`
Obtiene un ajuste específico por su ID.

### DELETE `/warehouse-adjustments/:id`
Elimina un ajuste (soft delete). Solo se pueden eliminar ajustes que no han sido procesados.

## Flujo de Trabajo

1. **Crear el ajuste**: Se crea el ajuste principal sin detalles
2. **Agregar detalles**: Se agregan los productos uno por uno con sus cantidades y precios
3. **Revisar y ajustar**: Se pueden modificar o eliminar detalles según sea necesario
4. **Procesar el ajuste**: Cuando todo está listo, se procesa el ajuste completo
5. **Actualización automática**: Se actualiza el inventario y se registra en el historial

## Validaciones

1. **Almacenes válidos**: Los almacenes origen y destino deben existir y estar abiertos
2. **Almacenes diferentes**: El almacén origen y destino no pueden ser el mismo
3. **Productos válidos**: Los productos deben existir en el sistema
4. **Cantidades positivas**: Las cantidades deben ser mayores a cero
5. **Stock suficiente**: Al procesar, debe haber suficiente inventario en el almacén origen
6. **Ajuste activo**: Solo se pueden procesar ajustes que estén activos (status = true)
7. **Detalles requeridos**: El ajuste debe tener al menos un detalle para ser procesado

## Historial de Productos

Cada ajuste procesado genera dos registros en el historial de productos:
- **TRANSFER_OUT**: Para el almacén origen (reducción de stock)
- **TRANSFER_IN**: Para el almacén destino (aumento de stock)

## Permisos Requeridos

- `warehouse_adjustment_module_view`: Ver el módulo de ajustes
- `warehouse_adjustment_create`: Crear ajustes
- `warehouse_adjustment_read`: Leer ajustes
- `warehouse_adjustment_update`: Actualizar ajustes
- `warehouse_adjustment_delete`: Eliminar ajustes

## Ejemplo de Uso

```typescript
// 1. Crear el ajuste
const adjustment = await warehouseAdjustmentService.create({
  sourceWarehouseId: 'uuid-almacen-origen',
  targetWarehouseId: 'uuid-almacen-destino',
  date: '2024-12-01',
  description: 'Transferencia de productos al almacén norte'
});

// 2. Agregar detalles
await warehouseAdjustmentService.createDetail(adjustment.id, {
  productId: 'uuid-producto-1',
  quantity: 5,
  price: 15.00
});

await warehouseAdjustmentService.createDetail(adjustment.id, {
  productId: 'uuid-producto-2',
  quantity: 3,
  price: 25.50
});

// 3. Consultar detalles
const details = await warehouseAdjustmentService.findAllDetails(
  adjustment.id,
  { page: 1, limit: 10 }
);

// 4. Procesar el ajuste
const processedAdjustment = await warehouseAdjustmentService.processAdjustment(adjustment.id);
```

## Consideraciones Importantes

1. **Transacciones**: El procesamiento se realiza dentro de transacciones para garantizar la integridad
2. **Rollback automático**: Si ocurre algún error durante el procesamiento, se revierten todos los cambios
3. **Códigos únicos**: Los códigos se generan automáticamente con formato AJU + fecha + secuencial
4. **Soft delete**: Los ajustes se eliminan de forma lógica (soft delete)
5. **Auditoría**: Todos los cambios quedan registrados en el historial de productos
6. **Estado del ajuste**: Los ajustes tienen un estado que indica si han sido procesados
7. **Gestión flexible**: Los detalles se pueden agregar, modificar y eliminar antes del procesamiento 