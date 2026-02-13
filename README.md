<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

RedFox API - Backend API for RedFox Point of Sale system built with NestJS, TypeORM, and supporting MySQL/PostgreSQL databases.

## 🚀 Phase 2 Features - Expansion

This version includes the Phase 2 expansion features:

### 💰 Expense Management
- **Expense Categories**: Customizable expense categories with color coding
- **Expense Tracking**: Record and manage business expenses with receipts
- **Recurring Expenses**: Support for monthly, quarterly, and yearly recurring expenses
- **Expense Reports**: Summary and analytics by category and time period
- **Vendor Management**: Track expenses by vendor

### 📋 Accounts Receivable
- **Invoice Tracking**: Monitor pending and overdue invoices
- **Payment Management**: Record partial and full payments
- **Client Credit Management**: Track what clients owe
- **Overdue Alerts**: Automatic status updates for overdue accounts
- **Payment History**: Complete payment tracking with multiple payment methods

### 🔍 Global Search
- **Universal Search**: Search across all entities (products, clients, invoices, etc.)
- **Smart Results**: Grouped and prioritized search results
- **Barcode Search**: Quick product lookup by barcode
- **Real-time Search**: Instant results as you type

### 📱 PWA Support
- **Offline Functionality**: Core features work without internet
- **Background Sync**: Automatic data sync when connection returns
- **Push Notifications**: Real-time business alerts
- **Installable**: Can be installed as a native app

## API Endpoints

### Expense Management
- `GET /expense-categories` - List expense categories
- `POST /expense-categories` - Create expense category
- `GET /expenses` - List expenses with filtering
- `POST /expenses` - Create expense
- `GET /expenses/summary` - Get expense summary
- `GET /expenses/by-category` - Expenses grouped by category

### Accounts Receivable
- `GET /accounts-receivable` - List accounts receivable
- `POST /accounts-receivable` - Create account receivable
- `POST /accounts-receivable/:id/payments` - Add payment
- `GET /accounts-receivable/summary` - Get AR summary
- `GET /accounts-receivable/overdue` - Get overdue accounts

### Global Search
- `GET /search?q={query}` - Universal search
- `GET /search/barcode?barcode={code}` - Barcode search

## Project Setup

```bash
$ npm install
```

## Environment Variables

The application requires the following environment variables. Create a `.env` file in the root directory with the following configuration:

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (development/production) | `development` | No |
| `PORT` | Server port | `3000` | No |
| `HOST` | Server host | `0.0.0.0` | No |
| `CORS_ORIGIN` | Allowed CORS origin | `*` | No |
| `APP_KEY` | Application key (used for JWT) | - | **Yes** |
| `APP_PUBLIC_URL` | Public base URL of this API (used to build absolute asset URLs like the company logo). Example: `https://your-api.com` (no `/api`) | - | No |

### Database Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_DB_PROVIDER` | Database provider (`mysql` or `postgres`) | `mysql` | No |

#### MySQL Configuration (when `APP_DB_PROVIDER=mysql`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MYSQL_DB_HOST` | MySQL host | `localhost` | No |
| `MYSQL_DB_PORT` | MySQL port | `3306` | No |
| `MYSQL_DB_USER` | MySQL username | `root` | No |
| `MYSQL_DB_PASSWORD` | MySQL password | `` (empty) | No |
| `MYSQL_DB_NAME` | MySQL database name | `redfox-db` | No |

#### PostgreSQL Configuration (when `APP_DB_PROVIDER=postgres`)

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PG_DB_HOST` | PostgreSQL host | `localhost` | No |
| `PG_DB_PORT` | PostgreSQL port | `5432` | No |
| `PG_DB_USER` | PostgreSQL username | `postgres` | No |
| `PG_DB_PASSWORD` | PostgreSQL password | `postgres` | No |
| `PG_DB_NAME` | PostgreSQL database name | `redfox-db` | No |

#### Database Advanced Options

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_SYNC` | Auto-sync database schema (true/false) | `false` | No |
| `DB_LOGGING` | Enable query logging (true/false) | `false` | No |

