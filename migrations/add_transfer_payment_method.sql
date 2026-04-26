-- Migration: Add 'transfer' to payment_method enum and card_type column
-- Date: 2026-04-26
-- Description: Add transfer payment method support for sales/withdrawals
--              Add card_type column to distinguish between credit and debit cards
-- Database: PostgreSQL

-- PostgreSQL does not support adding enum values in specific positions (AFTER clause)
-- Values can only be added to the end of the enum
-- TypeORM typically names enums as: {table_name}_{column_name}_enum

-- For withdrawals table payment_method column
ALTER TYPE withdrawals_payment_method_enum ADD VALUE IF NOT EXISTS 'transfer';

-- For invoices table payment_method column (if it doesn't already have it)
ALTER TYPE invoices_payment_method_enum ADD VALUE IF NOT EXISTS 'transfer';

-- For cash_transactions table payment_method column (if it exists)
ALTER TYPE cash_transactions_payment_method_enum ADD VALUE IF NOT EXISTS 'transfer';

-- Add card_type column to withdrawals table (if not exists)
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS card_type VARCHAR(20);

-- Add comment to the column
COMMENT ON COLUMN withdrawals.card_type IS 'Card type (credit or debit) when payment method is card';

-- Note: If the enum types have different names, check the actual type names with:
-- SELECT typname FROM pg_type WHERE typtype = 'e';
-- Then adjust the ALTER TYPE statements accordingly.
