export interface IInvoiceSunat {
  documentType: string;
  series: string;
  number: number;
  issueDate: string;
  issueTime?: string;
  currency: string;
  operationType: string;
  customerDocumentType: string;
  customerDocumentNumber: string;
  customerName: string;
  customerAddress: string;
  items: IInvoiceItem[];
  total: string;
}

export interface IInvoiceItem {
  unitOfMeasure: string;
  description: string;
  quantity: string;
  unitValue: string;
  igvPercentage: string;
  igvAffectationTypeCode: string;
  taxName: string;
}