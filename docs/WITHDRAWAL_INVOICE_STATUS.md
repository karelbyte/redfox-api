# Estado fiscal de ventas (withdrawals): nota vs factura

## Objetivo

Poder saber por cada venta (withdrawal) si:
- Es solo **nota** (recibo en el pack, público en general).
- Está **facturada directo** (factura con RFC del cliente).
- Está **facturada en global** (incluida en una factura global del pack).

Ejemplo: 110 ventas como nota → luego se hace una factura global; 7 ventas se facturan directo con RFC. El sistema debe reflejar cada caso.

---

## Estado actual del sistema

### Tabla `withdrawals` (ventas)

| Campo | Uso actual |
|-------|------------|
| `pack_receipt_id` | ID del recibo (nota) en el PAC cuando la venta POS se cierra. |
| `pack_receipt_response` | Respuesta completa del PAC al crear el recibo. |

- **No hay** `invoice_id` ni ningún enlace directo a la factura (directa o global).
- Para saber si una venta tiene factura directa hoy se hace: `SELECT * FROM invoices WHERE withdrawal_id = X`.

### Tabla `invoices`

| Campo | Uso actual |
|-------|------------|
| `withdrawal_id` | Solo se llena cuando la factura se crea **a partir de una venta** (factura directa). |
| `pack_invoice_id` | ID de la factura en el PAC. |
| `pack_invoice_response` | Respuesta del PAC al timbrar. |

- **Factura directa:** `Invoice.withdrawal_id = Withdrawal.id` (relación 1:1).
- **Factura global:** No está implementada en nuestro backend. En el pack (FacturaAPI) se crea una factura que agrupa varios recibos; en nuestra BD no hay fila de `invoices` para esa global ni forma de marcar qué ventas quedaron incluidas.

### Flujo actual

1. **Venta POS cerrada** → `PosPackSyncService.createReceiptForWithdrawal` crea recibo en el pack → se guarda `pack_receipt_id` en la withdrawal.
2. **Factura directa** → Usuario “Facturar” en una venta → `InvoiceService.convertWithdrawalToInvoice` crea `Invoice` con `withdrawal_id` y luego se timbra (`generateCFDI`). La withdrawal **no** tiene FK a la factura; el enlace es solo `Invoice.withdrawal_id`.
3. **Factura global** → No hay flujo en nuestra app; habría que llamar al pack (ej. `POST /receipts/global-invoice`) y luego actualizar nuestro modelo.

### API y front

- **WithdrawalResponseDto** incluye `pack_receipt_id` pero **no** incluye estado fiscal ni `invoice_id`.
- **WithdrawalMapper** (usado en Invoice, etc.) **no** mapea `pack_receipt_id`; el mapper interno de `WithdrawalService` sí lo pone al listar/obtener withdrawals.
- **Front:** tipo `Sale` no tiene `pack_receipt_id`, `invoice_id` ni estado fiscal; no se puede mostrar “nota / facturada directo / facturada global”.

---

## Qué falta para el control completo

1. **En BD:** que cada venta sepa si tiene factura y cuál (directa o global).
2. **En backend:** al convertir withdrawal → invoice, marcar la withdrawal con esa invoice; y al crear factura global, crear la `Invoice` en nuestra BD y marcar todas las ventas incluidas.
3. **En API:** que cada withdrawal/sale devuelva un **estado fiscal** claro y, si aplica, datos de la factura (para enlace y detalle).
4. **En front:** usar ese estado para mostrar “Nota”, “Facturada (directo)”, “Facturada (global)” y enlace a la factura.

---

## Plan de cambios recomendado

### 1. Schema: columna `invoice_id` en `withdrawals`

- Añadir en `withdrawals`:
  - `invoice_id` (UUID, nullable, FK a `invoices.id`).
- Semántica:
  - **Factura directa:** al crear `Invoice` desde una withdrawal, además de `Invoice.withdrawal_id = W.id`, hacer `Withdrawal.invoice_id = Invoice.id`.
  - **Factura global:** al crear la factura global en el pack, crear una fila en `invoices` (sin `withdrawal_id`), con `pack_invoice_id` de la global; luego actualizar todas las withdrawals cuyos `pack_receipt_id` se incluyeron en esa global: `withdrawal.invoice_id = esa_invoice.id`.

