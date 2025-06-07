import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';

export enum OperationType {
  // Entradas
  WAREHOUSE_OPENING = 'WAREHOUSE_OPENING',    // Apertura de almacén
  RECEPTION = 'RECEPTION',                    // Recepción de productos
  PURCHASE = 'PURCHASE',                      // Compra directa
  TRANSFER_IN = 'TRANSFER_IN',                // Transferencia entrante
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',            // Ajuste positivo
  RETURN_IN = 'RETURN_IN',                    // Devolución de cliente
  
  // Salidas  
  SALE = 'SALE',                              // Venta
  WITHDRAWAL = 'WITHDRAWAL',                  // Retiro/salida
  TRANSFER_OUT = 'TRANSFER_OUT',              // Transferencia saliente
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',          // Ajuste negativo
  DETERIORATION = 'DETERIORATION',            // Deterioro/merma
  RETURN_OUT = 'RETURN_OUT',                  // Devolución a proveedor
  DAMAGE = 'DAMAGE',                          // Daño/pérdida
}

@Entity('product_history')
export class ProductHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Warehouse, { nullable: false })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({
    type: 'enum',
    enum: OperationType,
  })
  operation_type: OperationType;

  @Column()
  operation_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  current_stock: number;

  @CreateDateColumn()
  created_at: Date;

  // Helper method para determinar si es entrada o salida
  isInbound(): boolean {
    return [
      OperationType.WAREHOUSE_OPENING,
      OperationType.RECEPTION,
      OperationType.PURCHASE,
      OperationType.TRANSFER_IN,
      OperationType.ADJUSTMENT_IN,
      OperationType.RETURN_IN,
    ].includes(this.operation_type);
  }

  isOutbound(): boolean {
    return [
      OperationType.SALE,
      OperationType.WITHDRAWAL,
      OperationType.TRANSFER_OUT,
      OperationType.ADJUSTMENT_OUT,
      OperationType.DETERIORATION,
      OperationType.RETURN_OUT,
      OperationType.DAMAGE,
    ].includes(this.operation_type);
  }
}
