import * as Joi from 'joi';

export const configSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().required(),
  HOST: Joi.string().default('localhost'),
  CORS_ORIGIN: Joi.string().default('*'),
  APP_KEY: Joi.string().required(),
  APP_PUBLIC_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  // DB Provider
  APP_DB_PROVIDER: Joi.string().valid('postgres', 'mysql').required(),

  // PostgreSQL
  PG_DB_HOST: Joi.string().when('APP_DB_PROVIDER', {
    is: 'postgres',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  PG_DB_PORT: Joi.number().when('APP_DB_PROVIDER', {
    is: 'postgres',
    then: Joi.required(),
  }),
  PG_DB_USER: Joi.string().when('APP_DB_PROVIDER', {
    is: 'postgres',
    then: Joi.required(),
  }),
  PG_DB_PASSWORD: Joi.string().allow('').optional(),
  PG_DB_NAME: Joi.string().when('APP_DB_PROVIDER', {
    is: 'postgres',
    then: Joi.required(),
  }),

  // MySQL (opcional)
  MYSQL_DB_HOST: Joi.string().optional(),
  MYSQL_DB_PORT: Joi.number().optional(),
  MYSQL_DB_USER: Joi.string().optional(),
  MYSQL_DB_PASSWORD: Joi.string().optional(),
  MYSQL_DB_NAME: Joi.string().optional(),

  // DB options
  DB_SYNC: Joi.boolean().truthy('true').falsy('false').default(false),
  DB_LOGGING: Joi.boolean().truthy('true').falsy('false').default(false),

  // Storage
  STORAGE_DRIVER: Joi.string().valid('local', 's3').default('local'),
  UPLOAD_DEST: Joi.string().default('./uploads'),

  // Email
  EMAIL_FROM: Joi.string().email().required(),
  EMAIL_PROVIDER: Joi.string().valid('resend', 'smtp', 'gmail').required(),

  // SMTP
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(true),

  // Gmail OAuth
  GMAIL_CLIENT_ID: Joi.string().optional(),
  GMAIL_CLIENT_SECRET: Joi.string().optional(),
  GMAIL_REFRESH_TOKEN: Joi.string().optional(),

  // Resend
  RESEND_API_KEY: Joi.string().optional(),

  // Cache / Redis
  CACHE_TYPE: Joi.string().valid('redis', 'memory').default('memory'),
  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().optional(),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().optional(),
  REDIS_USER: Joi.string().allow('').optional(),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Otros
  ERROR_NOTIFY_EMAIL: Joi.string().email().optional(),
  DEFAULT_ROLE_ID_FOR_USER_REGISTER: Joi.string().required(),

  // SAT APIs
  SAT_CATALOG_PRODUCTS_URL: Joi.string().uri().optional(),
  SAT_CATALOG_UNITS_URL: Joi.string().uri().optional(),
});