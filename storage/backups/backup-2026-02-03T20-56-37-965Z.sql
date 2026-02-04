--
-- PostgreSQL database dump
--

\restrict AQwhqgFbZjt50GR0XkQTUO8MVr84UqAv1tC2YAbdgHCeXZUQLNfwWBhgCxdW0dw

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: cash_registers_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_registers_status_enum AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.cash_registers_status_enum OWNER TO postgres;

--
-- Name: cash_transactions_payment_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_transactions_payment_method_enum AS ENUM (
    'cash',
    'card',
    'mixed'
);


ALTER TYPE public.cash_transactions_payment_method_enum OWNER TO postgres;

--
-- Name: cash_transactions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cash_transactions_type_enum AS ENUM (
    'sale',
    'refund',
    'adjustment',
    'withdrawal',
    'deposit'
);


ALTER TYPE public.cash_transactions_type_enum OWNER TO postgres;

--
-- Name: certification_pack_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.certification_pack_type_enum AS ENUM (
    'FACTURAAPI',
    'SAT'
);


ALTER TYPE public.certification_pack_type_enum OWNER TO postgres;

--
-- Name: invoices_payment_method_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoices_payment_method_enum AS ENUM (
    'cash',
    'card',
    'transfer',
    'check'
);


ALTER TYPE public.invoices_payment_method_enum OWNER TO postgres;

--
-- Name: invoices_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoices_status_enum AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'CANCELLED'
);


ALTER TYPE public.invoices_status_enum OWNER TO postgres;

--
-- Name: product_history_operation_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.product_history_operation_type_enum AS ENUM (
    'WAREHOUSE_OPENING',
    'RECEPTION',
    'PURCHASE',
    'TRANSFER_IN',
    'ADJUSTMENT_IN',
    'RETURN_IN',
    'SALE',
    'WITHDRAWAL',
    'TRANSFER_OUT',
    'ADJUSTMENT_OUT',
    'DETERIORATION',
    'RETURN_OUT',
    'DAMAGE'
);


ALTER TYPE public.product_history_operation_type_enum OWNER TO postgres;

--
-- Name: products_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.products_type_enum AS ENUM (
    'digital',
    'service',
    'tangible'
);


ALTER TYPE public.products_type_enum OWNER TO postgres;

--
-- Name: purchase_orders_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.purchase_orders_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'COMPLETED'
);


ALTER TYPE public.purchase_orders_status_enum OWNER TO postgres;

--
-- Name: taxes_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.taxes_type_enum AS ENUM (
    'PERCENTAGE',
    'FIXED'
);


ALTER TYPE public.taxes_type_enum OWNER TO postgres;

--
-- Name: withdrawals_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.withdrawals_type_enum AS ENUM (
    'POS',
    'WITHDRAWAL'
);


ALTER TYPE public.withdrawals_type_enum OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: backup_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_configs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    is_auto_enabled boolean DEFAULT false NOT NULL,
    frequency character varying(10) DEFAULT 'daily'::character varying NOT NULL,
    scheduled_time character varying(5) DEFAULT '00:00'::character varying NOT NULL,
    retention_count integer DEFAULT 7 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.backup_configs OWNER TO postgres;

--
-- Name: backup_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backup_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    filename character varying(255) NOT NULL,
    file_size character varying(50),
    status boolean DEFAULT true NOT NULL,
    error_message text,
    trigger_type character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.backup_logs OWNER TO postgres;

--
-- Name: brands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.brands (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    img character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.brands OWNER TO postgres;

--
-- Name: cash_registers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_registers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    initial_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    current_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    status public.cash_registers_status_enum DEFAULT 'closed'::public.cash_registers_status_enum NOT NULL,
    opened_at timestamp without time zone,
    closed_at timestamp without time zone,
    opened_by uuid NOT NULL,
    closed_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.cash_registers OWNER TO postgres;

--
-- Name: cash_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cash_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    cash_register_id uuid NOT NULL,
    type public.cash_transactions_type_enum NOT NULL,
    amount numeric(10,2) NOT NULL,
    description character varying(255) NOT NULL,
    reference character varying(100) NOT NULL,
    payment_method public.cash_transactions_payment_method_enum DEFAULT 'cash'::public.cash_transactions_payment_method_enum NOT NULL,
    sale_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.cash_transactions OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    image character varying(255),
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: certification_packs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.certification_packs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.certification_pack_type_enum NOT NULL,
    config jsonb NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.certification_packs OWNER TO postgres;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    tax_document character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    address_street character varying(200),
    address_exterior character varying(20),
    address_interior character varying(20),
    address_neighborhood character varying(100),
    address_city character varying(100),
    address_municipality character varying(100),
    address_zip character varying(10),
    address_state character varying(100),
    address_country character varying(3) DEFAULT 'MEX'::character varying,
    phone character varying(20),
    email character varying(100),
    tax_system character varying(10),
    default_invoice_use character varying(10),
    status boolean DEFAULT true NOT NULL,
    pack_client_id character varying(255),
    pack_client_response jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255),
    legal_name character varying(255),
    tax_id character varying(50),
    address character varying(500),
    phone character varying(50),
    email character varying(255),
    website character varying(255),
    logo_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.company_settings OWNER TO postgres;

--
-- Name: currencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currencies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(3) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.currencies OWNER TO postgres;

--
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    price numeric(10,2) NOT NULL,
    pack_product_id character varying(255),
    pack_product_response jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- Name: invoice_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.invoice_details OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    date date NOT NULL,
    client_id uuid NOT NULL,
    withdrawal_id uuid,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    tax_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    status public.invoices_status_enum DEFAULT 'DRAFT'::public.invoices_status_enum NOT NULL,
    cfdi_uuid character varying(36),
    pack_invoice_id character varying(100),
    pack_invoice_response json,
    payment_method public.invoices_payment_method_enum DEFAULT 'cash'::public.invoices_payment_method_enum NOT NULL,
    payment_conditions character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: languages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.languages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(10) NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.languages OWNER TO postgres;

