# Catálogo 25 de SUNAT (código de producto)

`sunat-product-codes.csv.gz` contiene los 19.475 códigos de producto que SUNAT
exige clasificar en los comprobantes peruanos. Están tomados de **UNSPSC
v14_0801**, el estándar de Naciones Unidas sobre el que SUNAT construyó su
catálogo.

El archivo se versiona ya extraído para que la siembra no dependa de tener el
libro original a mano, ni de leer un `.xlsm`.

## Cuándo hay que actualizarlo

Cuando SUNAT publique una versión nueva. Ocurre más o menos una vez al año; la
última fue en agosto de 2026, con los anexos 25.1, 25.2 y 25.3 para bienes
controlados.

## Cómo actualizarlo

1. Descargar `CCNU_mod5.xlsm` desde el
   [portal CPE de SUNAT](https://cpe.sunat.gob.pe/informacion_general/codigoproducto).
   El portal bloquea las descargas automatizadas, así que hay que hacerlo a
   mano desde el navegador.

2. Regenerar el CSV:

   ```bash
   npm run catalog:sunat:extract -- ~/Descargas/CCNU_mod5.xlsm
   ```

   Imprime cuántos productos extrajo. Si el número se aleja mucho de 19.475,
   conviene revisar antes de seguir: puede que haya cambiado la estructura del
   libro.

3. Cargarlo en la base:

   ```bash
   npm run catalog:sunat:seed
   ```

   Es idempotente: actualiza las descripciones que cambiaron y no borra los
   códigos que hayan desaparecido, porque puede haber comprobantes emitidos
   que los referencien.

4. Commitear el `.csv.gz` regenerado.

En un despliegue nuevo no hace falta nada de esto: `npm run seed` ya carga el
catálogo junto con el resto.

## Detalles del formato

El libro trae la columna de código corrupta (`1010151-`), así que el extractor
toma el código del prefijo de la descripción, que sí viene completo
(`10101501-GATOS`). Parte solo por el primer guion: hay 95 descripciones que
contienen guiones propios, como `ACERO E24-2 O A37-2`.

Las columnas `annex` e `is_restricted` de la tabla quedan vacías: los anexos
25.1 a 25.3 llegan en un documento aparte del libro CCNU. Son los bienes cuyo
código es obligatorio desde el 1 de agosto de 2026 —combustibles, metales
preciosos, insumos químicos, maquinaria de minería— y sin él SUNAT rechaza el
comprobante automáticamente.
