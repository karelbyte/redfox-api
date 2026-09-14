export interface IProductRepository<T> {
  findById(id: string): Promise<T | null>;
  findBySku(sku: string): Promise<T | null>;
}