--
-- Name: measurement_units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.measurement_units (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.measurement_units OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    module character varying(100) NOT NULL,
    code character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: product_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    product_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    operation_type public.product_history_operation_type_enum NOT NULL,
    operation_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    current_stock numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.product_history OWNER TO postgres;

--
-- Name: COLUMN product_history.operation_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.product_history.operation_type IS 'Tipo específico de operación de inventario';


--
-- Name: COLUMN product_history.operation_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.product_history.operation_id IS 'ID de la operación origen (WarehouseOpening, Reception, Sale, etc.)';


--
-- Name: COLUMN product_history.current_stock; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.product_history.current_stock IS 'Stock actual después de la operación';


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    sku character varying(50) NOT NULL,
    code character varying(20) NOT NULL,
    barcode character varying(100),
    weight numeric(10,2),
    width numeric(10,2),
    height numeric(10,2),
    length numeric(10,2),
    brand_id uuid,
    category_id uuid,
    measurement_unit_id uuid,
    tax_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    type public.products_type_enum DEFAULT 'tangible'::public.products_type_enum NOT NULL,
    images text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: providers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.providers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    name character varying(100),
    document character varying(20),
    phone character varying(20),
    email character varying(100),
    address character varying(200),
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.providers OWNER TO postgres;

--
-- Name: purchase_order_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_order_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    purchase_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    received_quantity numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.purchase_order_details OWNER TO postgres;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    date date NOT NULL,
    provider_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    document character varying(50) NOT NULL,
    amount numeric(10,2) NOT NULL,
    status public.purchase_orders_status_enum DEFAULT 'PENDING'::public.purchase_orders_status_enum NOT NULL,
    notes text,
    expected_delivery_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.purchase_orders OWNER TO postgres;

--
-- Name: reception_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reception_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    reception_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.reception_details OWNER TO postgres;

--
-- Name: receptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.receptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    date date NOT NULL,
    provider_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    document character varying(100) NOT NULL,
    amount numeric(10,2) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.receptions OWNER TO postgres;

--
-- Name: return_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    return_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.return_details OWNER TO postgres;

--
-- Name: returns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.returns (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    source_warehouse_id uuid NOT NULL,
    target_provider_id uuid NOT NULL,
    date date NOT NULL,
    description text,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.returns OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    description character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: taxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taxes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    value numeric(10,2) NOT NULL,
    type public.taxes_type_enum DEFAULT 'PERCENTAGE'::public.taxes_type_enum NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.taxes OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: warehouse_adjustment_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_adjustment_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    warehouse_adjustment_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.warehouse_adjustment_details OWNER TO postgres;

--
-- Name: warehouse_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_adjustments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    source_warehouse_id uuid NOT NULL,
    target_warehouse_id uuid NOT NULL,
    date date NOT NULL,
    description text,
    status boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.warehouse_adjustments OWNER TO postgres;

--
-- Name: warehouse_openings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouse_openings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    warehouse_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.warehouse_openings OWNER TO postgres;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    address character varying(200) NOT NULL,
    phone character varying(20),
    status boolean DEFAULT true NOT NULL,
    is_open boolean DEFAULT true NOT NULL,
    currency_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.warehouses OWNER TO postgres;

--
-- Name: withdrawal_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawal_details (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    withdrawal_id uuid NOT NULL,
    warehouse_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE public.withdrawal_details OWNER TO postgres;

--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    destination character varying(200) NOT NULL,
    client_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    type public.withdrawals_type_enum DEFAULT 'WITHDRAWAL'::public.withdrawals_type_enum NOT NULL,
    cash_transaction_id uuid,
    status boolean DEFAULT true NOT NULL,
    pack_receipt_id character varying(100),
    pack_receipt_response jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    invoice_id uuid
);


ALTER TABLE public.withdrawals OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: backup_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_configs (id, is_auto_enabled, frequency, scheduled_time, retention_count, created_at, updated_at) FROM stdin;
13d5d19a-26f2-4db1-9add-ea267acefac4	f	daily	00:00	7	2026-02-03 14:45:59.425247	2026-02-03 14:45:59.425247
\.


--
-- Data for Name: backup_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.backup_logs (id, filename, file_size, status, error_message, trigger_type, created_at) FROM stdin;
8bca72f6-4e35-4f2a-9636-d966ef196a3b	backup-2026-02-03T20-51-05-972Z.sql	\N	f	Command failed: PGPASSWORD="7810071" pg_dump -h localhost -p 5432 -U postgres redfox-db > /Users/papitoff/proyects/redfox/redfox-api/storage/backups/backup-2026-02-03T20-51-05-972Z.sql\n/bin/sh: pg_dump: command not found\n	manual	2026-02-03 14:51:05.991242
\.


--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.brands (id, code, description, img, is_active, created_at, updated_at, deleted_at) FROM stdin;
419ddd81-f8e0-422b-8ee5-76140b8fccbf	APPLE	Apple Inc.	\N	t	2026-02-03 14:45:18.724081	2026-02-03 14:45:18.724081	\N
9a2573eb-2424-4e37-81dc-7d50f380c188	SAMSUNG	Samsung Electronics	\N	t	2026-02-03 14:45:18.72606	2026-02-03 14:45:18.72606	\N
926641b3-a64a-49fd-8c8f-cd7230d30a1d	SONY	Sony Corporation	\N	t	2026-02-03 14:45:18.727555	2026-02-03 14:45:18.727555	\N
69c7324f-b878-4642-b5ed-8bec72f34248	LG	LG Electronics	\N	t	2026-02-03 14:45:18.729005	2026-02-03 14:45:18.729005	\N
53bfaf11-1d4f-49ae-921c-cb0f607d3103	NIKON	Nikon Corporation	\N	t	2026-02-03 14:45:18.730472	2026-02-03 14:45:18.730472	\N
c42184db-d336-447a-b0a1-b69ee99a1f33	CANON	Canon Inc.	\N	t	2026-02-03 14:45:18.732163	2026-02-03 14:45:18.732163	\N
2df58096-1369-483e-8e14-b7d37aaa1103	DELL	Dell Technologies	\N	t	2026-02-03 14:45:18.734008	2026-02-03 14:45:18.734008	\N
d6e9f778-887e-4deb-b78f-30f525b46cff	HP	Hewlett-Packard	\N	t	2026-02-03 14:45:18.735559	2026-02-03 14:45:18.735559	\N
9e140c7c-ac30-4cb1-919e-ae894db9c68b	ASUS	ASUS	\N	t	2026-02-03 14:45:18.737039	2026-02-03 14:45:18.737039	\N
081a2392-0cd5-4160-bc07-e9078dbb28e3	MSI	Micro-Star International	\N	t	2026-02-03 14:45:18.738506	2026-02-03 14:45:18.738506	\N
4e5d8b3e-26a1-478e-819b-ff332b93ddd9	LENOVO	Lenovo Group Limited	\N	t	2026-02-03 14:45:18.740062	2026-02-03 14:45:18.740062	\N
bb0d67c2-fd38-4ca0-9643-4213f4451d32	ACER	Acer Inc.	\N	t	2026-02-03 14:45:18.741639	2026-02-03 14:45:18.741639	\N
9b6dd180-5b4e-4815-919e-1ead7413a5d8	RAZER	Razer Inc.	\N	t	2026-02-03 14:45:18.743122	2026-02-03 14:45:18.743122	\N
dfeed76c-d155-4be7-9df2-a81b0b498be1	LOGITECH	Logitech International	\N	t	2026-02-03 14:45:18.74466	2026-02-03 14:45:18.74466	\N
ae6c7482-c40c-4ce0-be3c-04045a312ded	STEELSERIES	SteelSeries	\N	t	2026-02-03 14:45:18.746128	2026-02-03 14:45:18.746128	\N
8bb9e760-0651-4387-a02c-32e0fa3757a3	CORSAIR	Corsair Components	\N	t	2026-02-03 14:45:18.747867	2026-02-03 14:45:18.747867	\N
59f3b53c-f007-410f-bea7-bac8101b4cdd	GIGABYTE	GIGABYTE Technology	\N	t	2026-02-03 14:45:18.749315	2026-02-03 14:45:18.749315	\N
e72d7628-60cb-4d57-9a1a-3acf57f92fc6	INTEL	Intel Corporation	\N	t	2026-02-03 14:45:18.750847	2026-02-03 14:45:18.750847	\N
79e283eb-c45b-4347-b913-d1ba550e3fff	AMD	Advanced Micro Devices	\N	t	2026-02-03 14:45:18.752259	2026-02-03 14:45:18.752259	\N
aab13c3d-7583-494d-8dfa-b9e33d50c809	NVIDIA	NVIDIA Corporation	\N	t	2026-02-03 14:45:18.753683	2026-02-03 14:45:18.753683	\N
a13b1943-cac6-4857-b070-0c890dc4ca77	WESTERN_DIGITAL	Western Digital	\N	t	2026-02-03 14:45:18.754753	2026-02-03 14:45:18.754753	\N
6e1130d6-3b73-46d7-ae0c-f67354756b55	SEAGATE	Seagate Technology	\N	t	2026-02-03 14:45:18.755823	2026-02-03 14:45:18.755823	\N
6b30d26e-3b9d-408d-8539-5e76b24b1082	KINGSTON	Kingston Technology	\N	t	2026-02-03 14:45:18.75691	2026-02-03 14:45:18.75691	\N
b80efeed-a734-47cf-9e4d-461b5fc9de88	CRUCIAL	Crucial Technology	\N	t	2026-02-03 14:45:18.758141	2026-02-03 14:45:18.758141	\N
4ab8699e-0ba3-4aa7-98e4-fe69da729f4f	SANDISK	SanDisk Corporation	\N	t	2026-02-03 14:45:18.759416	2026-02-03 14:45:18.759416	\N
cfbe640c-43b5-475c-be94-fdf2e2fc6734	BOSE	Bose Corporation	\N	t	2026-02-03 14:45:18.76084	2026-02-03 14:45:18.76084	\N
8298a2a2-0f8a-4e27-ba47-c44a5055ece3	JBL	JBL (Harman International)	\N	t	2026-02-03 14:45:18.762371	2026-02-03 14:45:18.762371	\N
7b712f82-5cbd-4fb2-a822-af68feb9b2df	SENNHEISER	Sennheiser Electronic	\N	t	2026-02-03 14:45:18.763812	2026-02-03 14:45:18.763812	\N
dd35dcc2-c144-4b2e-9a17-4b7b5ad8beee	BEATS	Beats Electronics	\N	t	2026-02-03 14:45:18.765196	2026-02-03 14:45:18.765196	\N
8205b78c-1425-4778-b67f-e65c5cfaaa51	SHURE	Shure Incorporated	\N	t	2026-02-03 14:45:18.766613	2026-02-03 14:45:18.766613	\N
e4dd5e09-1686-425d-b087-8f403fc5bd8d	GOOGLE	Google LLC	\N	t	2026-02-03 14:45:18.768066	2026-02-03 14:45:18.768066	\N
9910a685-90e6-4497-9108-183cf6c1bdcc	MICROSOFT	Microsoft Corporation	\N	t	2026-02-03 14:45:18.769475	2026-02-03 14:45:18.769475	\N
b205ecdf-8cd0-40a9-b79d-149fb34d069c	XIAOMI	Xiaomi Corporation	\N	t	2026-02-03 14:45:18.770886	2026-02-03 14:45:18.770886	\N
204c97a3-e8ec-44d0-84d8-e82231147993	HUAWEI	Huawei Technologies	\N	t	2026-02-03 14:45:18.77228	2026-02-03 14:45:18.77228	\N
4579ecac-2edf-49b1-8242-dd388c512da7	ONEPLUS	OnePlus Technology	\N	t	2026-02-03 14:45:18.773704	2026-02-03 14:45:18.773704	\N
ed27f6a2-efd1-4688-b8a9-6ab9d54d1f96	OPPO	OPPO Electronics	\N	t	2026-02-03 14:45:18.77537	2026-02-03 14:45:18.77537	\N
5c69fcdd-73da-4657-95ab-298d245cce70	VIVO	Vivo Communication	\N	t	2026-02-03 14:45:18.776858	2026-02-03 14:45:18.776858	\N
63f8db3c-9603-41ca-9de5-4f7db5240930	REALME	Realme Mobile	\N	t	2026-02-03 14:45:18.778436	2026-02-03 14:45:18.778436	\N
3e25f18b-9ca5-4ccf-adf1-1539682a7075	NOTHING	Nothing Technology	\N	t	2026-02-03 14:45:18.779983	2026-02-03 14:45:18.779983	\N
1f733aea-dc74-44e8-9fff-a34af8f76b14	MOTOROLA	Motorola Mobility	\N	t	2026-02-03 14:45:18.781408	2026-02-03 14:45:18.781408	\N
df3b459f-76cf-4bf0-97be-90a75f266c0a	BLACKBERRY	BlackBerry Limited	\N	t	2026-02-03 14:45:18.782871	2026-02-03 14:45:18.782871	\N
e293b7db-84f6-4aa4-9a90-056d842772a3	HTC	HTC Corporation	\N	t	2026-02-03 14:45:18.784415	2026-02-03 14:45:18.784415	\N
f3e0f6e2-4b96-4ea4-8ccf-4c184b28be3a	ASUS_ROG	ASUS Republic of Gamers	\N	t	2026-02-03 14:45:18.785925	2026-02-03 14:45:18.785925	\N
0f6ce4a5-47ec-4144-8ed7-e4a83312c1c3	ALIENWARE	Alienware (Dell)	\N	t	2026-02-03 14:45:18.787397	2026-02-03 14:45:18.787397	\N
8ce59b7d-99fc-430f-9eaf-68078c8a8205	PREDATOR	Acer Predator	\N	t	2026-02-03 14:45:18.788789	2026-02-03 14:45:18.788789	\N
28faa3c0-5371-42e2-9814-ef98b91682c4	ROG_STRIX	ASUS ROG Strix	\N	t	2026-02-03 14:45:18.790175	2026-02-03 14:45:18.790175	\N
eacfc155-1690-41e5-9dac-11be284e4275	GAMING	Gaming Brand	\N	t	2026-02-03 14:45:18.79157	2026-02-03 14:45:18.79157	\N
b6e091cf-90e6-4366-a133-69d67f6b2a29	GENERIC	Marca Genérica	\N	t	2026-02-03 14:45:18.793041	2026-02-03 14:45:18.793041	\N
\.


--
-- Data for Name: cash_registers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_registers (id, code, name, description, initial_amount, current_amount, status, opened_at, closed_at, opened_by, closed_by, created_at, updated_at, deleted_at) FROM stdin;
ca19dd15-2223-45dd-a14b-1717bcef55a0	CASH-1770151590204	Caja Principal	Caja principal del POS	1000.00	1000.00	open	2026-02-03 14:46:30.204	\N	b4e2a807-3b61-47c0-99c2-10b2a63f90a3	\N	2026-02-03 14:46:30.20597	2026-02-03 14:46:30.20597	\N
\.


--
-- Data for Name: cash_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cash_transactions (id, cash_register_id, type, amount, description, reference, payment_method, sale_id, created_by, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, slug, description, image, parent_id, is_active, "position", created_at, updated_at, deleted_at) FROM stdin;
aefa552b-18f6-4ca1-a510-8761ac304458	Electrónicos	ELEC	Productos electrónicos y gadgets	\N	\N	t	0	2026-02-03 14:45:18.708342	2026-02-03 14:45:18.708342	\N
375a666d-3ec9-4948-9edb-d024a89dc90e	Ropa	ROPA	Ropa y accesorios de moda	\N	\N	t	0	2026-02-03 14:45:18.710659	2026-02-03 14:45:18.710659	\N
71a84c8b-6e91-4e2c-820e-78918af5303f	Hogar	HOGAR	Artículos para el hogar	\N	\N	t	0	2026-02-03 14:45:18.71189	2026-02-03 14:45:18.71189	\N
c22e540d-80ba-445f-b8d4-214e8996dc4b	Deportes	DEPORTE	Artículos deportivos y fitness	\N	\N	t	0	2026-02-03 14:45:18.713093	2026-02-03 14:45:18.713093	\N
4140ac42-0516-4506-8c08-8f105596a266	Belleza	BELLEZA	Productos de belleza y cuidado personal	\N	\N	t	0	2026-02-03 14:45:18.714466	2026-02-03 14:45:18.714466	\N
e903719c-143d-4e32-bd84-4587d09ac99b	Juguetes	JUGUETES	Juguetes y juegos	\N	\N	t	0	2026-02-03 14:45:18.715677	2026-02-03 14:45:18.715677	\N
9e9299dc-5a5d-4891-a571-82cbd9577629	Libros	LIBROS	Libros y material educativo	\N	\N	t	0	2026-02-03 14:45:18.717802	2026-02-03 14:45:18.717802	\N
4a386b86-9173-4bf4-a8b2-ad1affba07b7	Alimentos	ALIMENTOS	Alimentos y bebidas	\N	\N	t	0	2026-02-03 14:45:18.718956	2026-02-03 14:45:18.718956	\N
07a8ef17-b6f9-4d81-8a5d-67040c23281a	Mascotas	MASCOTAS	Productos para mascotas	\N	\N	t	0	2026-02-03 14:45:18.720148	2026-02-03 14:45:18.720148	\N
4987f5a6-19c5-4d23-b06f-e668cdc4a286	Jardín	JARDIN	Artículos para jardín y exteriores	\N	\N	t	0	2026-02-03 14:45:18.721264	2026-02-03 14:45:18.721264	\N
\.


--
-- Data for Name: certification_packs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.certification_packs (id, type, config, is_active, is_default, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, code, name, tax_document, description, address_street, address_exterior, address_interior, address_neighborhood, address_city, address_municipality, address_zip, address_state, address_country, phone, email, tax_system, default_invoice_use, status, pack_client_id, pack_client_response, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: company_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_settings (id, name, legal_name, tax_id, address, phone, email, website, logo_url, created_at, updated_at) FROM stdin;
b44ee1c8-ce13-4e52-aa09-b05bf070f7e6	\N	\N	\N	\N	\N	\N	\N	\N	2026-02-03 14:50:20.137454	2026-02-03 14:50:20.137454
\.


--
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currencies (id, code, name, created_at, updated_at, deleted_at) FROM stdin;
5de993a6-a868-4e3a-aab9-8b07e756d85e	USD	Dólar Estadounidense	2026-02-03 14:45:18.811329	2026-02-03 14:45:18.811329	\N
041ac8f3-0ee3-4989-b1c2-13a7d5d22fa0	EUR	Euro	2026-02-03 14:45:18.81341	2026-02-03 14:45:18.81341	\N
840dfbc1-d24f-4849-ae88-4b99b208318f	MXN	Peso Mexicano	2026-02-03 14:45:18.814842	2026-02-03 14:45:18.814842	\N
810091a5-0213-48a7-9c55-8de6cb6085af	CAD	Dólar Canadiense	2026-02-03 14:45:18.81626	2026-02-03 14:45:18.81626	\N
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, product_id, warehouse_id, quantity, price, pack_product_id, pack_product_response, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: invoice_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_details (id, invoice_id, product_id, quantity, price, subtotal, tax_rate, tax_amount, total, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, code, date, client_id, withdrawal_id, subtotal, tax_amount, total_amount, status, cfdi_uuid, pack_invoice_id, pack_invoice_response, payment_method, payment_conditions, notes, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.languages (id, code, user_id, created_at, updated_at, deleted_at) FROM stdin;
e4fd58eb-17a7-4721-904a-e0fde8d95eb7	en	b4e2a807-3b61-47c0-99c2-10b2a63f90a3	2026-02-03 14:48:22.592575	2026-02-03 14:48:24.306572	\N
\.


--
-- Data for Name: measurement_units; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.measurement_units (id, code, description, status, created_at, updated_at, deleted_at) FROM stdin;
a5091d3d-00cd-410e-a458-cf1a15912576	UNIT	Unidad	t	2026-02-03 14:45:18.683236	2026-02-03 14:45:18.683236	\N
77ab4b8b-d372-421b-9dc1-b8b06190012a	KG	Kilogramo	t	2026-02-03 14:45:18.691613	2026-02-03 14:45:18.691613	\N
a05736ed-e700-400c-a716-0e1e929a8df4	G	Gramo	t	2026-02-03 14:45:18.693813	2026-02-03 14:45:18.693813	\N
f075a575-fc01-40ef-bd7f-b5ef15901078	L	Litro	t	2026-02-03 14:45:18.695855	2026-02-03 14:45:18.695855	\N
fd8f18e8-65e9-4a40-b398-337ff8118103	ML	Mililitro	t	2026-02-03 14:45:18.697682	2026-02-03 14:45:18.697682	\N
38e36f93-c3f9-439c-a74f-855d5562110c	M	Metro	t	2026-02-03 14:45:18.699544	2026-02-03 14:45:18.699544	\N
b579e778-2dad-4f77-b930-5b68abf1ee01	CM	Centímetro	t	2026-02-03 14:45:18.701168	2026-02-03 14:45:18.701168	\N
1dc9940e-1ff1-457d-b0fa-a18a8af847e2	M2	Metro cuadrado	t	2026-02-03 14:45:18.702781	2026-02-03 14:45:18.702781	\N
8e0273ea-19cf-4a13-b63f-da083cbabb82	M3	Metro cúbico	t	2026-02-03 14:45:18.70428	2026-02-03 14:45:18.70428	\N
31e3836e-2c0b-42db-a46e-b5cf723eccc3	PZ	Pieza	t	2026-02-03 14:45:18.705563	2026-02-03 14:45:18.705563	\N
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, "timestamp", name) FROM stdin;
1	1716400000000	CreateUsersTable1716400000000
2	1716400000010	CreateRolesTable1716400000010
3	1716400000011	CreateCategoriesTable1716400000011
4	1716400000012	CreateTaxesTable1716400000012
5	1716400000020	CreateUserRoles1716400000020
6	1716400000030	CreateClientsTable1716400000030
7	1716400000040	CreateBrandsTable1716400000040
8	1716400000050	CreateMeasurementUnitsTable1716400000050
9	1716400000060	CreateProvidersTable1716400000060
10	1716400000065	CreateCurrenciesTable1716400000065
11	1716400000070	CreateWarehousesTable1716400000070
12	1716400000080	CreateProductsTable1716400000080
13	1716400000081	CreateWarehouseOpeningsTable1716400000081
14	1716400000090	CreateInventoryTable1716400000090
15	1716400000100	CreateReceptionsTable1716400000100
16	1716400000101	CreateWithdrawalsTable1716400000101
17	1716400000105	CreateCashRegistersTable1716400000105
18	1716400000106	CreateCashTransactionsTable1716400000106
19	1716400000110	CreateReceptionDetailsTable1716400000110
20	1716400000130	CreateWithdrawalsDetailsTable1716400000130
21	1716400000140	CreateProductHistoryTable1716400000140
22	1716400000150	CreatePermissionsTable1716400000150
23	1716400000160	CreateRolePermissionsTable1716400000160
24	1716400000170	CreateLanguagesTable1716400000170
25	1716400000180	CreateWarehouseAdjustmentsTable1716400000180
26	1716400000190	CreateReturnsTable1716400000190
27	1716400000200	CreateCircularForeignKeys1716400000200
28	1716400000220	CreatePurchaseOrdersTable1716400000220
29	1716400000230	CreatePurchaseOrderDetailsTable1716400000230
30	1716400000240	CreateInvoicesTable1716400000240
31	1716400000250	CreateInvoiceDetailsTable1716400000250
32	1716400000260	CreateCertificationPacksTable1716400000260
33	1716400000280	CreateCompanySettingsTable1716400000280
34	1716400000290	CreateBackupTables1716400000290
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, module, code, description, created_at, deleted_at) FROM stdin;
d9f189a0-57bf-4f61-bbe7-95ebec25b0c5	users	user_module_view	Allows viewing the users module | Permite ver el módulo de usuarios	2026-02-03 14:45:18.925015	\N
5d19885c-e326-4adf-bce0-b1307e3860cc	users	user_create	Allows creating users | Permite crear usuarios	2026-02-03 14:45:18.926932	\N
fb7f0f1f-b26a-4a55-bd4f-19ab14f507f8	users	user_read	Allows reading users | Permite leer usuarios	2026-02-03 14:45:18.92844	\N
616b564e-de55-4d20-b7d2-7f8529f75ab7	users	user_update	Allows updating users | Permite actualizar usuarios	2026-02-03 14:45:18.929875	\N
c800e6b0-1d8e-4ade-854e-16d42a7ff6e0	users	user_delete	Allows deleting users | Permite eliminar usuarios	2026-02-03 14:45:18.931269	\N
7276e243-f977-477c-8b42-1e0e86f7e8ac	roles	role_module_view	Allows viewing the roles module | Permite ver el módulo de roles	2026-02-03 14:45:18.93265	\N
482a7b58-7431-46d5-83f1-4dd6a11fe88c	roles	role_create	Allows creating roles | Permite crear roles	2026-02-03 14:45:18.934	\N
c5b42a0c-64a0-4f69-81bd-78b923c37f30	roles	role_read	Allows reading roles | Permite leer roles	2026-02-03 14:45:18.935647	\N
06dad633-03cd-4767-8b72-f180823aa89d	roles	role_update	Allows updating roles | Permite actualizar roles	2026-02-03 14:45:18.9373	\N
4075aea6-71bc-4458-9ce0-0a90a4a63107	roles	role_delete	Allows deleting roles | Permite eliminar roles	2026-02-03 14:45:18.938224	\N
f5352ee3-fd3f-4baf-b8ae-251da59b7a14	permissions	permission_module_view	Allows viewing the permissions module | Permite ver el módulo de permisos	2026-02-03 14:45:18.939204	\N
d26bbef6-3d16-48cf-9079-a7b162b1627d	permissions	permission_create	Allows creating permissions | Permite crear permisos	2026-02-03 14:45:18.940484	\N
1b2431d5-145e-40ac-9d67-334bf1d5cd59	permissions	permission_read	Allows reading permissions | Permite leer permisos	2026-02-03 14:45:18.941841	\N
db0c8569-56e0-49f1-818a-2c66b07cfcd0	permissions	permission_update	Allows updating permissions | Permite actualizar permisos	2026-02-03 14:45:18.943112	\N
52de42e1-3749-4424-918e-dc897c8e569a	permissions	permission_delete	Allows deleting permissions | Permite eliminar permisos	2026-02-03 14:45:18.94462	\N
031b34ba-3ae7-4525-9a83-a6fc07ca01dc	languages	language_module_view	Allows viewing the languages module | Permite ver el módulo de idiomas	2026-02-03 14:45:18.946015	\N
f18d7f5e-a441-410b-926c-ced0ec2a6969	languages	language_create	Allows creating languages | Permite crear idiomas	2026-02-03 14:45:18.947289	\N
37664a16-622e-493f-bfad-9063186a7de9	languages	language_read	Allows reading languages | Permite leer idiomas	2026-02-03 14:45:18.948554	\N
57a0a09e-1f7d-40ba-a687-4264bea23722	languages	language_update	Allows updating languages | Permite actualizar idiomas	2026-02-03 14:45:18.949863	\N
08b25cb6-4443-4c79-a08d-07c49895b6ec	languages	language_delete	Allows deleting languages | Permite eliminar idiomas	2026-02-03 14:45:18.951163	\N
0fc03786-d0dc-4954-b248-5cd8f5bef8a3	clients	client_module_view	Allows viewing the clients module | Permite ver el módulo de clientes	2026-02-03 14:45:18.952501	\N
b0b34dd7-8aa8-4fa8-8212-fc234e52d2fe	clients	client_create	Allows creating clients | Permite crear clientes	2026-02-03 14:45:18.953781	\N
70aaf8be-a74f-4d0b-8b5b-4bc7efcf4664	clients	client_read	Allows reading clients | Permite leer clientes	2026-02-03 14:45:18.955114	\N
21a977c1-048c-43c1-864e-2a14d31b6883	clients	client_update	Allows updating clients | Permite actualizar clientes	2026-02-03 14:45:18.956379	\N
e978e477-3cd7-49d8-839f-9e3f8b096640	clients	client_delete	Allows deleting clients | Permite eliminar clientes	2026-02-03 14:45:18.957658	\N
0bfc0adf-60d7-4ec3-b55e-8a3e31ed175f	providers	provider_module_view	Allows viewing the providers module | Permite ver el módulo de proveedores	2026-02-03 14:45:18.958983	\N
3e1eb9a3-aaa6-43c0-82a9-9ef53cc6ebb4	providers	provider_create	Allows creating providers | Permite crear proveedores	2026-02-03 14:45:18.960496	\N
86890494-4d08-419a-9f8d-d3e5cc80cd30	providers	provider_read	Allows reading providers | Permite leer proveedores	2026-02-03 14:45:18.961946	\N
a1aa507f-ab10-47be-a428-57fe711e7478	providers	provider_update	Allows updating providers | Permite actualizar proveedores	2026-02-03 14:45:18.963266	\N
3517dca4-cac5-4d82-959b-476ce61d96a6	providers	provider_delete	Allows deleting providers | Permite eliminar proveedores	2026-02-03 14:45:18.964628	\N
7dd5f0cd-aca3-4533-9315-bbbe44b7b524	measurement_units	measurement_unit_module_view	Allows viewing the measurement units module | Permite ver el módulo de unidades de medida	2026-02-03 14:45:18.965921	\N
17ee546f-50ae-4746-b465-f055028ccc30	measurement_units	measurement_unit_create	Allows creating measurement units | Permite crear unidades de medida	2026-02-03 14:45:18.967222	\N
dc503339-3b5c-4413-bf5d-a58a2e4690b6	measurement_units	measurement_unit_read	Allows reading measurement units | Permite leer unidades de medida	2026-02-03 14:45:18.968523	\N
cd74d56d-3a7e-49bf-be0a-7f5cb6a42741	measurement_units	measurement_unit_update	Allows updating measurement units | Permite actualizar unidades de medida	2026-02-03 14:45:18.969786	\N
cc7d29db-8a35-460a-9478-00386776bfec	measurement_units	measurement_unit_delete	Allows deleting measurement units | Permite eliminar unidades de medida	2026-02-03 14:45:18.971042	\N
86c5bbac-36a2-4dce-9e7d-1319f1a99b73	brands	brand_module_view	Allows viewing the brands module | Permite ver el módulo de marcas	2026-02-03 14:45:18.972243	\N
aeb4c9e0-3d95-4596-a2d6-404c5986ac0b	brands	brand_create	Allows creating brands | Permite crear marcas	2026-02-03 14:45:18.973462	\N
697e68d3-982a-41ea-824c-e72053c58a39	brands	brand_read	Allows reading brands | Permite leer marcas	2026-02-03 14:45:18.974692	\N
85ea04f0-24ec-4397-bd98-514a2dc91bd0	brands	brand_update	Allows updating brands | Permite actualizar marcas	2026-02-03 14:45:18.975909	\N
f0918d28-62c4-422a-8eaf-283ec85059e3	brands	brand_delete	Allows deleting brands | Permite eliminar marcas	2026-02-03 14:45:18.976831	\N
8e59e8d1-80b1-435b-a940-0e31007f5ce0	categories	category_module_view	Allows viewing the categories module | Permite ver el módulo de categorías	2026-02-03 14:45:18.978561	\N
fc289f49-25db-45a7-bb51-e569ba2c57fe	categories	category_create	Allows creating categories | Permite crear categorías	2026-02-03 14:45:18.979532	\N
bd9f7761-35d7-424c-9182-070f255287a2	categories	category_read	Allows reading categories | Permite leer categorías	2026-02-03 14:45:18.980374	\N
b5a3a147-666a-41f3-ad45-25bb1efb4362	categories	category_update	Allows updating categories | Permite actualizar categorías	2026-02-03 14:45:18.981201	\N
c34d8d02-7b7b-4e9d-97a2-c77ad43ce624	categories	category_delete	Allows deleting categories | Permite eliminar categorías	2026-02-03 14:45:18.982026	\N
94dc6d1d-a7a1-442e-b3d6-db891cdfcf90	taxes	tax_module_view	Allows viewing the taxes module | Permite ver el módulo de impuestos	2026-02-03 14:45:18.982965	\N
4595eeed-0fb3-47ad-8c6d-a496d383e2f7	taxes	tax_create	Allows creating taxes | Permite crear impuestos	2026-02-03 14:45:18.984273	\N
416a18fb-8535-44b9-940a-1a84a6ff93bc	taxes	tax_read	Allows reading taxes | Permite leer impuestos	2026-02-03 14:45:18.985334	\N
516b3b4c-43b5-4350-932a-5ef3cc67f9a2	taxes	tax_update	Allows updating taxes | Permite actualizar impuestos	2026-02-03 14:45:18.986362	\N
105220ff-b57e-4376-a9da-41db3b262555	taxes	tax_delete	Allows deleting taxes | Permite eliminar impuestos	2026-02-03 14:45:18.987447	\N
636caad6-a8a1-4bcb-9be7-721ae52e721e	currencies	currency_module_view	Allows viewing the currencies module | Permite ver el módulo de monedas	2026-02-03 14:45:18.988481	\N
78eec845-c07c-4bfc-9ddc-4b807dbe0c2d	currencies	currency_create	Allows creating currencies | Permite crear monedas	2026-02-03 14:45:18.989557	\N
84edff4b-5de4-4bca-a671-5624a7b47086	currencies	currency_read	Allows reading currencies | Permite leer monedas	2026-02-03 14:45:18.990604	\N
ba1beb67-7fcf-4e71-8529-3c2c1c0544a0	currencies	currency_update	Allows updating currencies | Permite actualizar monedas	2026-02-03 14:45:18.991869	\N
49a82860-0131-4ef7-ac61-24ff11a57fb8	currencies	currency_delete	Allows deleting currencies | Permite eliminar monedas	2026-02-03 14:45:18.992955	\N
f8742ed8-39af-4fde-99e8-3b23d52d2f80	products	product_module_view	Allows viewing the products module | Permite ver el módulo de productos	2026-02-03 14:45:18.994361	\N
6cd77085-878b-4c6f-9d14-9c23cb986e1b	products	product_create	Allows creating products | Permite crear productos	2026-02-03 14:45:18.995654	\N
265f0647-6095-4cac-a7f1-728771875934	products	product_read	Allows reading products | Permite leer productos	2026-02-03 14:45:18.996787	\N
25913a03-657c-4d1b-a715-faf892714bc3	products	product_update	Allows updating products | Permite actualizar productos	2026-02-03 14:45:18.997908	\N
e3857a6d-8b6c-40da-bec9-a7cbbbad144c	products	product_delete	Allows deleting products | Permite eliminar productos	2026-02-03 14:45:18.999019	\N
20db3fb4-cdff-4b92-b187-7c1bed6116ed	inventory	inventory_module_view	Allows viewing the inventory module | Permite ver el módulo de inventario	2026-02-03 14:45:19.000631	\N
df1239d0-313b-4d64-a51b-4922dae5c0b9	inventory	inventory_create	Allows creating inventory records | Permite crear registros de inventario	2026-02-03 14:45:19.001721	\N
e88b904d-8ee5-47b1-9cbb-aee132d166d5	inventory	inventory_read	Allows reading inventory records | Permite leer registros de inventario	2026-02-03 14:45:19.002766	\N
f373e7c6-7700-4ce6-af79-aa2f150c1c9f	inventory	inventory_update	Allows updating inventory records | Permite actualizar registros de inventario	2026-02-03 14:45:19.003784	\N
ea4a59c5-ea17-4e6c-8b22-8a5c2c76a773	inventory	inventory_delete	Allows deleting inventory records | Permite eliminar registros de inventario	2026-02-03 14:45:19.004827	\N
508c3a32-bdfd-4def-b4ff-f85b294f86a5	warehouses	warehouse_module_view	Allows viewing the warehouses module | Permite ver el módulo de almacenes	2026-02-03 14:45:19.005868	\N
6997c7bb-4c6f-46b5-898b-b821f400ecdf	warehouses	warehouse_create	Allows creating warehouses | Permite crear almacenes	2026-02-03 14:45:19.006774	\N
b1e77341-401a-4649-a5c8-05fd2a35f32f	warehouses	warehouse_close	Allows close warehouses | Permite cerrar almacenes	2026-02-03 14:45:19.007694	\N
de4c67f6-f913-4793-bdf7-5c706d282919	warehouses	warehouse_read	Allows reading warehouses | Permite leer almacenes	2026-02-03 14:45:19.008614	\N
17267672-8070-4479-95f9-62c8bfb4e6e0	warehouses	warehouse_update	Allows updating warehouses | Permite actualizar almacenes	2026-02-03 14:45:19.009509	\N
1c10c6d2-7070-4c77-b3a7-5af54959247c	warehouses	warehouse_delete	Allows deleting warehouses | Permite eliminar almacenes	2026-02-03 14:45:19.010412	\N
0323763a-1c12-4816-aaf4-35eed7bf05f5	warehouse_openings	warehouse_opening_module_view	Allows viewing the warehouse openings module | Permite ver el módulo de aperturas de almacén	2026-02-03 14:45:19.011326	\N
e75076fa-919b-412e-8c6a-263f180ca714	warehouse_openings	warehouse_opening_create	Allows creating warehouse openings | Permite crear aperturas de almacén	2026-02-03 14:45:19.012216	\N
f3a9be1a-0218-4cad-b132-1d17f87a6499	warehouse_openings	warehouse_opening_read	Allows reading warehouse openings | Permite leer aperturas de almacén	2026-02-03 14:45:19.013175	\N
cf362a5e-fdc9-43cf-82e0-aab279d980d8	warehouse_openings	warehouse_opening_update	Allows updating warehouse openings | Permite actualizar aperturas de almacén	2026-02-03 14:45:19.014075	\N
f5390deb-b136-4454-9a5c-5ee9183ea602	warehouse_openings	warehouse_opening_delete	Allows deleting warehouse openings | Permite eliminar aperturas de almacén	2026-02-03 14:45:19.014941	\N
466d7879-6e98-425e-a8af-cc047323d0e5	receptions	reception_module_view	Allows viewing the receptions module | Permite ver el módulo de recepciones	2026-02-03 14:45:19.015788	\N
d477ac3a-eddb-432e-87ee-26c143c93f33	receptions	reception_create	Allows creating receptions | Permite crear recepciones	2026-02-03 14:45:19.016717	\N
c296fb0a-6a45-4abf-8d1a-6efa4db334fd	receptions	reception_read	Allows reading receptions | Permite leer recepciones	2026-02-03 14:45:19.017606	\N
9cf83373-05e0-4e8b-b95a-1a74c2c2dad5	receptions	reception_update	Allows updating receptions | Permite actualizar recepciones	2026-02-03 14:45:19.019468	\N
6626a3e4-735e-46a2-bde3-93c1b6071c58	receptions	reception_delete	Allows deleting receptions | Permite eliminar recepciones	2026-02-03 14:45:19.020342	\N
5471ae12-eff7-4c13-9bd8-1e21fb3929bb	reception_details	reception_detail_module_view	Allows viewing the reception details module | Permite ver el módulo de detalles de recepción	2026-02-03 14:45:19.021156	\N
eb3cafab-2cab-409f-8770-fa1268c8b4a1	reception_details	reception_detail_create	Allows creating reception details | Permite crear detalles de recepción	2026-02-03 14:45:19.022085	\N
1b46a252-5094-4a34-ad10-5e9cec483cee	reception_details	reception_detail_read	Allows reading reception details | Permite leer detalles de recepción	2026-02-03 14:45:19.023249	\N
e5f2f7dd-1dc6-4682-899e-cd7889da2325	reception_details	reception_detail_update	Allows updating reception details | Permite actualizar detalles de recepción	2026-02-03 14:45:19.024422	\N
810f204f-62d1-418e-a273-bff88cb5b371	reception_details	reception_detail_delete	Allows deleting reception details | Permite eliminar detalles de recepción	2026-02-03 14:45:19.025612	\N
c3076e2e-4546-4a08-9141-42b6fbbce76a	withdrawals	withdrawal_module_view	Allows viewing the withdrawals module | Permite ver el módulo de retiros	2026-02-03 14:45:19.026833	\N
1d9933d7-8e78-4f51-b559-0c4cb9db9e3c	withdrawals	withdrawal_create	Allows creating withdrawals | Permite crear retiros	2026-02-03 14:45:19.028109	\N
23bbe2f5-8992-4588-934a-7569f90674dd	withdrawals	withdrawal_read	Allows reading withdrawals | Permite leer retiros	2026-02-03 14:45:19.029165	\N
ccfbc324-3fb8-479a-b577-5bb420574cf5	withdrawals	withdrawal_update	Allows updating withdrawals | Permite actualizar retiros	2026-02-03 14:45:19.030199	\N
dcb198ee-60c0-4972-a63d-523f1623d930	withdrawals	withdrawal_delete	Allows deleting withdrawals | Permite eliminar retiros	2026-02-03 14:45:19.031393	\N
4a9d5080-6f4a-4922-bd69-004416b0e305	withdrawal_details	withdrawal_detail_module_view	Allows viewing the withdrawal details module | Permite ver el módulo de detalles de retiro	2026-02-03 14:45:19.032566	\N
70231fbf-efd1-4532-a7c1-72e46da0e84a	withdrawal_details	withdrawal_detail_create	Allows creating withdrawal details | Permite crear detalles de retiro	2026-02-03 14:45:19.033755	\N
5d80ef6d-344b-4bcf-a61e-572e1de8a382	withdrawal_details	withdrawal_detail_read	Allows reading withdrawal details | Permite leer detalles de retiro	2026-02-03 14:45:19.03492	\N
466d7b6d-5353-46a7-a881-ef5347d03e6b	withdrawal_details	withdrawal_detail_update	Allows updating withdrawal details | Permite actualizar detalles de retiro	2026-02-03 14:45:19.036092	\N
fb2e2c8e-3a47-4a84-bdcc-b7c27dcc97bf	withdrawal_details	withdrawal_detail_delete	Allows deleting withdrawal details | Permite eliminar detalles de retiro	2026-02-03 14:45:19.037268	\N
cd43100d-29bc-4815-bd3a-930a54a4fa16	product_history	product_history_module_view	Allows viewing the product history module | Permite ver el módulo de historial de productos	2026-02-03 14:45:19.038711	\N
5211db94-e2ae-4a94-b4e3-dbaef4ddda26	warehouse_adjustments	warehouse_adjustment_module_view	Allows viewing the warehouse adjustments module | Permite ver el módulo de ajustes entre almacenes	2026-02-03 14:45:19.039885	\N
35aff046-9c14-49fd-9ded-c3f7216698a8	warehouse_adjustments	warehouse_adjustment_create	Allows creating warehouse adjustments | Permite crear ajustes entre almacenes	2026-02-03 14:45:19.041134	\N
3c1cec99-3c13-4e36-9602-5d957124d074	warehouse_adjustments	warehouse_adjustment_read	Allows reading warehouse adjustments | Permite leer ajustes entre almacenes	2026-02-03 14:45:19.042349	\N
fac05653-e6e9-46b6-9d3c-49c926028fd0	warehouse_adjustments	warehouse_adjustment_update	Allows updating warehouse adjustments | Permite actualizar ajustes entre almacenes	2026-02-03 14:45:19.043599	\N
15e85bf8-2bcd-4e87-af1e-02d13d55c76e	warehouse_adjustments	warehouse_adjustment_delete	Allows deleting warehouse adjustments | Permite eliminar ajustes entre almacenes	2026-02-03 14:45:19.044807	\N
e0b53d49-c232-495c-9081-ea6c11d6ab84	warehouse_adjustments	warehouse_adjustment_process	Allows processing warehouse adjustments | Permite procesar ajustes entre almacenes	2026-02-03 14:45:19.045999	\N
591b6562-2cf9-4658-a6de-392caf8e0294	warehouse_adjustments	warehouse_adjustment_detail_create	Allows creating warehouse adjustment details | Permite crear detalles de ajustes entre almacenes	2026-02-03 14:45:19.047172	\N
4a0d66b7-55ad-4e1e-bc5a-279d897d6713	warehouse_adjustments	warehouse_adjustment_detail_read	Allows reading warehouse adjustment details | Permite leer detalles de ajustes entre almacenes	2026-02-03 14:45:19.04835	\N
937c251f-5672-4c3c-bae3-847ade078b7f	warehouse_adjustments	warehouse_adjustment_detail_update	Allows updating warehouse adjustment details | Permite actualizar detalles de ajustes entre almacenes	2026-02-03 14:45:19.050062	\N
55594d4e-bb91-476b-941e-7ce9b474b8f9	warehouse_adjustments	warehouse_adjustment_detail_delete	Allows deleting warehouse adjustment details | Permite eliminar detalles de ajustes entre almacenes	2026-02-03 14:45:19.050901	\N
12fca4f8-2e13-46db-9647-75938c450e99	returns	return_module_view	Allows viewing the returns module | Permite ver el módulo de devoluciones	2026-02-03 14:45:19.051742	\N
36a1ceb3-0adf-4f50-849f-3b173e9a88ed	returns	return_create	Allows creating returns | Permite crear devoluciones	2026-02-03 14:45:19.052679	\N
96a712a4-5daa-41ca-b528-366a8ebd2c90	returns	return_read	Allows reading returns | Permite leer devoluciones	2026-02-03 14:45:19.053582	\N
7126ecec-c975-4ea8-8c81-4af68fe79820	returns	return_update	Allows updating returns | Permite actualizar devoluciones	2026-02-03 14:45:19.054757	\N
874f4c68-7c7a-4bbd-9e01-0e6496e3dfd0	returns	return_delete	Allows deleting returns | Permite eliminar devoluciones	2026-02-03 14:45:19.055891	\N
d37c25f1-0b91-495b-903c-4565d9a0b873	returns	return_process	Allows processing returns | Permite procesar devoluciones	2026-02-03 14:45:19.057119	\N
4a724086-fbb7-42cf-b28c-3ed55d8bf4f6	returns	return_detail_create	Allows creating return details | Permite crear detalles de devoluciones	2026-02-03 14:45:19.058222	\N
24ae2cbe-f111-4ca3-b75d-8d4fefda95a4	returns	return_detail_read	Allows reading return details | Permite leer detalles de devoluciones	2026-02-03 14:45:19.059125	\N
78e3e4b0-afa6-4e7f-b40f-6facc1b5bdf1	returns	return_detail_update	Allows updating return details | Permite actualizar detalles de devoluciones	2026-02-03 14:45:19.061249	\N
72aa5173-dc0a-467d-b318-7755189ec582	returns	return_detail_delete	Allows deleting return details | Permite eliminar detalles de devoluciones	2026-02-03 14:45:19.062222	\N
f2781db8-d4c4-48b3-ba5a-ce99a9a92e29	product_history	product_history_create	Allows creating product history records | Permite crear registros de historial de productos	2026-02-03 14:45:19.063293	\N
b60f3ef3-977b-4786-bb1d-343d6851946d	product_history	product_history_read	Allows reading product history records | Permite leer registros de historial de productos	2026-02-03 14:45:19.064143	\N
742e7de7-b30b-4c79-b3f2-ea6825db9f07	product_history	product_history_update	Allows updating product history records | Permite actualizar registros de historial de productos	2026-02-03 14:45:19.064972	\N
142f0f7b-af8f-428e-abec-f889ea21bcef	product_history	product_history_delete	Allows deleting product history records | Permite eliminar registros de historial de productos	2026-02-03 14:45:19.065994	\N
f8280683-e6fa-43f6-926d-cb94b6d1524e	role_permissions	role_permission_module_view	Allows viewing the role permission assignment module | Permite ver el módulo de asignación de permisos a roles	2026-02-03 14:45:19.067345	\N
8fab6f5c-2eff-427f-a96a-3d48ccaeee71	role_permissions	role_permission_create	Allows creating role permission assignments | Permite crear asignaciones de permisos a roles	2026-02-03 14:45:19.068396	\N
cf3ce676-b9d8-469a-a8c8-c5d0ecf7ce61	role_permissions	role_permission_read	Allows reading role permission assignments | Permite leer asignaciones de permisos a roles	2026-02-03 14:45:19.069399	\N
97b0bf39-7177-4205-bfeb-243aef139d87	role_permissions	role_permission_update	Allows updating role permission assignments | Permite actualizar asignaciones de permisos a roles	2026-02-03 14:45:19.070703	\N
d15abf58-be9d-4639-ae6a-4f7eabfff85e	role_permissions	role_permission_delete	Allows deleting role permission assignments | Permite eliminar asignaciones de permisos a roles	2026-02-03 14:45:19.071937	\N
6231902d-e598-42d2-a652-af137d67dd6f	purchase_orders	purchase_order_module_view	Allows viewing the purchase orders module | Permite ver el módulo de órdenes de compra	2026-02-03 14:45:19.073088	\N
bb1fe922-64f4-42e1-934b-8ecefccee2eb	purchase_orders	purchase_order_create	Allows creating purchase orders | Permite crear órdenes de compra	2026-02-03 14:45:19.074263	\N
82160aa8-bbe9-4136-bdc6-14a28baee5a2	purchase_orders	purchase_order_read	Allows reading purchase orders | Permite leer órdenes de compra	2026-02-03 14:45:19.07547	\N
8672cf30-70cd-48b3-9322-56e680fa3533	purchase_orders	purchase_order_update	Allows updating purchase orders | Permite actualizar órdenes de compra	2026-02-03 14:45:19.076631	\N
8837d8a7-9e04-4fdd-b7da-30dd20bbf485	purchase_orders	purchase_order_delete	Allows deleting purchase orders | Permite eliminar órdenes de compra	2026-02-03 14:45:19.077812	\N
6112b179-bfcb-4106-9d51-5efbaf8f5b11	purchase_orders	purchase_order_approve	Allows approving purchase orders | Permite aprobar órdenes de compra	2026-02-03 14:45:19.078823	\N
e6696c94-02e8-4a41-b9e9-6f0b6e449ade	purchase_orders	purchase_order_reject	Allows rejecting purchase orders | Permite rechazar órdenes de compra	2026-02-03 14:45:19.079756	\N
743da16a-aa4c-4747-8ea9-e23cdfa6ee79	purchase_orders	purchase_order_cancel	Allows cancelling purchase orders | Permite cancelar órdenes de compra	2026-02-03 14:45:19.080729	\N
263a2ffa-ad80-4b8d-9f7e-112c7e2d0070	purchase_order_details	purchase_order_detail_module_view	Allows viewing the purchase order details module | Permite ver el módulo de detalles de órdenes de compra	2026-02-03 14:45:19.081716	\N
f97ebbc3-cf59-475b-add1-4c897200f83c	purchase_order_details	purchase_order_detail_create	Allows creating purchase order details | Permite crear detalles de órdenes de compra	2026-02-03 14:45:19.082665	\N
1ea78a56-ccee-4e59-ba46-313efe19695d	purchase_order_details	purchase_order_detail_read	Allows reading purchase order details | Permite leer detalles de órdenes de compra	2026-02-03 14:45:19.083662	\N
fafc0479-cbbd-402c-b406-25407ad47cb0	purchase_order_details	purchase_order_detail_update	Allows updating purchase order details | Permite actualizar detalles de órdenes de compra	2026-02-03 14:45:19.084615	\N
5c5413cd-c31d-4d9e-bfc1-b5148d1b0030	purchase_order_details	purchase_order_detail_delete	Allows deleting purchase order details | Permite eliminar detalles de órdenes de compra	2026-02-03 14:45:19.085558	\N
f26004ec-72ac-45c6-83b5-a97a147a3346	invoices	invoice_module_view	Allows viewing the invoices module | Permite ver el módulo de facturas	2026-02-03 14:45:19.086521	\N
aedae31d-3bb9-4855-b051-1e31f07586fe	invoices	invoice_create	Allows creating invoices | Permite crear facturas	2026-02-03 14:45:19.087492	\N
d76540ff-933f-4fd0-8240-e8d8536a83a2	invoices	invoice_read	Allows reading invoices | Permite leer facturas	2026-02-03 14:45:19.088526	\N
6d0e2038-4f8d-41d0-9367-0bdeb1f6561b	invoices	invoice_update	Allows updating invoices | Permite actualizar facturas	2026-02-03 14:45:19.089543	\N
2e5c4900-3258-41c5-8407-e310f8378ad4	invoices	invoice_delete	Allows deleting invoices | Permite eliminar facturas	2026-02-03 14:45:19.090484	\N
41598edc-5368-4ff1-954c-4ee0904d050f	invoices	invoice_generate_cfdi	Allows generating CFDI for invoices | Permite generar CFDI para facturas	2026-02-03 14:45:19.091472	\N
e54a43a9-e9d9-410c-b7fa-01c6a1661943	invoices	invoice_cancel_cfdi	Allows cancelling CFDI for invoices | Permite cancelar CFDI para facturas	2026-02-03 14:45:19.092425	\N
7302ee6b-ab3d-418b-8987-0567acf924de	invoices	invoice_download_pdf	Allows downloading PDF of invoices | Permite descargar PDF de facturas	2026-02-03 14:45:19.093492	\N
f4e21b26-397f-4fc9-84da-696bd62260d4	invoices	invoice_download_xml	Allows downloading XML of invoices | Permite descargar XML de facturas	2026-02-03 14:45:19.09442	\N
667f47f4-4970-4afa-84cf-bccba299379c	invoices	invoice_convert_withdrawal	Allows converting withdrawals to invoices | Permite convertir retiros en facturas	2026-02-03 14:45:19.095299	\N
5740f4ee-76bb-4f3c-8631-0c1dcaa41dd5	invoice_details	invoice_detail_module_view	Allows viewing the invoice details module | Permite ver el módulo de detalles de facturas	2026-02-03 14:45:19.096178	\N
bae01ca7-4017-46e9-a80d-9e91ae75b3c5	invoice_details	invoice_detail_create	Allows creating invoice details | Permite crear detalles de facturas	2026-02-03 14:45:19.09708	\N
eb921b24-0097-43fe-8deb-037908cf311e	invoice_details	invoice_detail_read	Allows reading invoice details | Permite leer detalles de facturas	2026-02-03 14:45:19.097968	\N
ca676f48-26ac-48c9-a8c7-3b18f296f90a	invoice_details	invoice_detail_update	Allows updating invoice details | Permite actualizar detalles de facturas	2026-02-03 14:45:19.098852	\N
5d55f5bd-a7e8-4565-bc82-61ea25737ae0	invoice_details	invoice_detail_delete	Allows deleting invoice details | Permite eliminar detalles de facturas	2026-02-03 14:45:19.099719	\N
5b5c21f5-7d09-45bc-9fb9-1ae1517a9100	backups	backup_module_view	Allows viewing the backups module | Permite ver el módulo de respaldos	2026-02-03 14:45:19.100554	\N
d075b215-da4f-43cd-bd9e-c8c0d62827e0	backups	backup_config_read	Allows reading backup configuration | Permite leer la configuración de respaldos	2026-02-03 14:45:19.101499	\N
831cb2a3-4ed6-4bfc-8d7b-75fd2740dcc4	backups	backup_config_update	Allows updating backup configuration | Permite actualizar la configuración de respaldos	2026-02-03 14:45:19.102893	\N
3db032d1-22ce-406a-80ce-f3faf1f2b58e	backups	backup_run	Allows running manual backups | Permite realizar respaldos manuales	2026-02-03 14:45:19.10379	\N
cd22eaea-1bbb-4a41-98f0-c7cdb5a8af9f	backups	backup_log_read	Allows reading backup logs | Permite leer los registros de respaldos	2026-02-03 14:45:19.104688	\N
7526c6e5-bdbe-4c91-a7ae-c0aae76e4b02	backups	backup_download	Allows downloading backup files | Permite descargar los archivos de respaldo	2026-02-03 14:45:19.105811	\N
\.


--
-- Data for Name: product_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_history (id, product_id, warehouse_id, operation_type, operation_id, quantity, current_stock, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, slug, description, sku, code, barcode, weight, width, height, length, brand_id, category_id, measurement_unit_id, tax_id, is_active, type, images, created_at, updated_at, deleted_at) FROM stdin;
602c4404-4a52-4ef4-a330-08df735d46a8	iPhone 15 Pro Max	iphone-15-pro-max	El iPhone más avanzado con chip A17 Pro y cámara de 48MP	IP15PM-256-GOLD	PRD-001	\N	0.22	0.08	0.16	0.01	419ddd81-f8e0-422b-8ee5-76140b8fccbf	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.829362	2026-02-03 14:45:18.829362	\N
549cb952-a216-4fdd-b9f9-828025b077eb	Samsung Galaxy S24 Ultra	samsung-galaxy-s24-ultra	Flagship Android con S Pen integrado y cámara de 200MP	SGS24U-512-BLK	PRD-002	\N	0.23	0.08	0.16	0.01	9a2573eb-2424-4e37-81dc-7d50f380c188	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.833523	2026-02-03 14:45:18.833523	\N
fe01242d-8ee3-4d94-8ac6-b17abf50fe10	Google Pixel 8 Pro	google-pixel-8-pro	Smartphone con IA avanzada y cámara de Google	GP8P-256-BAY	PRD-003	\N	0.21	0.08	0.16	0.01	e4dd5e09-1686-425d-b087-8f403fc5bd8d	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.835878	2026-02-03 14:45:18.835878	\N
b2c936e1-1eb2-4fbf-989f-9728b32c8b0c	Xiaomi 14 Ultra	xiaomi-14-ultra	Flagship de Xiaomi con cámara Leica y Snapdragon 8 Gen 3	XM14U-512-WHT	PRD-004	\N	0.22	0.08	0.16	0.01	b205ecdf-8cd0-40a9-b79d-149fb34d069c	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.838211	2026-02-03 14:45:18.838211	\N
9231c3f5-77a3-47b5-a13c-17c6a98008de	OnePlus 12	oneplus-12	Performance flagship con carga rápida de 100W	OP12-256-GRN	PRD-005	\N	0.22	0.08	0.16	0.01	4579ecac-2edf-49b1-8242-dd388c512da7	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.840677	2026-02-03 14:45:18.840677	\N
b2bc2859-d0bc-4647-a62e-ce0d58d0c9e9	MacBook Pro 16" M3 Max	macbook-pro-16-m3-max	Laptop profesional con chip M3 Max y 32GB RAM	MBP16-M3M-1TB-SP	PRD-006	\N	2.16	0.25	0.36	0.02	419ddd81-f8e0-422b-8ee5-76140b8fccbf	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.843032	2026-02-03 14:45:18.843032	\N
9d5f062f-3fe4-4a65-b424-11f306d9d9d1	Dell XPS 15	dell-xps-15	Laptop premium con pantalla OLED y RTX 4070	DXPS15-32GB-1TB	PRD-007	\N	1.80	0.23	0.34	0.02	2df58096-1369-483e-8e14-b7d37aaa1103	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.845314	2026-02-03 14:45:18.845314	\N
78fc5615-5c7d-4103-b24a-68165070068a	Lenovo ThinkPad X1 Carbon	lenovo-thinkpad-x1-carbon	Ultrabook empresarial con procesador Intel Core i7	LTX1C-16GB-512GB	PRD-008	\N	1.12	0.22	0.31	0.02	4e5d8b3e-26a1-478e-819b-ff332b93ddd9	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.8468	2026-02-03 14:45:18.8468	\N
f0ec50a7-1f4d-4fc0-a7d2-d549facadced	ASUS ROG Strix G16	asus-rog-strix-g16	Gaming laptop con RTX 4080 y pantalla 240Hz	ARGS16-32GB-2TB	PRD-009	\N	2.50	0.28	0.35	0.03	f3e0f6e2-4b96-4ea4-8ccf-4c184b28be3a	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.84821	2026-02-03 14:45:18.84821	\N
2d914e7b-520e-495c-8cb3-be37294f0d33	MSI Raider GE78 HX	msi-raider-ge78-hx	Gaming laptop con Intel i9 y RTX 4090	MRGE78-64GB-4TB	PRD-010	\N	3.00	0.29	0.38	0.03	081a2392-0cd5-4160-bc07-e9078dbb28e3	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.850941	2026-02-03 14:45:18.850941	\N
6a9b3bae-ed22-4fbd-95fd-22e9ae69a049	AirPods Pro 2	airpods-pro-2	Auriculares inalámbricos con cancelación de ruido activa	APP2-WHT	PRD-011	\N	0.01	0.02	0.02	0.03	419ddd81-f8e0-422b-8ee5-76140b8fccbf	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.852591	2026-02-03 14:45:18.852591	\N
5c1d12bb-ec44-400d-87f3-0f6b5cdd3bb3	Sony WH-1000XM5	sony-wh-1000xm5	Auriculares over-ear con la mejor cancelación de ruido	SWHXM5-BLK	PRD-012	\N	0.25	0.17	0.25	0.08	926641b3-a64a-49fd-8c8f-cd7230d30a1d	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.85455	2026-02-03 14:45:18.85455	\N
327a434c-4acf-492c-907a-482a39604997	Bose QuietComfort 45	bose-quietcomfort-45	Auriculares con tecnología de cancelación de ruido avanzada	BQC45-BLK	PRD-013	\N	0.24	0.17	0.25	0.08	cfbe640c-43b5-475c-be94-fdf2e2fc6734	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.85654	2026-02-03 14:45:18.85654	\N
29056814-79e0-49df-9c52-7c61b755e86c	Sennheiser HD 660S	sennheiser-hd-660s	Auriculares de estudio con sonido de alta fidelidad	SHD660S-BLK	PRD-014	\N	0.26	0.18	0.27	0.09	7b712f82-5cbd-4fb2-a822-af68feb9b2df	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.858638	2026-02-03 14:45:18.858638	\N
aea95058-4989-4906-95bb-6d8615425efd	JBL Flip 6	jbl-flip-6	Altavoz portátil Bluetooth resistente al agua	JFLIP6-BLK	PRD-015	\N	0.55	0.07	0.18	0.07	8298a2a2-0f8a-4e27-ba47-c44a5055ece3	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.860944	2026-02-03 14:45:18.860944	\N
c331a1aa-b981-46ee-8b5b-9c0bb1e82d4b	Intel Core i9-14900K	intel-core-i9-14900k	Procesador de 24 núcleos con overclocking desbloqueado	ICI9-14900K	PRD-016	\N	0.04	0.04	0.04	0.00	e72d7628-60cb-4d57-9a1a-3acf57f92fc6	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.863248	2026-02-03 14:45:18.863248	\N
c637ccf3-12c5-4fc7-8c59-f1e06a82c4e5	AMD Ryzen 9 7950X	amd-ryzen-9-7950x	Procesador de 16 núcleos con arquitectura Zen 4	AR9-7950X	PRD-017	\N	0.04	0.04	0.04	0.00	79e283eb-c45b-4347-b913-d1ba550e3fff	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.865273	2026-02-03 14:45:18.865273	\N
4a9be596-1e18-4cc0-a7b5-2a75eb75d5a1	NVIDIA RTX 4090	nvidia-rtx-4090	Tarjeta gráfica más potente con 24GB GDDR6X	NRTX4090-FE	PRD-018	\N	2.20	0.30	0.14	0.06	aab13c3d-7583-494d-8dfa-b9e33d50c809	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.867242	2026-02-03 14:45:18.867242	\N
19ad36e5-a516-4764-988f-49b842404f55	Kingston Fury DDR5 32GB	kingston-fury-ddr5-32gb	Memoria RAM DDR5 de alta velocidad para gaming	KF32GB-6000	PRD-019	\N	0.05	0.13	0.03	0.00	6b30d26e-3b9d-408d-8539-5e76b24b1082	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.869179	2026-02-03 14:45:18.869179	\N
2ffb482b-26d4-4941-9d03-1a7e882c97e2	Samsung 990 Pro 2TB	samsung-990-pro-2tb	SSD NVMe de alta velocidad con 2TB de capacidad	S990P-2TB	PRD-020	\N	0.01	0.08	0.02	0.10	9a2573eb-2424-4e37-81dc-7d50f380c188	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.871384	2026-02-03 14:45:18.871384	\N
566e3649-a794-4cba-9ad9-90ff484f907f	Razer DeathAdder V3 Pro	razer-deathadder-v3-pro	Mouse gaming inalámbrico con sensor de 30K DPI	RDV3P-WHT	PRD-021	\N	0.06	0.07	0.13	0.04	9b6dd180-5b4e-4815-919e-1ead7413a5d8	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.874875	2026-02-03 14:45:18.874875	\N
1d24cb05-40ff-4131-b77f-ee09a25a6c82	Logitech G Pro X Superlight	logitech-g-pro-x-superlight	Mouse ultraligero para gaming competitivo	LGPXSL-BLK	PRD-022	\N	0.06	0.06	0.13	0.04	dfeed76c-d155-4be7-9df2-a81b0b498be1	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.8766	2026-02-03 14:45:18.8766	\N
5f6040f2-b50f-4224-abe8-4443825d820e	SteelSeries Apex Pro	steelseries-apex-pro	Teclado mecánico con switches ópticos ajustables	SSAP-BLK	PRD-023	\N	0.91	0.44	0.04	0.14	ae6c7482-c40c-4ce0-be3c-04045a312ded	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.877975	2026-02-03 14:45:18.877975	\N
cacf0621-1819-40dc-a888-625e7a2dbad0	Corsair K100 RGB	corsair-k100-rgb	Teclado premium con switches Cherry MX y teclas macro	CK100-BLK	PRD-024	\N	1.20	0.47	0.04	0.16	8bb9e760-0651-4387-a02c-32e0fa3757a3	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.879324	2026-02-03 14:45:18.879324	\N
4b538d00-1148-4ad3-9d49-a3a78a9cefd6	Razer BlackShark V2 Pro	razer-blackshark-v2-pro	Auriculares gaming con micrófono removible	RBSV2P-BLK	PRD-025	\N	0.32	0.19	0.20	0.09	9b6dd180-5b4e-4815-919e-1ead7413a5d8	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.881091	2026-02-03 14:45:18.881091	\N
790f0316-ce21-4404-9a2b-89c2504f91c6	Canon EOS R5	canon-eos-r5	Cámara mirrorless full-frame con 8K video	CER5-BLK	PRD-026	\N	0.74	0.14	0.10	0.09	c42184db-d336-447a-b0a1-b69ee99a1f33	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.883055	2026-02-03 14:45:18.883055	\N
0b8063b2-1be4-4866-a318-0d5954c3a702	Nikon Z9	nikon-z9	Cámara mirrorless profesional con sensor de 45.7MP	NZ9-BLK	PRD-027	\N	1.34	0.15	0.12	0.09	53bfaf11-1d4f-49ae-921c-cb0f607d3103	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.885032	2026-02-03 14:45:18.885032	\N
65479763-c082-4017-89d9-9438d9361960	Sony A7R V	sony-a7r-v	Cámara mirrorless con sensor de 61MP y IA avanzada	SA7RV-BLK	PRD-028	\N	0.72	0.13	0.10	0.08	926641b3-a64a-49fd-8c8f-cd7230d30a1d	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.886997	2026-02-03 14:45:18.886997	\N
fea97beb-131a-4093-b771-ed49420186c9	LG 27GP950-B	lg-27gp950-b	Monitor gaming 4K 144Hz con FreeSync Premium Pro	L27GP950-BLK	PRD-029	\N	6.80	0.61	0.37	0.24	69c7324f-b878-4642-b5ed-8bec72f34248	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.888913	2026-02-03 14:45:18.888913	\N
46df8a5b-8b43-4115-a9b8-2c447d9d57e5	Samsung Odyssey G9	samsung-odyssey-g9	Monitor ultrawide curvo 49" 240Hz	SOG9-49	PRD-030	\N	13.20	1.15	0.37	0.38	9a2573eb-2424-4e37-81dc-7d50f380c188	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.890764	2026-02-03 14:45:18.890764	\N
fcac0fb6-65f0-46f7-bde7-f0fb2dae362b	iPad Pro 12.9" M2	ipad-pro-12-9-m2	Tablet profesional con chip M2 y pantalla Liquid Retina XDR	IPP12-M2-256GB	PRD-031	\N	0.68	0.21	0.28	0.01	419ddd81-f8e0-422b-8ee5-76140b8fccbf	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.892594	2026-02-03 14:45:18.892594	\N
4a1cb19f-f0de-47e4-ae6c-694168953df0	Samsung Galaxy Tab S9 Ultra	samsung-galaxy-tab-s9-ultra	Tablet Android de 14.6" con S Pen incluido	SGTS9U-256GB	PRD-032	\N	0.73	0.21	0.33	0.01	9a2573eb-2424-4e37-81dc-7d50f380c188	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.895348	2026-02-03 14:45:18.895348	\N
e95d2478-7ea1-42c4-be6a-de05a09b8ea5	Apple Watch Series 9	apple-watch-series-9	Smartwatch con chip S9 y monitor de salud avanzado	AWS9-45MM-ALUM	PRD-033	\N	0.05	0.05	0.05	0.01	419ddd81-f8e0-422b-8ee5-76140b8fccbf	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.896708	2026-02-03 14:45:18.896708	\N
3085d950-a813-4fe5-8453-2516bbfe1ca8	Samsung Galaxy Watch 6 Classic	samsung-galaxy-watch-6-classic	Smartwatch con bisel rotativo y Wear OS	SGWC6-47MM	PRD-034	\N	0.06	0.05	0.05	0.01	9a2573eb-2424-4e37-81dc-7d50f380c188	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.897998	2026-02-03 14:45:18.897998	\N
a3d84b80-94b8-47cc-96d6-7f76093735c3	PlayStation 5	playstation-5	Consola de nueva generación con SSD ultra rápido	PS5-DISC	PRD-035	\N	4.50	0.39	0.10	0.26	926641b3-a64a-49fd-8c8f-cd7230d30a1d	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.89925	2026-02-03 14:45:18.89925	\N
1f85dd2c-7089-40a4-88a9-b01849f255c7	Xbox Series X	xbox-series-x	Consola más potente con 12 TFLOPS de rendimiento	XSX-1TB	PRD-036	\N	4.45	0.15	0.15	0.30	9910a685-90e6-4497-9108-183cf6c1bdcc	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.901116	2026-02-03 14:45:18.901116	\N
63e5e45f-3daa-487c-9d7a-b8593b941ff5	Western Digital Black SN850X 2TB	western-digital-black-sn850x-2tb	SSD NVMe de alta velocidad para gaming	WDSN850X-2TB	PRD-037	\N	0.01	0.08	0.02	0.10	a13b1943-cac6-4857-b070-0c890dc4ca77	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.903033	2026-02-03 14:45:18.903033	\N
0171aed8-a05b-4c21-8155-d3d6a5dcd7b9	Seagate FireCuda 530 2TB	seagate-firecuda-530-2tb	SSD NVMe con velocidades de hasta 7300 MB/s	SFC530-2TB	PRD-038	\N	0.01	0.08	0.02	0.10	6e1130d6-3b73-46d7-ae0c-f67354756b55	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	tangible	\N	2026-02-03 14:45:18.904958	2026-02-03 14:45:18.904958	\N
ebf274bf-e56e-4e39-a236-c0a2cfbaefec	Servicio de Mantenimiento PC	servicio-mantenimiento-pc	Servicio de mantenimiento preventivo para computadoras	SERV-MANT-PC	PRD-039	\N	\N	\N	\N	\N	b6e091cf-90e6-4366-a133-69d67f6b2a29	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	service	\N	2026-02-03 14:45:18.906898	2026-02-03 14:45:18.906898	\N
62a1753e-fe02-407b-a116-d44482d97e26	Servicio de Reparación Smartphone	servicio-reparacion-smartphone	Servicio de reparación para smartphones y tablets	SERV-REP-SMART	PRD-040	\N	\N	\N	\N	\N	b6e091cf-90e6-4366-a133-69d67f6b2a29	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	service	\N	2026-02-03 14:45:18.908984	2026-02-03 14:45:18.908984	\N
d75f7266-4edf-4c0b-9a87-0e1e20c33649	Servicio de Instalación Software	servicio-instalacion-software	Instalación y configuración de software especializado	SERV-INST-SOFT	PRD-041	\N	\N	\N	\N	\N	b6e091cf-90e6-4366-a133-69d67f6b2a29	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	service	\N	2026-02-03 14:45:18.910561	2026-02-03 14:45:18.910561	\N
7ea97258-9fe9-4078-bd1f-edb3b57e67e7	Servicio de Recuperación de Datos	servicio-recuperacion-datos	Recuperación de datos de discos dañados	SERV-REC-DATOS	PRD-042	\N	\N	\N	\N	\N	b6e091cf-90e6-4366-a133-69d67f6b2a29	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	service	\N	2026-02-03 14:45:18.912502	2026-02-03 14:45:18.912502	\N
649e74eb-6a76-460a-99be-429a4969ad95	Servicio de Consultoría IT	servicio-consultoria-it	Consultoría en tecnologías de la información	SERV-CONS-IT	PRD-043	\N	\N	\N	\N	\N	b6e091cf-90e6-4366-a133-69d67f6b2a29	aefa552b-18f6-4ca1-a510-8761ac304458	a5091d3d-00cd-410e-a458-cf1a15912576	f594329d-cbc1-4973-ab0f-dde8652824b2	t	service	\N	2026-02-03 14:45:18.914664	2026-02-03 14:45:18.914664	\N
\.


--
-- Data for Name: providers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.providers (id, code, description, name, document, phone, email, address, status, created_at, updated_at, deleted_at) FROM stdin;
666d094e-4773-4f19-918c-123ce349a042	PROV001	Proveedor de productos electrónicos	Proveedor Mayorista A	PMA123456789	5552223344	ventas@proveedora.com	Av. Ejército Nacional 500, CDMX	t	2026-02-03 14:45:18.818606	2026-02-03 14:45:18.818606	\N
86633789-5b8a-4bd4-9eba-cc8f6871132d	PROV002	Distribuidor de productos industriales	Distribuidora Industrial B	DIB987654321	5553334455	contacto@distribuidorab.com	Av. Tamaulipas 200, CDMX	t	2026-02-03 14:45:18.820706	2026-02-03 14:45:18.820706	\N
8e3e000f-010b-40c5-8a0c-f6e88f9c95fc	PROV003	Importadora de productos varios	Importadora C	IMP456789123	5554445566	importaciones@importadorac.com	Blvd. Adolfo López Mateos 1000, CDMX	t	2026-02-03 14:45:18.822225	2026-02-03 14:45:18.822225	\N
\.


--
-- Data for Name: purchase_order_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_order_details (id, purchase_order_id, product_id, quantity, price, received_quantity, created_at, updated_at, deleted_at) FROM stdin;
15b88964-3d79-4e70-90eb-a73f384c194f	87f345cc-9955-48de-b61b-87c46d51c6f2	fe01242d-8ee3-4d94-8ac6-b17abf50fe10	2.00	39.23	1.00	2026-02-03 14:45:19.392582	2026-02-03 14:45:19.392582	\N
d6492384-66ec-4e64-b91f-07cc93a3ea01	87f345cc-9955-48de-b61b-87c46d51c6f2	2d914e7b-520e-495c-8cb3-be37294f0d33	6.00	108.43	4.00	2026-02-03 14:45:19.394442	2026-02-03 14:45:19.394442	\N
7c11e54e-eff4-43a6-88db-90b4bc2e6f2b	87f345cc-9955-48de-b61b-87c46d51c6f2	566e3649-a794-4cba-9ad9-90ff484f907f	9.00	26.99	6.00	2026-02-03 14:45:19.395209	2026-02-03 14:45:19.395209	\N
78643151-7d7d-4584-886b-bbc3affb9da4	b1a9e073-bef7-459d-9f01-465ddb8f8dd4	fea97beb-131a-4093-b771-ed49420186c9	2.00	49.49	0.00	2026-02-03 14:45:19.397177	2026-02-03 14:45:19.397177	\N
f089388e-6d36-45be-a67f-bfbebd8e3ea2	b1a9e073-bef7-459d-9f01-465ddb8f8dd4	c637ccf3-12c5-4fc7-8c59-f1e06a82c4e5	7.00	63.67	0.00	2026-02-03 14:45:19.397917	2026-02-03 14:45:19.397917	\N
3eb8e56a-6803-4d8e-a6c1-a6b037a94eca	3baf3d6b-9826-4b3e-a132-6d12417efdd6	602c4404-4a52-4ef4-a330-08df735d46a8	4.00	33.44	4.00	2026-02-03 14:45:19.399861	2026-02-03 14:45:19.399861	\N
b27f226f-67c6-4015-8550-82fa1272b121	3baf3d6b-9826-4b3e-a132-6d12417efdd6	19ad36e5-a516-4764-988f-49b842404f55	2.00	64.36	2.00	2026-02-03 14:45:19.400604	2026-02-03 14:45:19.400604	\N
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchase_orders (id, code, date, provider_id, warehouse_id, document, amount, status, notes, expected_delivery_date, created_at, updated_at, deleted_at) FROM stdin;
87f345cc-9955-48de-b61b-87c46d51c6f2	PO-2024-001	2024-01-14	666d094e-4773-4f19-918c-123ce349a042	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	FACT-001	2500.00	APPROVED	Orden de compra para equipos de cómputo	2024-01-24	2026-02-03 14:45:19.391331	2026-02-03 14:45:19.391331	\N
b1a9e073-bef7-459d-9f01-465ddb8f8dd4	PO-2024-002	2024-01-19	86633789-5b8a-4bd4-9eba-cc8f6871132d	b9a5f13a-8f9b-43ae-80d3-f6a8c316b43c	FACT-002	1800.00	PENDING	Orden de compra para accesorios	2024-02-04	2026-02-03 14:45:19.396341	2026-02-03 14:45:19.396341	\N
3baf3d6b-9826-4b3e-a132-6d12417efdd6	PO-2024-003	2024-01-24	8e3e000f-010b-40c5-8a0c-f6e88f9c95fc	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	FACT-003	3200.00	COMPLETED	Orden de compra para componentes	2024-02-09	2026-02-03 14:45:19.399015	2026-02-03 14:45:19.399015	\N
\.


--
-- Data for Name: reception_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reception_details (id, reception_id, product_id, quantity, price, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: receptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.receptions (id, code, date, provider_id, warehouse_id, document, amount, status, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: return_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.return_details (id, return_id, product_id, quantity, price, created_at, updated_at, deleted_at) FROM stdin;
8c42bc92-1487-4c66-bf09-1a92c2483872	5b8f2a2a-d2a8-45e9-a16f-16216465d342	602c4404-4a52-4ef4-a330-08df735d46a8	6.00	68.00	2026-02-03 14:45:19.385259	2026-02-03 14:45:19.385259	\N
9e5e200b-c07b-4ba3-860f-05c33ad323ed	5b8f2a2a-d2a8-45e9-a16f-16216465d342	549cb952-a216-4fdd-b9f9-828025b077eb	10.00	17.00	2026-02-03 14:45:19.385259	2026-02-03 14:45:19.385259	\N
e28d6b0d-b7a5-4ebd-941f-a8a60a71cf45	5b8f2a2a-d2a8-45e9-a16f-16216465d342	fe01242d-8ee3-4d94-8ac6-b17abf50fe10	3.00	103.00	2026-02-03 14:45:19.385259	2026-02-03 14:45:19.385259	\N
e74aea2d-2837-4084-8910-5c4c284b9171	7728b051-5dc9-4bf9-b3c7-7df4ceef19a1	602c4404-4a52-4ef4-a330-08df735d46a8	6.00	97.00	2026-02-03 14:45:19.387953	2026-02-03 14:45:19.387953	\N
97151956-b512-42aa-b5f5-257239b19145	7728b051-5dc9-4bf9-b3c7-7df4ceef19a1	549cb952-a216-4fdd-b9f9-828025b077eb	7.00	29.00	2026-02-03 14:45:19.387953	2026-02-03 14:45:19.387953	\N
7080ef42-21e0-4400-9abc-4e1c9fef9445	7728b051-5dc9-4bf9-b3c7-7df4ceef19a1	fe01242d-8ee3-4d94-8ac6-b17abf50fe10	6.00	53.00	2026-02-03 14:45:19.387953	2026-02-03 14:45:19.387953	\N
\.


--
-- Data for Name: returns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.returns (id, code, source_warehouse_id, target_provider_id, date, description, status, created_at, updated_at, deleted_at) FROM stdin;
5b8f2a2a-d2a8-45e9-a16f-16216465d342	DEV202412010001	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	666d094e-4773-4f19-918c-123ce349a042	2024-11-30	Devolución de productos defectuosos al proveedor	f	2026-02-03 14:45:19.384227	2026-02-03 14:45:19.384227	\N
7728b051-5dc9-4bf9-b3c7-7df4ceef19a1	DEV202412020001	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	666d094e-4773-4f19-918c-123ce349a042	2024-12-01	Devolución por productos vencidos	f	2026-02-03 14:45:19.38697	2026-02-03 14:45:19.38697	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (id, role_id, permission_id, created_at, deleted_at) FROM stdin;
cedfc57b-d0c1-4594-8b92-d58e2f0a7f34	218f88bf-27a6-42b7-8772-0db15d46a017	d9f189a0-57bf-4f61-bbe7-95ebec25b0c5	2026-02-03 14:45:19.11255	\N
23c0e037-b063-4974-bbd8-413b02b9ff54	218f88bf-27a6-42b7-8772-0db15d46a017	5d19885c-e326-4adf-bce0-b1307e3860cc	2026-02-03 14:45:19.114023	\N
ab36a8c7-7268-44e4-98ab-427bb84f03dc	218f88bf-27a6-42b7-8772-0db15d46a017	fb7f0f1f-b26a-4a55-bd4f-19ab14f507f8	2026-02-03 14:45:19.115017	\N
df50bfb9-9c85-47e3-98e6-e916dd520208	218f88bf-27a6-42b7-8772-0db15d46a017	616b564e-de55-4d20-b7d2-7f8529f75ab7	2026-02-03 14:45:19.116005	\N
e765ec63-0d55-4a12-adcc-11704ff1eb6e	218f88bf-27a6-42b7-8772-0db15d46a017	c800e6b0-1d8e-4ade-854e-16d42a7ff6e0	2026-02-03 14:45:19.116968	\N
88a6c328-da68-4f4e-89ca-b9a42414b6e6	218f88bf-27a6-42b7-8772-0db15d46a017	7276e243-f977-477c-8b42-1e0e86f7e8ac	2026-02-03 14:45:19.117914	\N
64e2fb27-84e8-408f-9efb-82ea3af14e7b	218f88bf-27a6-42b7-8772-0db15d46a017	482a7b58-7431-46d5-83f1-4dd6a11fe88c	2026-02-03 14:45:19.118857	\N
13fd7bad-9bd0-4c86-ad3a-f3227b642948	218f88bf-27a6-42b7-8772-0db15d46a017	c5b42a0c-64a0-4f69-81bd-78b923c37f30	2026-02-03 14:45:19.119729	\N
ba6c8eb4-3d08-4594-b4a9-e3b536a89d18	218f88bf-27a6-42b7-8772-0db15d46a017	06dad633-03cd-4767-8b72-f180823aa89d	2026-02-03 14:45:19.120595	\N
565331f5-ae1f-40bf-a23a-2d912ebfb104	218f88bf-27a6-42b7-8772-0db15d46a017	4075aea6-71bc-4458-9ce0-0a90a4a63107	2026-02-03 14:45:19.121434	\N
4a0b3e90-c2d9-417c-912d-392c0cb20b50	218f88bf-27a6-42b7-8772-0db15d46a017	f5352ee3-fd3f-4baf-b8ae-251da59b7a14	2026-02-03 14:45:19.122222	\N
773aeb8b-865b-4a16-b1d3-e5b5ac558895	218f88bf-27a6-42b7-8772-0db15d46a017	d26bbef6-3d16-48cf-9079-a7b162b1627d	2026-02-03 14:45:19.123016	\N
4f3af6e3-0b80-4633-91bb-ccdb4ccf818b	218f88bf-27a6-42b7-8772-0db15d46a017	1b2431d5-145e-40ac-9d67-334bf1d5cd59	2026-02-03 14:45:19.123821	\N
6462a835-d87e-4e9a-82ef-e01844300ce5	218f88bf-27a6-42b7-8772-0db15d46a017	db0c8569-56e0-49f1-818a-2c66b07cfcd0	2026-02-03 14:45:19.124632	\N
cf895a75-54e1-4e0e-a59f-c457d8682579	218f88bf-27a6-42b7-8772-0db15d46a017	52de42e1-3749-4424-918e-dc897c8e569a	2026-02-03 14:45:19.125333	\N
0a8e6ac6-dedf-405f-b63c-968c026a8829	218f88bf-27a6-42b7-8772-0db15d46a017	031b34ba-3ae7-4525-9a83-a6fc07ca01dc	2026-02-03 14:45:19.126018	\N
e7456dd8-a6a9-4427-89b5-d5859b8e62e3	218f88bf-27a6-42b7-8772-0db15d46a017	f18d7f5e-a441-410b-926c-ced0ec2a6969	2026-02-03 14:45:19.126809	\N
1be3984e-4e1a-4c21-b765-803f3f9e9f04	218f88bf-27a6-42b7-8772-0db15d46a017	37664a16-622e-493f-bfad-9063186a7de9	2026-02-03 14:45:19.127541	\N
afce70fb-49b4-4c82-8ce5-ee2e79e85008	218f88bf-27a6-42b7-8772-0db15d46a017	57a0a09e-1f7d-40ba-a687-4264bea23722	2026-02-03 14:45:19.128219	\N
506c3f89-4e36-409e-bb21-ba0278c753a5	218f88bf-27a6-42b7-8772-0db15d46a017	08b25cb6-4443-4c79-a08d-07c49895b6ec	2026-02-03 14:45:19.128922	\N
df8e18e5-6218-414d-8559-bcab52c9b210	218f88bf-27a6-42b7-8772-0db15d46a017	0fc03786-d0dc-4954-b248-5cd8f5bef8a3	2026-02-03 14:45:19.129635	\N
16a08523-2ce3-4823-bda6-4131b16e307a	218f88bf-27a6-42b7-8772-0db15d46a017	b0b34dd7-8aa8-4fa8-8212-fc234e52d2fe	2026-02-03 14:45:19.130326	\N
181a925a-9997-4d2f-ba04-34005e4bf487	218f88bf-27a6-42b7-8772-0db15d46a017	70aaf8be-a74f-4d0b-8b5b-4bc7efcf4664	2026-02-03 14:45:19.130985	\N
8efc922f-b319-4a41-ab1a-2d0108cf6a1c	218f88bf-27a6-42b7-8772-0db15d46a017	21a977c1-048c-43c1-864e-2a14d31b6883	2026-02-03 14:45:19.131673	\N
f915ccb9-4a4b-4732-9470-0406365f82dc	218f88bf-27a6-42b7-8772-0db15d46a017	e978e477-3cd7-49d8-839f-9e3f8b096640	2026-02-03 14:45:19.132382	\N
4427529a-d22a-46b3-8f83-f13f9416bbb5	218f88bf-27a6-42b7-8772-0db15d46a017	0bfc0adf-60d7-4ec3-b55e-8a3e31ed175f	2026-02-03 14:45:19.133057	\N
606150d2-e2bb-4617-9fae-adb81f6e2e23	218f88bf-27a6-42b7-8772-0db15d46a017	3e1eb9a3-aaa6-43c0-82a9-9ef53cc6ebb4	2026-02-03 14:45:19.133687	\N
cc1dcbb5-9912-48bc-b470-e83bd2307af3	218f88bf-27a6-42b7-8772-0db15d46a017	86890494-4d08-419a-9f8d-d3e5cc80cd30	2026-02-03 14:45:19.134382	\N
a6aaac8e-1200-4970-a205-15c85f055819	218f88bf-27a6-42b7-8772-0db15d46a017	a1aa507f-ab10-47be-a428-57fe711e7478	2026-02-03 14:45:19.135062	\N
09c4e9ca-1e6e-43c8-840f-07d694e0fd0f	218f88bf-27a6-42b7-8772-0db15d46a017	3517dca4-cac5-4d82-959b-476ce61d96a6	2026-02-03 14:45:19.135685	\N
e507bb83-095d-4794-ba70-f298e0337fce	218f88bf-27a6-42b7-8772-0db15d46a017	7dd5f0cd-aca3-4533-9315-bbbe44b7b524	2026-02-03 14:45:19.136313	\N
0e644c0a-c847-4d80-9793-e205a7df7e93	218f88bf-27a6-42b7-8772-0db15d46a017	17ee546f-50ae-4746-b465-f055028ccc30	2026-02-03 14:45:19.136991	\N
1b15f002-b54c-4b26-9d92-28bee95cbc5f	218f88bf-27a6-42b7-8772-0db15d46a017	dc503339-3b5c-4413-bf5d-a58a2e4690b6	2026-02-03 14:45:19.13765	\N
b201ee34-f514-40f7-a501-49c27112aa4a	218f88bf-27a6-42b7-8772-0db15d46a017	cd74d56d-3a7e-49bf-be0a-7f5cb6a42741	2026-02-03 14:45:19.138299	\N
9600b0e6-0b3d-426e-995f-ecb0a7d307bc	218f88bf-27a6-42b7-8772-0db15d46a017	cc7d29db-8a35-460a-9478-00386776bfec	2026-02-03 14:45:19.138912	\N
a9baef08-3f7b-48b4-9d19-7f18c72a55a7	218f88bf-27a6-42b7-8772-0db15d46a017	86c5bbac-36a2-4dce-9e7d-1319f1a99b73	2026-02-03 14:45:19.139808	\N
a63ae1ed-7250-4394-87b0-dac95dc91cec	218f88bf-27a6-42b7-8772-0db15d46a017	aeb4c9e0-3d95-4596-a2d6-404c5986ac0b	2026-02-03 14:45:19.14041	\N
16a3fcb6-3d1f-4cb0-b64d-f1a1a9d84123	218f88bf-27a6-42b7-8772-0db15d46a017	697e68d3-982a-41ea-824c-e72053c58a39	2026-02-03 14:45:19.141038	\N
c7e48345-ce97-4394-8f50-16b63a125302	218f88bf-27a6-42b7-8772-0db15d46a017	85ea04f0-24ec-4397-bd98-514a2dc91bd0	2026-02-03 14:45:19.141625	\N
24b883cd-ca2e-4240-b43f-319455f492db	218f88bf-27a6-42b7-8772-0db15d46a017	f0918d28-62c4-422a-8eaf-283ec85059e3	2026-02-03 14:45:19.14236	\N
1d90b557-c9b6-43d5-8892-5f64c4303362	218f88bf-27a6-42b7-8772-0db15d46a017	8e59e8d1-80b1-435b-a940-0e31007f5ce0	2026-02-03 14:45:19.142975	\N
767475e8-9750-4610-b2c4-db26030c268f	218f88bf-27a6-42b7-8772-0db15d46a017	fc289f49-25db-45a7-bb51-e569ba2c57fe	2026-02-03 14:45:19.143614	\N
683b65b7-c35f-4e44-bed5-de84fcc3c94c	218f88bf-27a6-42b7-8772-0db15d46a017	bd9f7761-35d7-424c-9182-070f255287a2	2026-02-03 14:45:19.145729	\N
c8f5bca5-ed22-470d-bbf9-3685d9a6da8f	218f88bf-27a6-42b7-8772-0db15d46a017	b5a3a147-666a-41f3-ad45-25bb1efb4362	2026-02-03 14:45:19.146445	\N
63899a13-4a46-441b-b4e9-717d33e6dd3a	218f88bf-27a6-42b7-8772-0db15d46a017	c34d8d02-7b7b-4e9d-97a2-c77ad43ce624	2026-02-03 14:45:19.147098	\N
430ce1fa-4660-4caf-a8cb-3abb30169b46	218f88bf-27a6-42b7-8772-0db15d46a017	94dc6d1d-a7a1-442e-b3d6-db891cdfcf90	2026-02-03 14:45:19.14775	\N
22b439db-5315-4307-899c-78436f42ffc6	218f88bf-27a6-42b7-8772-0db15d46a017	4595eeed-0fb3-47ad-8c6d-a496d383e2f7	2026-02-03 14:45:19.1484	\N
b513ac24-65ef-42db-81bf-189ada1e5033	218f88bf-27a6-42b7-8772-0db15d46a017	416a18fb-8535-44b9-940a-1a84a6ff93bc	2026-02-03 14:45:19.149103	\N
10fb8cc5-01c9-4b94-9bd9-3e83cbf1d615	218f88bf-27a6-42b7-8772-0db15d46a017	516b3b4c-43b5-4350-932a-5ef3cc67f9a2	2026-02-03 14:45:19.149728	\N
3dd2c53c-a721-4698-ab89-0312eb4553cc	218f88bf-27a6-42b7-8772-0db15d46a017	105220ff-b57e-4376-a9da-41db3b262555	2026-02-03 14:45:19.15035	\N
35476012-d654-4895-8be1-ff0eb178640f	218f88bf-27a6-42b7-8772-0db15d46a017	636caad6-a8a1-4bcb-9be7-721ae52e721e	2026-02-03 14:45:19.151	\N
2d6ec71c-8206-4298-b235-39c7c080910d	218f88bf-27a6-42b7-8772-0db15d46a017	78eec845-c07c-4bfc-9ddc-4b807dbe0c2d	2026-02-03 14:45:19.151653	\N
3d9de359-6e6c-4270-a0c0-ac80b0930ae8	218f88bf-27a6-42b7-8772-0db15d46a017	84edff4b-5de4-4bca-a671-5624a7b47086	2026-02-03 14:45:19.152287	\N
b8d60870-091a-4a36-89cd-975607f9c81f	218f88bf-27a6-42b7-8772-0db15d46a017	ba1beb67-7fcf-4e71-8529-3c2c1c0544a0	2026-02-03 14:45:19.15294	\N
c5c051df-eef4-4dd7-8fa0-9f2e754cbabe	218f88bf-27a6-42b7-8772-0db15d46a017	49a82860-0131-4ef7-ac61-24ff11a57fb8	2026-02-03 14:45:19.153564	\N
87f79a57-ae60-432b-8216-93ef364d0985	218f88bf-27a6-42b7-8772-0db15d46a017	f8742ed8-39af-4fde-99e8-3b23d52d2f80	2026-02-03 14:45:19.154171	\N
051b8379-3612-41b5-bd0f-ddbd623a28b4	218f88bf-27a6-42b7-8772-0db15d46a017	6cd77085-878b-4c6f-9d14-9c23cb986e1b	2026-02-03 14:45:19.154792	\N
ebaf9efe-f464-4352-a3a1-8810a7aea3a4	218f88bf-27a6-42b7-8772-0db15d46a017	265f0647-6095-4cac-a7f1-728771875934	2026-02-03 14:45:19.155464	\N
7911d962-47c4-44fe-a648-81b7794fbdd0	218f88bf-27a6-42b7-8772-0db15d46a017	25913a03-657c-4d1b-a715-faf892714bc3	2026-02-03 14:45:19.156173	\N
fc212f5f-caea-406f-bd04-b417dbbb2eeb	218f88bf-27a6-42b7-8772-0db15d46a017	e3857a6d-8b6c-40da-bec9-a7cbbbad144c	2026-02-03 14:45:19.15681	\N
f0f82808-09e7-457b-8293-8fa0c0e9e60d	218f88bf-27a6-42b7-8772-0db15d46a017	20db3fb4-cdff-4b92-b187-7c1bed6116ed	2026-02-03 14:45:19.157459	\N
6173e18f-2525-471f-a9e0-c793f85ad190	218f88bf-27a6-42b7-8772-0db15d46a017	df1239d0-313b-4d64-a51b-4922dae5c0b9	2026-02-03 14:45:19.158075	\N
65ee8758-2a3c-427d-a27e-298912bf25a1	218f88bf-27a6-42b7-8772-0db15d46a017	e88b904d-8ee5-47b1-9cbb-aee132d166d5	2026-02-03 14:45:19.158691	\N
7dd15375-963b-43ff-a330-564756d4e8d3	218f88bf-27a6-42b7-8772-0db15d46a017	f373e7c6-7700-4ce6-af79-aa2f150c1c9f	2026-02-03 14:45:19.15931	\N
fd6ee0c7-054e-41bd-9102-c032f8392d8d	218f88bf-27a6-42b7-8772-0db15d46a017	ea4a59c5-ea17-4e6c-8b22-8a5c2c76a773	2026-02-03 14:45:19.159944	\N
e467ce1d-c3f9-4eec-bd3e-07bf6d373177	218f88bf-27a6-42b7-8772-0db15d46a017	508c3a32-bdfd-4def-b4ff-f85b294f86a5	2026-02-03 14:45:19.16057	\N
d848a7d5-eae4-4922-8d5f-c07796e733a3	218f88bf-27a6-42b7-8772-0db15d46a017	6997c7bb-4c6f-46b5-898b-b821f400ecdf	2026-02-03 14:45:19.161187	\N
f6e687ab-a683-48c5-90cc-f69a73c4f332	218f88bf-27a6-42b7-8772-0db15d46a017	b1e77341-401a-4649-a5c8-05fd2a35f32f	2026-02-03 14:45:19.161853	\N
83bbdd28-f666-408e-8256-a94131d9b7eb	218f88bf-27a6-42b7-8772-0db15d46a017	de4c67f6-f913-4793-bdf7-5c706d282919	2026-02-03 14:45:19.16251	\N
ac40e0b7-edec-4e64-af6a-696fd23f1b76	218f88bf-27a6-42b7-8772-0db15d46a017	17267672-8070-4479-95f9-62c8bfb4e6e0	2026-02-03 14:45:19.163134	\N
5589ac57-5ff1-4eff-9882-3787138d37cc	218f88bf-27a6-42b7-8772-0db15d46a017	1c10c6d2-7070-4c77-b3a7-5af54959247c	2026-02-03 14:45:19.163786	\N
d18b0c9d-8444-4d78-9e68-358118b9d970	218f88bf-27a6-42b7-8772-0db15d46a017	0323763a-1c12-4816-aaf4-35eed7bf05f5	2026-02-03 14:45:19.164429	\N
21be4d17-0ae6-4c8c-8660-fc58b77c804b	218f88bf-27a6-42b7-8772-0db15d46a017	e75076fa-919b-412e-8c6a-263f180ca714	2026-02-03 14:45:19.16507	\N
60a70b1b-2fe9-445c-860e-c33d2aa8aa6d	218f88bf-27a6-42b7-8772-0db15d46a017	f3a9be1a-0218-4cad-b132-1d17f87a6499	2026-02-03 14:45:19.165963	\N
9b0cdfd8-f12e-4c54-a45a-6748058f5325	218f88bf-27a6-42b7-8772-0db15d46a017	cf362a5e-fdc9-43cf-82e0-aab279d980d8	2026-02-03 14:45:19.166575	\N
194267a3-16c6-48bc-b018-0a5bad15d6c4	218f88bf-27a6-42b7-8772-0db15d46a017	f5390deb-b136-4454-9a5c-5ee9183ea602	2026-02-03 14:45:19.167206	\N
665cdffe-eee5-49ab-ba8f-72e70c97d37e	218f88bf-27a6-42b7-8772-0db15d46a017	466d7879-6e98-425e-a8af-cc047323d0e5	2026-02-03 14:45:19.167802	\N
3d890edb-f2cc-41a8-b7c5-d853467d4648	218f88bf-27a6-42b7-8772-0db15d46a017	d477ac3a-eddb-432e-87ee-26c143c93f33	2026-02-03 14:45:19.168424	\N
65493c94-255f-4a6f-9585-adf84626935e	218f88bf-27a6-42b7-8772-0db15d46a017	c296fb0a-6a45-4abf-8d1a-6efa4db334fd	2026-02-03 14:45:19.169044	\N
66767446-3192-45a5-99c9-5145861aa045	218f88bf-27a6-42b7-8772-0db15d46a017	9cf83373-05e0-4e8b-b95a-1a74c2c2dad5	2026-02-03 14:45:19.169695	\N
1bc96b65-a18d-4415-937c-49b744bc0c11	218f88bf-27a6-42b7-8772-0db15d46a017	6626a3e4-735e-46a2-bde3-93c1b6071c58	2026-02-03 14:45:19.170372	\N
b4082f12-f984-48c9-b6e8-b509961353a4	218f88bf-27a6-42b7-8772-0db15d46a017	5471ae12-eff7-4c13-9bd8-1e21fb3929bb	2026-02-03 14:45:19.171127	\N
b3a3bb38-31ff-4f9c-8ae6-279f04800d93	218f88bf-27a6-42b7-8772-0db15d46a017	eb3cafab-2cab-409f-8770-fa1268c8b4a1	2026-02-03 14:45:19.171797	\N
d152b255-1a22-4243-b7e9-8afd9b6e57aa	218f88bf-27a6-42b7-8772-0db15d46a017	1b46a252-5094-4a34-ad10-5e9cec483cee	2026-02-03 14:45:19.172539	\N
86412efb-a045-4954-98d0-7dbbfd428520	218f88bf-27a6-42b7-8772-0db15d46a017	e5f2f7dd-1dc6-4682-899e-cd7889da2325	2026-02-03 14:45:19.173207	\N
0ef1c551-c85c-4bad-aab7-f07c79eebd6d	218f88bf-27a6-42b7-8772-0db15d46a017	810f204f-62d1-418e-a273-bff88cb5b371	2026-02-03 14:45:19.17392	\N
89909a50-904d-47de-82a1-21616018dd58	218f88bf-27a6-42b7-8772-0db15d46a017	c3076e2e-4546-4a08-9141-42b6fbbce76a	2026-02-03 14:45:19.174626	\N
dbd639b9-19bb-4ffc-94a7-73dcd0ed4ea6	218f88bf-27a6-42b7-8772-0db15d46a017	1d9933d7-8e78-4f51-b559-0c4cb9db9e3c	2026-02-03 14:45:19.175282	\N
25707096-aa78-4973-9bdc-06235a365987	218f88bf-27a6-42b7-8772-0db15d46a017	23bbe2f5-8992-4588-934a-7569f90674dd	2026-02-03 14:45:19.175917	\N
d9c1e08c-4dad-4943-89c9-6bde631b1a19	218f88bf-27a6-42b7-8772-0db15d46a017	ccfbc324-3fb8-479a-b577-5bb420574cf5	2026-02-03 14:45:19.176522	\N
c10880af-1c05-4b5b-8aea-8540b594f218	218f88bf-27a6-42b7-8772-0db15d46a017	dcb198ee-60c0-4972-a63d-523f1623d930	2026-02-03 14:45:19.177141	\N
e763a814-546a-4bbf-a823-0ec474b329a5	218f88bf-27a6-42b7-8772-0db15d46a017	4a9d5080-6f4a-4922-bd69-004416b0e305	2026-02-03 14:45:19.177757	\N
17646d17-3d38-4016-a255-d70936ec34b2	218f88bf-27a6-42b7-8772-0db15d46a017	70231fbf-efd1-4532-a7c1-72e46da0e84a	2026-02-03 14:45:19.178406	\N
46c2bd83-ce01-499e-bd7d-0ba410c2c220	218f88bf-27a6-42b7-8772-0db15d46a017	5d80ef6d-344b-4bcf-a61e-572e1de8a382	2026-02-03 14:45:19.179066	\N
0f764dba-fd27-4476-87d5-1e5119d2f8a8	218f88bf-27a6-42b7-8772-0db15d46a017	466d7b6d-5353-46a7-a881-ef5347d03e6b	2026-02-03 14:45:19.179734	\N
fd61abaa-033f-4e9a-b833-7edb22f21072	218f88bf-27a6-42b7-8772-0db15d46a017	fb2e2c8e-3a47-4a84-bdcc-b7c27dcc97bf	2026-02-03 14:45:19.180335	\N
1fa12863-712a-4c92-8959-f97c2def91a7	218f88bf-27a6-42b7-8772-0db15d46a017	cd43100d-29bc-4815-bd3a-930a54a4fa16	2026-02-03 14:45:19.180937	\N
e737d794-5b51-493e-8196-48bd54890fd3	218f88bf-27a6-42b7-8772-0db15d46a017	5211db94-e2ae-4a94-b4e3-dbaef4ddda26	2026-02-03 14:45:19.181553	\N
e17903cc-eceb-4635-b7d5-828a846cf9ab	218f88bf-27a6-42b7-8772-0db15d46a017	35aff046-9c14-49fd-9ded-c3f7216698a8	2026-02-03 14:45:19.182373	\N
b04da5db-408e-4903-aa9b-93ba8274589a	218f88bf-27a6-42b7-8772-0db15d46a017	3c1cec99-3c13-4e36-9602-5d957124d074	2026-02-03 14:45:19.182941	\N
1a8ff13d-2e1d-4b92-b2ce-3a230817cd70	218f88bf-27a6-42b7-8772-0db15d46a017	fac05653-e6e9-46b6-9d3c-49c926028fd0	2026-02-03 14:45:19.184666	\N
1bc76bfb-c9cf-4f4b-862d-6ef37fba7f1f	218f88bf-27a6-42b7-8772-0db15d46a017	15e85bf8-2bcd-4e87-af1e-02d13d55c76e	2026-02-03 14:45:19.185379	\N
5747f43f-b796-469c-a73f-70d3845c91a0	218f88bf-27a6-42b7-8772-0db15d46a017	e0b53d49-c232-495c-9081-ea6c11d6ab84	2026-02-03 14:45:19.185978	\N
d326155a-59e9-43b1-a936-5d9ebfda1ea6	218f88bf-27a6-42b7-8772-0db15d46a017	591b6562-2cf9-4658-a6de-392caf8e0294	2026-02-03 14:45:19.187898	\N
7a27acee-4cd7-46fb-80f5-46f0bcf40b98	218f88bf-27a6-42b7-8772-0db15d46a017	4a0d66b7-55ad-4e1e-bc5a-279d897d6713	2026-02-03 14:45:19.188635	\N
90cd1197-625b-42a6-9d45-6ec75df3877f	218f88bf-27a6-42b7-8772-0db15d46a017	937c251f-5672-4c3c-bae3-847ade078b7f	2026-02-03 14:45:19.189286	\N
a676cf28-3b77-40dc-9c17-6ddf6d8fb339	218f88bf-27a6-42b7-8772-0db15d46a017	55594d4e-bb91-476b-941e-7ce9b474b8f9	2026-02-03 14:45:19.189934	\N
0e285310-a8cb-4d66-967e-30c651c63cb1	218f88bf-27a6-42b7-8772-0db15d46a017	12fca4f8-2e13-46db-9647-75938c450e99	2026-02-03 14:45:19.190622	\N
7e08359c-f058-4ca3-8f63-9520125ab7d4	218f88bf-27a6-42b7-8772-0db15d46a017	36a1ceb3-0adf-4f50-849f-3b173e9a88ed	2026-02-03 14:45:19.191232	\N
c2c7df3d-0ecb-410e-8117-7d6c6ba1c44c	218f88bf-27a6-42b7-8772-0db15d46a017	96a712a4-5daa-41ca-b528-366a8ebd2c90	2026-02-03 14:45:19.19185	\N
54f34c00-0402-419d-8a0a-b1236033573c	218f88bf-27a6-42b7-8772-0db15d46a017	7126ecec-c975-4ea8-8c81-4af68fe79820	2026-02-03 14:45:19.192452	\N
ecc94ef7-9d86-4f1d-ab72-fcc550c89bd1	218f88bf-27a6-42b7-8772-0db15d46a017	874f4c68-7c7a-4bbd-9e01-0e6496e3dfd0	2026-02-03 14:45:19.193096	\N
9f2c00b8-5246-4d97-9f34-dc8bcd4c424a	218f88bf-27a6-42b7-8772-0db15d46a017	d37c25f1-0b91-495b-903c-4565d9a0b873	2026-02-03 14:45:19.194021	\N
2ac99840-bcc5-4749-9a74-ccb85e8f09aa	218f88bf-27a6-42b7-8772-0db15d46a017	4a724086-fbb7-42cf-b28c-3ed55d8bf4f6	2026-02-03 14:45:19.19468	\N
62356293-7b9b-4cb5-b79f-c3f1a2cb84e6	218f88bf-27a6-42b7-8772-0db15d46a017	24ae2cbe-f111-4ca3-b75d-8d4fefda95a4	2026-02-03 14:45:19.195326	\N
b7ea3047-8c30-45d5-955c-23de5fafef99	218f88bf-27a6-42b7-8772-0db15d46a017	78e3e4b0-afa6-4e7f-b40f-6facc1b5bdf1	2026-02-03 14:45:19.195936	\N
1d2cb0fe-a38e-41db-ab48-141c62c1baa1	218f88bf-27a6-42b7-8772-0db15d46a017	72aa5173-dc0a-467d-b318-7755189ec582	2026-02-03 14:45:19.196552	\N
60d45220-b122-4248-9b6c-14debb33a6d6	218f88bf-27a6-42b7-8772-0db15d46a017	f2781db8-d4c4-48b3-ba5a-ce99a9a92e29	2026-02-03 14:45:19.19717	\N
9c7a3eb3-5e07-4ffa-b045-a8495a8fa2dd	218f88bf-27a6-42b7-8772-0db15d46a017	b60f3ef3-977b-4786-bb1d-343d6851946d	2026-02-03 14:45:19.197801	\N
e027ffb3-cfa8-4175-bb20-1072d962787d	218f88bf-27a6-42b7-8772-0db15d46a017	742e7de7-b30b-4c79-b3f2-ea6825db9f07	2026-02-03 14:45:19.198528	\N
97c71ce8-959a-48e4-8649-dba6964929a0	218f88bf-27a6-42b7-8772-0db15d46a017	142f0f7b-af8f-428e-abec-f889ea21bcef	2026-02-03 14:45:19.199193	\N
fb284b26-3280-42be-987e-bc8c02120cdb	218f88bf-27a6-42b7-8772-0db15d46a017	f8280683-e6fa-43f6-926d-cb94b6d1524e	2026-02-03 14:45:19.199794	\N
8f1e4fc6-9994-4861-ba9d-5f89f42e8334	218f88bf-27a6-42b7-8772-0db15d46a017	8fab6f5c-2eff-427f-a96a-3d48ccaeee71	2026-02-03 14:45:19.20044	\N
1ba86761-d7bf-4669-b2e7-7f6c82f6670a	218f88bf-27a6-42b7-8772-0db15d46a017	cf3ce676-b9d8-469a-a8c8-c5d0ecf7ce61	2026-02-03 14:45:19.201044	\N
9fdd3084-9432-47a4-9324-91ea25643018	218f88bf-27a6-42b7-8772-0db15d46a017	97b0bf39-7177-4205-bfeb-243aef139d87	2026-02-03 14:45:19.201708	\N
0864e222-d05c-488c-96f4-0cee8bb60db7	218f88bf-27a6-42b7-8772-0db15d46a017	d15abf58-be9d-4639-ae6a-4f7eabfff85e	2026-02-03 14:45:19.202355	\N
7ab9e632-36bc-4407-a01c-7e146f3f19e2	218f88bf-27a6-42b7-8772-0db15d46a017	6231902d-e598-42d2-a652-af137d67dd6f	2026-02-03 14:45:19.203005	\N
7d6ae76b-16d0-498e-a7bd-4b33bd332527	218f88bf-27a6-42b7-8772-0db15d46a017	bb1fe922-64f4-42e1-934b-8ecefccee2eb	2026-02-03 14:45:19.203648	\N
2d430b93-9c21-42d2-8d32-5570d9388959	218f88bf-27a6-42b7-8772-0db15d46a017	82160aa8-bbe9-4136-bdc6-14a28baee5a2	2026-02-03 14:45:19.2043	\N
fa3337be-160a-47da-b908-0d75378504bd	218f88bf-27a6-42b7-8772-0db15d46a017	8672cf30-70cd-48b3-9322-56e680fa3533	2026-02-03 14:45:19.204929	\N
27ea77ba-d741-4bdd-9acb-b9fb567d8ed7	218f88bf-27a6-42b7-8772-0db15d46a017	8837d8a7-9e04-4fdd-b7da-30dd20bbf485	2026-02-03 14:45:19.20557	\N
c9cd7198-32da-454d-be6e-d2d3c6fa59f9	218f88bf-27a6-42b7-8772-0db15d46a017	6112b179-bfcb-4106-9d51-5efbaf8f5b11	2026-02-03 14:45:19.206177	\N
3cefae31-778b-403c-a680-9f6d023efce2	218f88bf-27a6-42b7-8772-0db15d46a017	e6696c94-02e8-4a41-b9e9-6f0b6e449ade	2026-02-03 14:45:19.206795	\N
121b3858-9f5e-45a8-8b8c-e91a5a6dd769	218f88bf-27a6-42b7-8772-0db15d46a017	743da16a-aa4c-4747-8ea9-e23cdfa6ee79	2026-02-03 14:45:19.207403	\N
7ee9abbd-b5c4-4f8c-8945-c1feea06f4d1	218f88bf-27a6-42b7-8772-0db15d46a017	263a2ffa-ad80-4b8d-9f7e-112c7e2d0070	2026-02-03 14:45:19.208042	\N
140fd8a9-2cce-4065-9b2b-a61f297a8abf	218f88bf-27a6-42b7-8772-0db15d46a017	f97ebbc3-cf59-475b-add1-4c897200f83c	2026-02-03 14:45:19.20865	\N
8fc8fba2-7693-40bf-94d3-6bcbabd5a185	218f88bf-27a6-42b7-8772-0db15d46a017	1ea78a56-ccee-4e59-ba46-313efe19695d	2026-02-03 14:45:19.209244	\N
4f89447b-d06e-4aac-9e79-041284eb94c4	218f88bf-27a6-42b7-8772-0db15d46a017	fafc0479-cbbd-402c-b406-25407ad47cb0	2026-02-03 14:45:19.20986	\N
59bb3bc9-ef71-48d0-9a4b-030d7d0267cd	218f88bf-27a6-42b7-8772-0db15d46a017	5c5413cd-c31d-4d9e-bfc1-b5148d1b0030	2026-02-03 14:45:19.210503	\N
1f664cc5-37da-4290-92b4-8b1803916b01	218f88bf-27a6-42b7-8772-0db15d46a017	f26004ec-72ac-45c6-83b5-a97a147a3346	2026-02-03 14:45:19.211138	\N
6e5b47a1-ee4b-4137-aed6-f83ca0f90b73	218f88bf-27a6-42b7-8772-0db15d46a017	aedae31d-3bb9-4855-b051-1e31f07586fe	2026-02-03 14:45:19.211737	\N
fddf072d-c451-47ee-83d9-58c7ef9af233	218f88bf-27a6-42b7-8772-0db15d46a017	d76540ff-933f-4fd0-8240-e8d8536a83a2	2026-02-03 14:45:19.21233	\N
4168b912-8022-4eb1-ab7f-5135a037272c	218f88bf-27a6-42b7-8772-0db15d46a017	6d0e2038-4f8d-41d0-9367-0bdeb1f6561b	2026-02-03 14:45:19.212949	\N
043b0af1-75e5-4a5d-8907-d83664884ca9	218f88bf-27a6-42b7-8772-0db15d46a017	2e5c4900-3258-41c5-8407-e310f8378ad4	2026-02-03 14:45:19.213591	\N
ef3e6c66-81bd-4c98-bb0c-eaa0096f2f02	218f88bf-27a6-42b7-8772-0db15d46a017	41598edc-5368-4ff1-954c-4ee0904d050f	2026-02-03 14:45:19.214214	\N
7a9bc40c-2200-40b6-b67d-866347ef0ace	218f88bf-27a6-42b7-8772-0db15d46a017	e54a43a9-e9d9-410c-b7fa-01c6a1661943	2026-02-03 14:45:19.214818	\N
706e6cce-7883-488a-bbdf-a1b500a62fd6	218f88bf-27a6-42b7-8772-0db15d46a017	7302ee6b-ab3d-418b-8987-0567acf924de	2026-02-03 14:45:19.215485	\N
c153f80f-01dc-4d34-8c4f-977032df2068	218f88bf-27a6-42b7-8772-0db15d46a017	f4e21b26-397f-4fc9-84da-696bd62260d4	2026-02-03 14:45:19.216215	\N
b358461d-1644-4930-b703-3332db3d4c79	218f88bf-27a6-42b7-8772-0db15d46a017	667f47f4-4970-4afa-84cf-bccba299379c	2026-02-03 14:45:19.216862	\N
2ad5c5cc-c3cb-433a-9641-364be745ee24	218f88bf-27a6-42b7-8772-0db15d46a017	5740f4ee-76bb-4f3c-8631-0c1dcaa41dd5	2026-02-03 14:45:19.217505	\N
c822b4cb-db0e-4338-8455-e5da6adf993c	218f88bf-27a6-42b7-8772-0db15d46a017	bae01ca7-4017-46e9-a80d-9e91ae75b3c5	2026-02-03 14:45:19.218376	\N
fa56b0a4-fa12-4a72-8bab-2e1b3ceef534	218f88bf-27a6-42b7-8772-0db15d46a017	eb921b24-0097-43fe-8deb-037908cf311e	2026-02-03 14:45:19.21898	\N
d8522631-5d22-42b7-adb8-bbb7045381ca	218f88bf-27a6-42b7-8772-0db15d46a017	ca676f48-26ac-48c9-a8c7-3b18f296f90a	2026-02-03 14:45:19.219502	\N
14304ff7-6cb8-498c-b0f3-79b92fabac4e	218f88bf-27a6-42b7-8772-0db15d46a017	5d55f5bd-a7e8-4565-bc82-61ea25737ae0	2026-02-03 14:45:19.219982	\N
10bdcab3-6381-4a57-9c8f-4f9988396c32	218f88bf-27a6-42b7-8772-0db15d46a017	5b5c21f5-7d09-45bc-9fb9-1ae1517a9100	2026-02-03 14:45:19.22045	\N
51ca6304-8ee8-4be3-99ce-2237aad89c7b	218f88bf-27a6-42b7-8772-0db15d46a017	d075b215-da4f-43cd-bd9e-c8c0d62827e0	2026-02-03 14:45:19.220906	\N
33983ed8-d8d1-46ad-acb6-d679d0f626da	218f88bf-27a6-42b7-8772-0db15d46a017	831cb2a3-4ed6-4bfc-8d7b-75fd2740dcc4	2026-02-03 14:45:19.221429	\N
b9eb6c65-51a7-46a1-b8d0-8e4cf99003b1	218f88bf-27a6-42b7-8772-0db15d46a017	3db032d1-22ce-406a-80ce-f3faf1f2b58e	2026-02-03 14:45:19.221887	\N
74fbe19d-8d86-4c45-8750-58a4f7f35339	218f88bf-27a6-42b7-8772-0db15d46a017	cd22eaea-1bbb-4a41-98f0-c7cdb5a8af9f	2026-02-03 14:45:19.222404	\N
f2cac58a-fe19-44ef-9ab2-4157ed50cec0	218f88bf-27a6-42b7-8772-0db15d46a017	7526c6e5-bdbe-4c91-a7ae-c0aae76e4b02	2026-02-03 14:45:19.22287	\N
6daab3d9-19be-4e1b-a29b-846b69db12fc	ceb64e66-ab69-4077-a2fb-76487aa59029	0fc03786-d0dc-4954-b248-5cd8f5bef8a3	2026-02-03 14:45:19.223638	\N
643a94f3-3dc8-4b73-888c-3725440640bc	ceb64e66-ab69-4077-a2fb-76487aa59029	b0b34dd7-8aa8-4fa8-8212-fc234e52d2fe	2026-02-03 14:45:19.224437	\N
59ed5019-7681-4542-9815-c4446abbb2d3	ceb64e66-ab69-4077-a2fb-76487aa59029	70aaf8be-a74f-4d0b-8b5b-4bc7efcf4664	2026-02-03 14:45:19.225155	\N
9311182a-eaba-4af0-a215-bdb640aea9a0	ceb64e66-ab69-4077-a2fb-76487aa59029	21a977c1-048c-43c1-864e-2a14d31b6883	2026-02-03 14:45:19.225907	\N
ebbb9742-0ec3-4ee8-af54-419c4c005ebb	ceb64e66-ab69-4077-a2fb-76487aa59029	f8742ed8-39af-4fde-99e8-3b23d52d2f80	2026-02-03 14:45:19.226725	\N
99bf067b-dd91-4ab9-b958-2de47b27926a	ceb64e66-ab69-4077-a2fb-76487aa59029	265f0647-6095-4cac-a7f1-728771875934	2026-02-03 14:45:19.227544	\N
b62e02cb-7d39-434a-9b03-ff28326ec239	ceb64e66-ab69-4077-a2fb-76487aa59029	20db3fb4-cdff-4b92-b187-7c1bed6116ed	2026-02-03 14:45:19.228373	\N
3ba0b511-3a79-48f0-a4c1-816ce2d077aa	ceb64e66-ab69-4077-a2fb-76487aa59029	e88b904d-8ee5-47b1-9cbb-aee132d166d5	2026-02-03 14:45:19.231018	\N
8f2d2472-97b2-413b-af9b-e1e786f7d40b	ceb64e66-ab69-4077-a2fb-76487aa59029	c3076e2e-4546-4a08-9141-42b6fbbce76a	2026-02-03 14:45:19.231873	\N
1ce26349-a028-4ee2-b3ba-c5f11ad1028d	ceb64e66-ab69-4077-a2fb-76487aa59029	1d9933d7-8e78-4f51-b559-0c4cb9db9e3c	2026-02-03 14:45:19.232742	\N
d4008c1f-e303-498f-a2e5-fc6b626112b5	ceb64e66-ab69-4077-a2fb-76487aa59029	23bbe2f5-8992-4588-934a-7569f90674dd	2026-02-03 14:45:19.233593	\N
b87bc792-be44-4372-b981-76abc88b91c3	ceb64e66-ab69-4077-a2fb-76487aa59029	ccfbc324-3fb8-479a-b577-5bb420574cf5	2026-02-03 14:45:19.234431	\N
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, description, status, created_at, updated_at, deleted_at) FROM stdin;
218f88bf-27a6-42b7-8772-0db15d46a017	ADMIN	Administrador del sistema	t	2026-02-03 14:45:19.107519	2026-02-03 14:45:19.107519	\N
ceb64e66-ab69-4077-a2fb-76487aa59029	SELLER	Vendedor	t	2026-02-03 14:45:19.108796	2026-02-03 14:45:19.108796	\N
\.


--
-- Data for Name: taxes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.taxes (id, code, name, value, type, is_active, created_at, updated_at, deleted_at) FROM stdin;
f594329d-cbc1-4973-ab0f-dde8652824b2	IVA	Impuesto al Valor Agregado	16.00	PERCENTAGE	t	2026-02-03 14:45:18.796267	2026-02-03 14:45:18.796267	\N
eb72d042-b11b-478e-99a2-ee29da0ea3a4	IVA-0	IVA Tasa 0%	0.00	PERCENTAGE	t	2026-02-03 14:45:18.798528	2026-02-03 14:45:18.798528	\N
7020033e-e0e7-4f3c-b390-4aebfdf7d304	IVA-8	IVA Tasa 8%	8.00	PERCENTAGE	t	2026-02-03 14:45:18.800072	2026-02-03 14:45:18.800072	\N
3599fda7-4793-4430-930a-7104d0dc009c	ISR	Impuesto Sobre la Renta	30.00	PERCENTAGE	t	2026-02-03 14:45:18.801558	2026-02-03 14:45:18.801558	\N
39982868-815c-483a-85d1-588ddc37c64b	IEPS	Impuesto Especial sobre Producción y Servicios	8.00	PERCENTAGE	t	2026-02-03 14:45:18.803063	2026-02-03 14:45:18.803063	\N
a2296fd6-f2df-4ae0-a5ea-623eaf6372d4	ISH	Impuesto Sobre Hospedaje	3.00	PERCENTAGE	t	2026-02-03 14:45:18.804572	2026-02-03 14:45:18.804572	\N
ccfc183c-a3a8-4cca-8937-19ed7fdea016	IEPS-TABACO	IEPS Tabaco	160.00	FIXED	t	2026-02-03 14:45:18.806186	2026-02-03 14:45:18.806186	\N
8cfb2c1c-a330-499d-a722-53b24bc567bf	IEPS-BEBIDAS	IEPS Bebidas Alcohólicas	26.50	PERCENTAGE	t	2026-02-03 14:45:18.807377	2026-02-03 14:45:18.807377	\N
31ce8274-66a2-45fa-a2ff-61a6d23cf5e0	IEPS-GASOLINA	IEPS Gasolina	4.00	PERCENTAGE	t	2026-02-03 14:45:18.808797	2026-02-03 14:45:18.808797	\N
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id) FROM stdin;
d1ad6e65-4b5d-4dd0-aa04-c189d02b9394	218f88bf-27a6-42b7-8772-0db15d46a017
b1590666-1c91-4e28-94aa-30e964f5dc83	ceb64e66-ab69-4077-a2fb-76487aa59029
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, status, created_at, updated_at, deleted_at) FROM stdin;
d1ad6e65-4b5d-4dd0-aa04-c189d02b9394	Administrador	admin@redfox.com	$2b$10$0AmQspt7af/pm6nLm4nCJucgrtFJ2K63ahg38i30ee83lDdmvqnmS	t	2026-02-03 14:45:19.371216	2026-02-03 14:45:19.371216	\N
b1590666-1c91-4e28-94aa-30e964f5dc83	Vendedor	vendedor@redfox.com	$2b$10$LbJzRAqjb233rfX5NBB3mOAEjzLd0.Vcumgf/5tIVhiWH1fFhjyAy	t	2026-02-03 14:45:19.373842	2026-02-03 14:45:19.373842	\N
\.


--
-- Data for Name: warehouse_adjustment_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_adjustment_details (id, warehouse_adjustment_id, product_id, quantity, price, created_at, updated_at, deleted_at) FROM stdin;
67b39aa6-dcea-42f5-bc11-b703518b8ef2	422d0f2c-8ccd-45f6-9183-479ab6913049	602c4404-4a52-4ef4-a330-08df735d46a8	2.00	24.00	2026-02-03 14:45:19.37895	2026-02-03 14:45:19.37895	\N
b3b0cc27-fa0a-4277-a0aa-02ae100d5162	422d0f2c-8ccd-45f6-9183-479ab6913049	549cb952-a216-4fdd-b9f9-828025b077eb	4.00	80.00	2026-02-03 14:45:19.37895	2026-02-03 14:45:19.37895	\N
7b162c7e-eb67-4b96-8b59-2fea3dc606f8	422d0f2c-8ccd-45f6-9183-479ab6913049	fe01242d-8ee3-4d94-8ac6-b17abf50fe10	4.00	53.00	2026-02-03 14:45:19.37895	2026-02-03 14:45:19.37895	\N
bd6310da-f163-4241-a64f-c3e8097856f9	d70468e9-50d4-418d-8715-1b632a769039	602c4404-4a52-4ef4-a330-08df735d46a8	10.00	55.00	2026-02-03 14:45:19.381447	2026-02-03 14:45:19.381447	\N
4f6ff39b-1e9d-414f-8d37-feb4622703b1	d70468e9-50d4-418d-8715-1b632a769039	549cb952-a216-4fdd-b9f9-828025b077eb	8.00	61.00	2026-02-03 14:45:19.381447	2026-02-03 14:45:19.381447	\N
6768b4db-f1c4-4660-9820-0e972d3e0f67	d70468e9-50d4-418d-8715-1b632a769039	fe01242d-8ee3-4d94-8ac6-b17abf50fe10	3.00	67.00	2026-02-03 14:45:19.381447	2026-02-03 14:45:19.381447	\N
\.


--
-- Data for Name: warehouse_adjustments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_adjustments (id, code, source_warehouse_id, target_warehouse_id, date, description, status, created_at, updated_at, deleted_at) FROM stdin;
422d0f2c-8ccd-45f6-9183-479ab6913049	AJU202412010001	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	b9a5f13a-8f9b-43ae-80d3-f6a8c316b43c	2024-11-30	Ajuste de inventario entre almacenes - Transferencia mensual	t	2026-02-03 14:45:19.377723	2026-02-03 14:45:19.377723	\N
d70468e9-50d4-418d-8715-1b632a769039	AJU202412020001	b9a5f13a-8f9b-43ae-80d3-f6a8c316b43c	43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	2024-12-01	Devolución de productos al almacén central	t	2026-02-03 14:45:19.380709	2026-02-03 14:45:19.380709	\N
\.


--
-- Data for Name: warehouse_openings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouse_openings (id, warehouse_id, product_id, quantity, price, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.warehouses (id, code, name, address, phone, status, is_open, currency_id, created_at, updated_at, deleted_at) FROM stdin;
43c2f7cf-471c-4f19-a2ad-a8db78f9f02e	ALM-CENTRAL	Almacén Central	Av. Principal 123, Ciudad Industrial	555-0001	t	t	5de993a6-a868-4e3a-aab9-8b07e756d85e	2026-02-03 14:45:18.917988	2026-02-03 14:45:18.917988	\N
b9a5f13a-8f9b-43ae-80d3-f6a8c316b43c	ALM-NORTE	Almacén Norte	Calle Norte 456, Zona Industrial Norte	555-0002	t	t	5de993a6-a868-4e3a-aab9-8b07e756d85e	2026-02-03 14:45:18.920184	2026-02-03 14:45:18.920184	\N
28cc2f63-c272-4161-bbfa-97d65bac2674	ALM-SUR	Almacén Sur	Av. Sur 789, Parque Industrial Sur	555-0003	t	t	5de993a6-a868-4e3a-aab9-8b07e756d85e	2026-02-03 14:45:18.921829	2026-02-03 14:45:18.921829	\N
\.


--
-- Data for Name: withdrawal_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawal_details (id, withdrawal_id, warehouse_id, product_id, quantity, price, created_at, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: withdrawals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawals (id, code, destination, client_id, amount, type, cash_transaction_id, status, pack_receipt_id, pack_receipt_response, created_at, updated_at, deleted_at, invoice_id) FROM stdin;
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 34, true);


--
-- Name: company_settings PK_036b4634217db79c17305442dbe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT "PK_036b4634217db79c17305442dbe" PRIMARY KEY (id);


--
-- Name: reception_details PK_04c38df855af1c4d23195837128; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reception_details
    ADD CONSTRAINT "PK_04c38df855af1c4d23195837128" PRIMARY KEY (id);


--
-- Name: purchase_orders PK_05148947415204a897e8beb2553; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "PK_05148947415204a897e8beb2553" PRIMARY KEY (id);


--
-- Name: products PK_0806c755e0aca124e67c0cf6d7d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY (id);


--
-- Name: warehouse_openings PK_22ef1edeb2eefdb44ec0ab603cc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_openings
    ADD CONSTRAINT "PK_22ef1edeb2eefdb44ec0ab603cc" PRIMARY KEY (id);


--
-- Name: product_history PK_235f5de8f3f653973711bc77b16; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_history
    ADD CONSTRAINT "PK_235f5de8f3f653973711bc77b16" PRIMARY KEY (id);


--
-- Name: user_roles PK_23ed6f04fe43066df08379fd034; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY (user_id, role_id);


--
-- Name: return_details PK_2482b7c49d910d766a12e6519d5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_details
    ADD CONSTRAINT "PK_2482b7c49d910d766a12e6519d5" PRIMARY KEY (id);


--
-- Name: categories PK_24dbc6126a28ff948da33e97d3b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY (id);


--
-- Name: backup_configs PK_25d918dbd367dcb0831412b7b85; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_configs
    ADD CONSTRAINT "PK_25d918dbd367dcb0831412b7b85" PRIMARY KEY (id);


--
-- Name: returns PK_27a2f1895a71519ebfec7850361; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT "PK_27a2f1895a71519ebfec7850361" PRIMARY KEY (id);


--
-- Name: warehouse_adjustment_details PK_3240af8041d7d45d2b09a5284d6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustment_details
    ADD CONSTRAINT "PK_3240af8041d7d45d2b09a5284d6" PRIMARY KEY (id);


--
-- Name: warehouse_adjustments PK_346e0d6af36daec991a09f7def8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustments
    ADD CONSTRAINT "PK_346e0d6af36daec991a09f7def8" PRIMARY KEY (id);


--
-- Name: invoice_details PK_3b7f561bae12fac5d2d0df9682b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_details
    ADD CONSTRAINT "PK_3b7f561bae12fac5d2d0df9682b" PRIMARY KEY (id);


--
-- Name: warehouses PK_56ae21ee2432b2270b48867e4be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY (id);


--
-- Name: languages PK_5e1f08ea973ed265b699ece2597; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT "PK_5e1f08ea973ed265b699ece2597" PRIMARY KEY (id, user_id);


--
-- Name: invoices PK_668cef7c22a427fd822cc1be3ce; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY (id);


--
-- Name: taxes PK_6c58c9cbb420c4f65e3f5eb8162; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes
    ADD CONSTRAINT "PK_6c58c9cbb420c4f65e3f5eb8162" PRIMARY KEY (id);


--
-- Name: purchase_order_details PK_746976383d1137c9c546206b16e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_details
    ADD CONSTRAINT "PK_746976383d1137c9c546206b16e" PRIMARY KEY (id);


--
-- Name: receptions PK_79571c06adcaae247f61366a240; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptions
    ADD CONSTRAINT "PK_79571c06adcaae247f61366a240" PRIMARY KEY (id);


--
-- Name: inventory PK_82aa5da437c5bbfb80703b08309; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "PK_82aa5da437c5bbfb80703b08309" PRIMARY KEY (id);


--
-- Name: role_permissions PK_84059017c90bfcb701b8fa42297; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: withdrawals PK_9871ec481baa7755f8bd8b7c7e9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "PK_9871ec481baa7755f8bd8b7c7e9" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: providers PK_af13fc2ebf382fe0dad2e4793aa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT "PK_af13fc2ebf382fe0dad2e4793aa" PRIMARY KEY (id);


--
-- Name: brands PK_b0c437120b624da1034a81fc561; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: cash_registers PK_c1cc711056395d079d8f041ce34; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT "PK_c1cc711056395d079d8f041ce34" PRIMARY KEY (id);


--
-- Name: measurement_units PK_c2442ce42194b3e63b4f502ad40; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measurement_units
    ADD CONSTRAINT "PK_c2442ce42194b3e63b4f502ad40" PRIMARY KEY (id);


--
-- Name: currencies PK_d528c54860c4182db13548e08c4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT "PK_d528c54860c4182db13548e08c4" PRIMARY KEY (id);


--
-- Name: withdrawal_details PK_df660e220f05e0bbb8cd78b5733; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_details
    ADD CONSTRAINT "PK_df660e220f05e0bbb8cd78b5733" PRIMARY KEY (id);


--
-- Name: cash_transactions PK_df7299c9dda9bf4b78d874e588e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "PK_df7299c9dda9bf4b78d874e588e" PRIMARY KEY (id);


--
-- Name: certification_packs PK_e470c3390246649970248de1bd0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.certification_packs
    ADD CONSTRAINT "PK_e470c3390246649970248de1bd0" PRIMARY KEY (id);


--
-- Name: backup_logs PK_e4a327a96ae7cff4eae6db70fa5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backup_logs
    ADD CONSTRAINT "PK_e4a327a96ae7cff4eae6db70fa5" PRIMARY KEY (id);


--
-- Name: clients PK_f1ab7cf3a5714dbc6bb4e1c28a4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY (id);


--
-- Name: brands UQ_1687d82f42d8b3f8162a29e7df4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT "UQ_1687d82f42d8b3f8162a29e7df4" UNIQUE (code);


--
-- Name: categories UQ_420d9f679d41281f282f5bc7d09; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE (slug);


--
-- Name: products UQ_464f927ae360106b783ed0b4106; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_464f927ae360106b783ed0b4106" UNIQUE (slug);


--
-- Name: taxes UQ_4c10fc08415d16b82692a0248aa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taxes
    ADD CONSTRAINT "UQ_4c10fc08415d16b82692a0248aa" UNIQUE (code);


--
-- Name: clients UQ_5b84bb456aa7fc9241c5d8277d0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "UQ_5b84bb456aa7fc9241c5d8277d0" UNIQUE (code);


--
-- Name: languages UQ_7397752718d1c9eb873722ec9b2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT "UQ_7397752718d1c9eb873722ec9b2" UNIQUE (code);


--
-- Name: receptions UQ_78ff76ba86c8d4a15438753a2fe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptions
    ADD CONSTRAINT "UQ_78ff76ba86c8d4a15438753a2fe" UNIQUE (code);


--
-- Name: warehouse_adjustments UQ_8976bdca8361e69a97605eae817; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustments
    ADD CONSTRAINT "UQ_8976bdca8361e69a97605eae817" UNIQUE (code);


--
-- Name: permissions UQ_8dad765629e83229da6feda1c1d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "UQ_8dad765629e83229da6feda1c1d" UNIQUE (code);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: currencies UQ_9f8d0972aeeb5a2277e40332d29; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT "UQ_9f8d0972aeeb5a2277e40332d29" UNIQUE (code);


--
-- Name: products UQ_adfc522baf9d9b19cd7d9461b7e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_adfc522baf9d9b19cd7d9461b7e" UNIQUE (barcode);


--
-- Name: products UQ_c44ac33a05b144dd0d9ddcf9327; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "UQ_c44ac33a05b144dd0d9ddcf9327" UNIQUE (sku);


--
-- Name: providers UQ_cdc1db37b0ed3c1c6bc8c1f0458; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.providers
    ADD CONSTRAINT "UQ_cdc1db37b0ed3c1c6bc8c1f0458" UNIQUE (code);


--
-- Name: returns UQ_cdce95459ae438f56febacae69c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT "UQ_cdce95459ae438f56febacae69c" UNIQUE (code);


--
-- Name: warehouses UQ_d8b96d60ff9a288f5ed862280d9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "UQ_d8b96d60ff9a288f5ed862280d9" UNIQUE (code);


--
-- Name: invoices UQ_e38e380c25aacf8cd59d6ae21fe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "UQ_e38e380c25aacf8cd59d6ae21fe" UNIQUE (code);


--
-- Name: withdrawals UQ_e56553c748a7d269fdde9caffaf; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "UQ_e56553c748a7d269fdde9caffaf" UNIQUE (code);


--
-- Name: roles UQ_f6d54f95c31b73fb1bdd8e91d0c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "UQ_f6d54f95c31b73fb1bdd8e91d0c" UNIQUE (code);


--
-- Name: purchase_orders UQ_f96c29600a09115dd4f136ab41a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "UQ_f96c29600a09115dd4f136ab41a" UNIQUE (code);


--
-- Name: cash_registers UQ_fbab2575efcca8d74eac7fea3eb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_registers
    ADD CONSTRAINT "UQ_fbab2575efcca8d74eac7fea3eb" UNIQUE (code);


--
-- Name: IDX_role_permissions_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_role_permissions_unique" ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: idx_cash_registers_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_registers_created_at ON public.cash_registers USING btree (created_at);


--
-- Name: idx_cash_registers_opened_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_registers_opened_by ON public.cash_registers USING btree (opened_by);


--
-- Name: idx_cash_registers_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_registers_status ON public.cash_registers USING btree (status);


--
-- Name: idx_cash_transactions_cash_register_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_cash_register_id ON public.cash_transactions USING btree (cash_register_id);


--
-- Name: idx_cash_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_created_at ON public.cash_transactions USING btree (created_at);


--
-- Name: idx_cash_transactions_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_created_by ON public.cash_transactions USING btree (created_by);


--
-- Name: idx_cash_transactions_payment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_payment_method ON public.cash_transactions USING btree (payment_method);


--
-- Name: idx_cash_transactions_sale_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_sale_id ON public.cash_transactions USING btree (sale_id);


--
-- Name: idx_cash_transactions_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cash_transactions_type ON public.cash_transactions USING btree (type);


--
-- Name: idx_invoice_details_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_details_invoice_id ON public.invoice_details USING btree (invoice_id);


--
-- Name: idx_invoice_details_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_details_product_id ON public.invoice_details USING btree (product_id);


--
-- Name: idx_invoices_cfdi_uuid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_cfdi_uuid ON public.invoices USING btree (cfdi_uuid);


--
-- Name: idx_invoices_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);


--
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_date ON public.invoices USING btree (date);


--
-- Name: idx_invoices_pack_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_pack_invoice_id ON public.invoices USING btree (pack_invoice_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_invoices_withdrawal_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_withdrawal_id ON public.invoices USING btree (withdrawal_id);


--
-- Name: purchase_order_details FK_08f0d16ed60b199a4973097255d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_details
    ADD CONSTRAINT "FK_08f0d16ed60b199a4973097255d" FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: warehouse_adjustments FK_1731f17813616a6605b7a6eff19; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustments
    ADD CONSTRAINT "FK_1731f17813616a6605b7a6eff19" FOREIGN KEY (target_warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: withdrawal_details FK_24e857c2e02804d281410b969fb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_details
    ADD CONSTRAINT "FK_24e857c2e02804d281410b969fb" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoice_details FK_2da75e038c5b463f19965b4c739; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_details
    ADD CONSTRAINT "FK_2da75e038c5b463f19965b4c739" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: return_details FK_4062bf48934321de96ffe3829aa; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_details
    ADD CONSTRAINT "FK_4062bf48934321de96ffe3829aa" FOREIGN KEY (return_id) REFERENCES public.returns(id) ON DELETE CASCADE;


--
-- Name: invoices FK_4bcb7f217f3293baed83f00fb28; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_4bcb7f217f3293baed83f00fb28" FOREIGN KEY (withdrawal_id) REFERENCES public.withdrawals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: warehouse_adjustment_details FK_4dda35c85f8731e5f737b82e97a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustment_details
    ADD CONSTRAINT "FK_4dda35c85f8731e5f737b82e97a" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: reception_details FK_53390243ac7282841b7339048ea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reception_details
    ADD CONSTRAINT "FK_53390243ac7282841b7339048ea" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices FK_5534ba11e10f1a9953cbdaabf16; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT "FK_5534ba11e10f1a9953cbdaabf16" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: withdrawal_details FK_587a44e27e0431c64ebb3345b63; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_details
    ADD CONSTRAINT "FK_587a44e27e0431c64ebb3345b63" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory FK_5d9d73a4c5fe0202714a51e4649; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_5d9d73a4c5fe0202714a51e4649" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: withdrawals FK_6a349054e1be01fa9bc03652d93; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "FK_6a349054e1be01fa9bc03652d93" FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: inventory FK_732fdb1f76432d65d2c136340dc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT "FK_732fdb1f76432d65d2c136340dc" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: purchase_orders FK_74e4ce03ba3f8bc13de20fc594e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "FK_74e4ce03ba3f8bc13de20fc594e" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: cash_transactions FK_759b32631b41fb7ae046644ce06; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "FK_759b32631b41fb7ae046644ce06" FOREIGN KEY (cash_register_id) REFERENCES public.cash_registers(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reception_details FK_79b90c70b7b16ba1fa67e774c20; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reception_details
    ADD CONSTRAINT "FK_79b90c70b7b16ba1fa67e774c20" FOREIGN KEY (reception_id) REFERENCES public.receptions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cash_transactions FK_7a580139d5031ae18b78cbc46e3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "FK_7a580139d5031ae18b78cbc46e3" FOREIGN KEY (created_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles FK_87b8888186ca9769c960e926870; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories FK_88cea2dc9c31951d06437879b40; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: invoice_details FK_96a7c6c9ac9c2b51a11598ea897; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_details
    ADD CONSTRAINT "FK_96a7c6c9ac9c2b51a11598ea897" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: return_details FK_97b35e6253f38dcccd74b2916f3; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_details
    ADD CONSTRAINT "FK_97b35e6253f38dcccd74b2916f3" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: product_history FK_9890aedd09f85cb4317782648d5; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_history
    ADD CONSTRAINT "FK_9890aedd09f85cb4317782648d5" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cash_transactions FK_9dc127482caf61bba6651c4bdf1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cash_transactions
    ADD CONSTRAINT "FK_9dc127482caf61bba6651c4bdf1" FOREIGN KEY (sale_id) REFERENCES public.withdrawals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: products FK_Measurement_Unit; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_Measurement_Unit" FOREIGN KEY (measurement_unit_id) REFERENCES public.measurement_units(id) ON DELETE SET NULL;


--
-- Name: products FK_Products_Brands; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_Products_Brands" FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: products FK_Products_Categories; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_Products_Categories" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: products FK_Products_Taxes; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT "FK_Products_Taxes" FOREIGN KEY (tax_id) REFERENCES public.taxes(id) ON DELETE SET NULL;


--
-- Name: warehouse_openings FK_WarehouseOpenings_Products; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_openings
    ADD CONSTRAINT "FK_WarehouseOpenings_Products" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: warehouse_openings FK_WarehouseOpenings_Warehouses; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_openings
    ADD CONSTRAINT "FK_WarehouseOpenings_Warehouses" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;


--
-- Name: returns FK_a0a0d033aec794fccdfafc83d92; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT "FK_a0a0d033aec794fccdfafc83d92" FOREIGN KEY (target_provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT;


--
-- Name: purchase_orders FK_a3e59e4e22ceb19f1027176ea3c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT "FK_a3e59e4e22ceb19f1027176ea3c" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON DELETE RESTRICT;


--
-- Name: receptions FK_ac6687cede409fb9e9b777d47ea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptions
    ADD CONSTRAINT "FK_ac6687cede409fb9e9b777d47ea" FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_roles FK_b23c65e50a758245a33ee35fda1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: receptions FK_b255530bc688efc5cb8913202b1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.receptions
    ADD CONSTRAINT "FK_b255530bc688efc5cb8913202b1" FOREIGN KEY (provider_id) REFERENCES public.providers(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: withdrawals FK_b3606dfef81271a926b89808de8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "FK_b3606dfef81271a926b89808de8" FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: product_history FK_d0e845cfa7cb0c5f092ae9acab1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_history
    ADD CONSTRAINT "FK_d0e845cfa7cb0c5f092ae9acab1" FOREIGN KEY (product_id) REFERENCES public.products(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: warehouse_adjustments FK_d26d38dd132f1640597e4680145; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustments
    ADD CONSTRAINT "FK_d26d38dd132f1640597e4680145" FOREIGN KEY (source_warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: purchase_order_details FK_d3b4369887dd815c0b52023ddca; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_order_details
    ADD CONSTRAINT "FK_d3b4369887dd815c0b52023ddca" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: withdrawal_details FK_d71b7ed9cd91431a70b7dfb082b; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_details
    ADD CONSTRAINT "FK_d71b7ed9cd91431a70b7dfb082b" FOREIGN KEY (withdrawal_id) REFERENCES public.withdrawals(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: warehouse_adjustment_details FK_de0db6484b5f37acab597d0cb63; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouse_adjustment_details
    ADD CONSTRAINT "FK_de0db6484b5f37acab597d0cb63" FOREIGN KEY (warehouse_adjustment_id) REFERENCES public.warehouse_adjustments(id) ON DELETE CASCADE;


--
-- Name: warehouses FK_eb1624a03db5428b2ad92bb9214; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT "FK_eb1624a03db5428b2ad92bb9214" FOREIGN KEY (currency_id) REFERENCES public.currencies(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: withdrawals FK_ed3601ba1a0fd76cd480bacfb38; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT "FK_ed3601ba1a0fd76cd480bacfb38" FOREIGN KEY (cash_transaction_id) REFERENCES public.cash_transactions(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: returns FK_fcc96c3a63ced709d3cc45fefc8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.returns
    ADD CONSTRAINT "FK_fcc96c3a63ced709d3cc45fefc8" FOREIGN KEY (source_warehouse_id) REFERENCES public.warehouses(id) ON DELETE RESTRICT;


--
-- Name: role_permissions FK_role_permissions_permission; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions FK_role_permissions_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict AQwhqgFbZjt50GR0XkQTUO8MVr84UqAv1tC2YAbdgHCeXZUQLNfwWBhgCxdW0dw