Así cada venta tiene como máximo una factura (directa o global) y el front puede saber “tiene factura” y “es directa o global” según `invoice.withdrawal_id` (igual a esta venta → directa; null → global).

### 2. Migración

- Nueva migración: añadir columna `invoice_id` en `withdrawals` y FK a `invoices(id)`.

### 3. Backend

- **Entidad `Withdrawal`:** añadir relación `ManyToOne` a `Invoice` y campo `invoiceId`.
- **InvoiceService.convertWithdrawalToInvoice:** después de crear y guardar la `Invoice`, actualizar la withdrawal: `withdrawal.invoice_id = savedInvoice.id`, guardar withdrawal.
- **Nuevo flujo “Crear factura global”:**
  - Endpoint (ej. `POST /invoices/global`) que reciba periodo (from/to) o lista de `withdrawal_ids` (o `pack_receipt_ids`).
  - Llamar al pack `createGlobalInvoice` (FacturaAPI) con esos recibos.
  - Crear en nuestra BD una `Invoice` con `withdrawal_id = null`, `pack_invoice_id` y datos devueltos por el pack.
  - Para cada withdrawal incluida en la global, actualizar `withdrawal.invoice_id = nueva_invoice.id`.
- **WithdrawalResponseDto:** añadir:
  - `invoice_id` (opcional).
  - `pack_fiscal_status`: enum `RECEIPT_ONLY` | `INVOICED_DIRECT` | `INVOICED_GLOBAL`.
  - Opcional: `invoice_code`, `cfdi_uuid` (para mostrar/enlazar sin cargar la factura completa).
- **WithdrawalMapper / servicio:** al mapear withdrawal a DTO, si tiene `invoice_id` cargar la relación `invoice` (o al menos `invoice.id`, `invoice.code`, `invoice.withdrawal_id`) para derivar `pack_fiscal_status` y datos mínimos de factura.
- **Listados de withdrawals:** incluir relación `invoice` (o solo los campos necesarios) para no hacer N+1 al mostrar estado fiscal.

### 4. Front

- **Tipos:** en `Sale` (o equivalente que venga de withdrawals) añadir:
  - `pack_receipt_id?: string | null`
  - `invoice_id?: string | null`
  - `pack_fiscal_status?: 'RECEIPT_ONLY' | 'INVOICED_DIRECT' | 'INVOICED_GLOBAL'`
  - Opcional: `invoice_code`, `cfdi_uuid` para enlace.
- **Vista ventas:** en tabla o cards, mostrar badge/etiqueta según `pack_fiscal_status`: “Nota”, “Facturada (directo)”, “Facturada (global)” y, si hay factura, enlace a `/facturas/:id`.
- **Detalle de venta:** mismo estado y enlace a factura si existe.
- **Factura global:** pantalla o acción “Crear factura global” (por periodo o por ventas seleccionadas) que llame al nuevo endpoint.

### 5. Resumen de archivos a tocar

| Ámbito | Archivos |
|--------|----------|
| DB | Nueva migración `add-invoice-id-to-withdrawals`. |
| Entidad | `withdrawal.entity.ts`: relación `invoice`, `invoiceId`. |
| DTO | `withdrawal-response.dto.ts`: `invoice_id`, `pack_fiscal_status`, opcional `invoice_code`/`cfdi_uuid`. |
| Servicios | `withdrawal.service.ts`: mapear estado fiscal; cargar `invoice` donde haga falta. |
| | `invoice.service.ts`: en `convertWithdrawalToInvoice` setear `withdrawal.invoice_id`. |
| | Nuevo: `global-invoice.service.ts` o método en `invoice.service` + llamada a pack `createGlobalInvoice`, crear Invoice y actualizar withdrawals. |
| Pack | `facturapi.service.ts`: método `createGlobalInvoice(from, to, periodicity, receiptIds?)` que llame a `POST /v2/receipts/global-invoice`. |
| Controller | `invoice.controller.ts`: nuevo endpoint `POST /invoices/global`. |
| Front tipos | `sale.ts`: campos nuevos. |
| Front UI | Página ventas, detalle venta: estado fiscal y enlace a factura. Nueva acción “Factura global” si aplica. |

Con esto se cubre el control de “nota vs facturada (directo o global)” por venta y que el front sepa en qué estado está cada una.
