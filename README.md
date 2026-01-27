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

- **Multi-database support**: MySQL and PostgreSQL
- **JWT Authentication**: Secure token-based authentication
- **FacturaAPI Integration**: Electronic invoicing (CFDI) support
- **Certification pack sync (Clients and Products)**: On create/update, entities are synced with the active certification pack (e.g. Facturapi). Clients use `ClientPackSyncService`; products use `ProductPackSyncService`. Responses include `pack_sync_success` and `pack_sync_error`. Entities store `pack_product_id` (ID in the pack) and `pack_product_response` (raw pack response) for auditing. See [Certification pack sync](#certification-pack-sync) below.
- **File Uploads**: Image and document upload support
- **TypeORM**: Database ORM with migrations
- **Validation**: Class-validator for DTOs
- **CORS**: Configurable CORS support

## Certification pack sync

When a **client** or **product** is created or updated, the API syncs it with the active certification pack (Facturapi) if one is configured.

- **Clients**: `ClientPackSyncService` maps client fields to Facturapi Customer and calls `createCustomer` / `updateCustomer`. The client entity stores `pack_product_id` (Facturapi customer id) and `pack_product_response`.
- **Products**: `ProductPackSyncService` maps product fields to Facturapi Product (description, product_key from code, unit_key from measurement_unit, price 0, sku) and calls `createProduct` / `updateProduct`. The product entity stores `pack_product_id` (Facturapi product id) and `pack_product_response`.

Create and update endpoints return `{ client|product, pack_sync_success, pack_sync_error? }`. If sync fails, the entity is still saved; `pack_sync_error` contains the pack error message for the client to show in the UI.

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [FacturaAPI Documentation](https://www.facturapi.io/docs)
- [Docker Setup Guide](./DOCKER.md)
- [Invoice API Documentation](./INVOICE_API.md)

## License

This project is private and proprietary.
