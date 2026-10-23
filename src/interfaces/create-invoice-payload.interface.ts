export interface IItemSunat {
  unidad_de_medida: string;
  descripcion: string;
  cantidad: string;
  valor_unitario: string;
  porcentaje_igv: string;
  codigo_tipo_afectacion_igv: string;
  nombre_tributo: string;
}

export interface ICreateInvoice {
  documento: string;
  serie: string;
  numero: number;
  fecha_de_emision: string;
  hora_de_emision?: string;
  moneda: string;
  tipo_operacion: string;
  cliente_tipo_de_documento: string;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion: string;
  items: IItemSunat[];
  total: string;
}