### Authentication

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_KEY` | JWT secret key (same as application key) | - | **Yes** |

### FacturaAPI Integration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `FACTURAPI_API_KEY` | FacturaAPI API key | - | **Yes** |

### File Uploads

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `UPLOAD_DEST` | Upload directory path | `./uploads` | No |

#### Static files (uploads)

- Uploaded files are served by the API under: **`/api/uploads/*`**
- Example (company logo): `GET /api/uploads/company/<filename>`
- Notes:
  - The storage folder is resolved from the process working directory (typically `<redfox-api>/uploads`).
  - If you set `APP_PUBLIC_URL`, the `company-settings` endpoint will return `logoUrl` as an **absolute URL**.

### Example `.env` File

```env
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=*
APP_KEY=your-super-secret-app-key-change-this-in-production

# Database Provider
APP_DB_PROVIDER=mysql

# MySQL Configuration
MYSQL_DB_HOST=localhost
MYSQL_DB_PORT=3306
MYSQL_DB_USER=root
MYSQL_DB_PASSWORD=your_password
MYSQL_DB_NAME=redfox-db

# PostgreSQL Configuration (alternative)
# PG_DB_HOST=localhost
# PG_DB_PORT=5432
# PG_DB_USER=postgres
# PG_DB_PASSWORD=your_password
# PG_DB_NAME=redfox-db

# Database Options
DB_SYNC=false
DB_LOGGING=false

# FacturaAPI
FACTURAPI_API_KEY=sk_test_your_api_key_here

# Uploads
UPLOAD_DEST=./uploads
```

## Compile and Run the Project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Database Migrations

```bash
# Generate migration
$ npm run migration:generate -- -n MigrationName

# Run migrations
$ npm run migration:run

# Revert last migration
$ npm run migration:revert

# Show migration status
$ npm run migration:show

# Drop schema (development only)
$ npm run migration:drop

# Reset DB: drop all tables and run migrations (development only)
$ npm run db:reset
```

## Database Seeds

```bash
# Run all seeds
$ npm run seed

# Run permissions seed only
$ npm run seed:permissions
```

## Run Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

The API is available at `http://localhost:3000/api` with the following main endpoints:

- `/api/health` - Health check endpoint
- `/api/auth` - Authentication endpoints
- `/api/company-settings` - Company settings (singleton) + logo upload
  - `GET /api/company-settings`
  - `PUT /api/company-settings`
  - `POST /api/company-settings/logo` (multipart/form-data, field: `logo`)
  - Logo is served at: `GET /api/uploads/company/<filename>`
- `/api/users` - User management
- `/api/products` - Product management
- `/api/inventory` - Inventory management
- `/api/invoices` - Invoice management (with FacturaAPI integration)
- `/api/sales` - Sales management
- `/api/warehouses` - Warehouse management
- And more...

For detailed API documentation, see [INVOICE_API.md](./INVOICE_API.md) for invoice-related endpoints.

## Docker Deployment

See [DOCKER.md](./DOCKER.md) for detailed Docker setup and deployment instructions.

## Project Structure

```
redfox-api/
├── src/
│   ├── config/          # Configuration files (database, app)
│   ├── controllers/     # API controllers
│   ├── services/        # Business logic services
│   ├── models/          # TypeORM entities
│   ├── dtos/            # Data Transfer Objects
│   ├── modules/         # NestJS modules
│   ├── guards/          # Authentication guards
│   ├── decorators/      # Custom decorators
│   ├── db/
│   │   ├── migrations/  # Database migrations
│   │   └── seeds/       # Database seeds
│   └── main.ts          # Application entry point
├── uploads/             # Uploaded files directory
└── package.json
```

## Key Features

- **Lot/Batch-based Inventory**: Transitioned from a merged stock system to a lot-based system for precise traceability.
- **Inventory Strategies**: Support for FIFO, FEFO (First Expired, First Out), and Weighted Average costing.
- **Traceability**: Track every unit back to its original reception lot via `entry_id`.
- **Multi-database support**: MySQL and PostgreSQL
- **JWT Authentication**: Secure token-based authentication
- **FacturaAPI Integration**: Electronic invoicing (CFDI) support
- **Certification pack sync**: Clients are synced with the pack on create/update (`ClientPackSyncService`; `pack_client_id` / `pack_client_response` in client). Products are catalog only; sync to the pack runs when applying a **reception** or when **closing a warehouse** (aperturas → inventory). Pack data is stored in **inventory** (`pack_product_id`, `pack_product_response`). See [Certification pack sync](#certification-pack-sync) below.
- **File Uploads**: Image and document upload support
- **TypeORM**: Database ORM with migrations
- **Validation**: Class-validator for DTOs
- **CORS**: Configurable CORS support

## 📦 Lot/Batch Inventory System

The system now supports advanced inventory management via lot tracking.

### Strategies
- **FIFO (First In, First Out)**: Stock is deducted from the oldest lots first based on their creation date.
- **FEFO (First Expired, First Out)**: Stock is deducted from lots closest to their expiration date. Ideal for pharmacies and food businesses.
- **AVERAGE**: Stock is deducted from the lot with the lowest `entry_id` (oldest reception) but costing is based on the weighted average (legacy support).

### Key Entities
- **Inventory**: Now stores `batch_number`, `expiration_date`, and `entry_id`.
- **ReceptionDetail**: Captures lot information during product reception.
- **WithdrawalService**: Implements the "Picking Engine" that automatically selects lots based on the product's strategy.

## Certification pack sync

- **Clients**: On create/update, `ClientPackSyncService` syncs the client with the active certification pack (Facturapi). The client entity stores `pack_client_id` and `pack_client_response`. Create/update endpoints return `{ client, pack_sync_success, pack_sync_error? }`.
- **Products**: Products are **catalog only** (no price in the `products` table; price comes from inventory via reception or warehouse opening). Sync to the pack runs when:
  - A **reception** is applied (products are transferred to inventory with price), or
  - A **warehouse** is closed (warehouse openings are transferred to inventory with price).
  `InventoryPackSyncService` builds product data from inventory (product + price), calls Facturapi `createProduct` / `updateProduct`, and stores `pack_product_id` and `pack_product_response` in the **inventory** record. Product create/update no longer sync with the pack.

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [FacturaAPI Documentation](https://www.facturapi.io/docs)
- [Docker Setup Guide](./DOCKER.md)
- [Invoice API Documentation](./INVOICE_API.md)

## License

This project is private and proprietary.

## 📚 Phase 2 API Endpoints

### Expense Management

#### Expense Categories
- `GET /expense-categories` - List all expense categories
- `POST /expense-categories` - Create new expense category
- `PUT /expense-categories/:id` - Update expense category
- `DELETE /expense-categories/:id` - Delete expense category

#### Expenses
- `GET /expenses` - List expenses with filtering and pagination
- `POST /expenses` - Create new expense
- `PUT /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense
- `GET /expenses/summary` - Get expense summary by category and period

### Accounts Receivable

#### Accounts Receivable
- `GET /accounts-receivable` - List accounts receivable with filtering
- `POST /accounts-receivable` - Create new account receivable
- `PUT /accounts-receivable/:id` - Update account receivable
- `DELETE /accounts-receivable/:id` - Delete account receivable
- `GET /accounts-receivable/overdue` - Get overdue accounts

#### Account Receivable Payments
- `GET /accounts-receivable/:id/payments` - List payments for an account
- `POST /accounts-receivable/:id/payments` - Record payment
- `PUT /account-receivable-payments/:id` - Update payment
- `DELETE /account-receivable-payments/:id` - Delete payment

### Global Search
- `GET /global-search?q={query}` - Universal search across all entities
- `GET /global-search/barcode?barcode={code}` - Search products by barcode

### Query Parameters

#### Expense Filtering
- `search` - Search in description, vendor, or reference
- `status` - Filter by status (pending, paid, cancelled)
- `categoryId` - Filter by expense category
- `startDate` - Filter expenses from date
- `endDate` - Filter expenses to date
- `page` - Page number for pagination
- `limit` - Items per page

#### Accounts Receivable Filtering
- `search` - Search in reference number or client name
- `status` - Filter by status (pending, partial, paid, overdue, cancelled)
- `clientId` - Filter by client
- `startDate` - Filter by due date from
- `endDate` - Filter by due date to
- `page` - Page number for pagination
- `limit` - Items per page

## 🗄️ Database Schema Updates

### New Tables Added in Phase 2

#### expense_categories
- Stores expense categories with name, description, and color
- Used for organizing and reporting expenses

#### expenses
- Main expense tracking table
- Links to categories and users
- Supports recurring expenses and vendor tracking

#### accounts_receivable
- Tracks money owed by clients
- Links to clients and optionally to invoices
- Automatic status management (pending → overdue)

#### account_receivable_payments
- Records payments against accounts receivable
- Supports partial payments
- Maintains payment history

#### accounts_payable
- Tracks money owed to providers
- Links to providers and purchase orders
- Similar structure to accounts receivable

#### account_payable_payments
- Records payments to providers
- Supports partial payments
- Maintains payment history

### Database Indexes
- Status indexes for quick filtering
- Date indexes for efficient date range queries
- Foreign key indexes for optimal joins
