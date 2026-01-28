# Revisión: Factura vs API Facturapi y escalabilidad para cualquier PAC

## Referencia Facturapi

- [Facturapi – Facturas (tag invoice)](https://docs.facturapi.io/api/#tag/invoice)
- Operaciones relevantes: **Crear factura (CFDI 4.0)**, **Timbrar borrador**, **Cancelar**, **Descargar PDF/XML**, **Editar borrador**, etc.

---

## Lo que tenemos en código hoy

### 1. Abstracción por pack (ya escalable)

- **`ICertificationPackService`** (`interfaces/certification-pack.interface.ts`): contrato agnóstico del PAC:
  - `generateCFDI(invoice): Promise<CFDIResponse>`
  - `cancelCFDI(uuid, reason): Promise<void>`
  - `getCFDIStatus(uuid)`, `downloadPDF(uuid)`, `downloadXML(uuid)`
  - Más: clientes, productos, catálogos (uso CFDI, formas de pago, etc.)
- **`CertificationPackFactoryService`**: resuelve el servicio según el pack activo (`FACTURAAPI`, `SAT`, etc.) y permite registrar nuevos tipos.
- **`FacturaAPIService`**: implementación concreta para Facturapi; el resto del negocio solo usa la interfaz.

Con esto, agregar otro PAC implica: nueva clase que implemente `ICertificationPackService` y registrarla en el factory.

### 2. Inconsistencia en la factura vs client/inventory

| Recurso   | ID en pack        | Respuesta completa        | Uso |
|----------|-------------------|----------------------------|-----|
| Cliente  | `pack_client_id`  | `pack_client_response`     | Pack-agnóstico |
| Producto (inventory) | `pack_product_id` | `pack_product_response` | Pack-agnóstico |
| **Factura** | `facturapi_id` ❌ | —                         | Atado a Facturapi |

Para que la factura sea escalable como client e inventory, debe usar:

- **`pack_invoice_id`**: ID interno del comprobante en el PAC (Facturapi: `id`, otro PAC: su propio identificador).
- **`pack_invoice_response`**: JSON con la respuesta del PAC (uuid, status, urls, etc.), opcional pero útil para auditoría y otros PACs.

El **`cfdi_uuid`** se mantiene: es el folio fiscal del SAT y es común a todos los PACs.

### 3. Flujo de facturación frente a la documentación Facturapi

- **Facturapi v2** separa:
  1. Crear factura en modo borrador (`status: "draft"`).
  2. **Timbrar** borrador → `POST /invoices/{id}/stamp`.
- **Nuestro flujo**:
  1. Factura en estado `DRAFT` en nuestra BD (convert withdrawal o create).
  2. **Generar CFDI** → una sola llamada al pack que crea y timbra (vía `invoices.create` del SDK).
  3. Guardamos `cfdi_uuid` y el id del pack.

Si el SDK de Facturapi que usamos (`facturapi` npm) hace “create = crear y timbrar” en una sola petición, el comportamiento es coherente con “borrador en nuestra app, timbrado en el pack en un paso”. Para alineación futura con Facturapi v2 (borrador en el pack + stamp por separado), la interfaz ya permite otro método, por ejemplo `createDraftInPack` + `stampInvoice`, sin cambiar el contrato de `generateCFDI` para el flujo actual.

### 4. Payload de creación (buildCFDIData)

Hoy se envía algo equivalente a:

- `customer`, `items`, `payment_form`, `use`, `type`, `folio_number`, `series`, `date`, `currency`.

Facturapi v2 exige, entre otros:

- `customer` (objeto o `customer_id`)
- `items[]` (producto, quantity, etc.)
- `payment_form` (2 chars, catálogo SAT)
- `use` (uso de CFDI, p. ej. G01)
- `type` (I/E/P/N/T)
- Opcionales: `payment_method` (PUE/PPD), `external_id`, `idempotency_key`, `status` (`draft` / `pending`), etc.

Habría que validar que `payment_form` y `use` usan códigos del catálogo SAT y que, si Facturapi pasa a v2, el SDK o la llamada usen la misma semántica (o ajustar `buildCFDIData` según la versión del API que use el SDK).

### 5. Respuesta del pack (`CFDIResponse`)

La interfaz define:

```ts
CFDIResponse {
  id: string;      // id interno del PAC → conviene mapearlo a pack_invoice_id
  uuid: string;    // folio fiscal SAT → cfdi_uuid
  status: string;
  pdf_url?: string;
  xml_url?: string;
}
```

Es genérico: cualquier PAC que emita CFDI puede devolver `id` + `uuid`. No hace falta referenciar “Facturapi” en la interfaz.

---

## Cambios realizados para escalabilidad

1. **Invoice (entidad y persistencia)**  
   - `facturapi_id` se reemplaza por **`pack_invoice_id`**.  
   - Se agrega **`pack_invoice_response`** (JSON, nullable) para guardar la respuesta completa del PAC.

2. **DTOs y mappers**  
   - En respuestas de factura se expone **`pack_invoice_id`** (y opcionalmente `pack_invoice_response` si se quiere en algún endpoint).  
   - Se deja de usar `facturapi_id` en la API pública.

3. **InvoiceService**  
   - Tras `generateCFDI`:
     - `invoice.pack_invoice_id = cfdiResult.id`
     - `invoice.pack_invoice_response = { uuid, status, pdf_url?, xml_url? }` (o el objeto que se quiera conservar).
   - Descargas de PDF/XML y cancelación siguen usando `cfdi_uuid` como identificador ante el PAC cuando el contrato del pack use el UUID (como Facturapi).

4. **Interfaz**  
   - En `ICertificationPackService` / `CFDIResponse` se documenta que:
     - `id` es el identificador interno del comprobante en el PAC y debe persistirse como `pack_invoice_id`.
     - `uuid` es el folio fiscal (CFDI) y corresponde a `cfdi_uuid`.

Con esto, la factura queda alineada con el patrón de client e inventory y preparada para cualquier PAC que implemente la misma interfaz.
