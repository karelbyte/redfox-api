-- Migration: Add emitter_id and card_type to invoices table
-- Date: 2026-04-26
-- Description: Add emitter_id column to track which emitter was used for invoice generation
--              Add card_type column to distinguish between credit and debit cards
-- Database: PostgreSQL

-- Add card_type column to invoices table (if not exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS card_type VARCHAR(20);

-- Add emitter_id column to invoices table (if not exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS emitter_id VARCHAR(100);

-- Add comments to the columns
COMMENT ON COLUMN invoices.card_type IS 'Card type (credit or debit) when payment method is card';
COMMENT ON COLUMN invoices.emitter_id IS 'ID of the emitter (business UUID) used for CFDI generation in Factura Green';
