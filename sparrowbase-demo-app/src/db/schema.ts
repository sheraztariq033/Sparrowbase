import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Users Table
export const users = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Sessions Table
export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// Accounts Table (OAuth Providers)
export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Verifications Table (Magic links, Password resets)
export const verifications = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }),
});

// Multi-Tenant Organizations Table
export const organizations = sqliteTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logoUrl'),
  plan: text('plan').notNull().default('free'), // free, pro, enterprise
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// Organization Memberships Table
export const memberships = sqliteTable('membership', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner, admin, member
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

// Stripe Subscriptions Table
export const subscriptions = sqliteTable('subscription', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').notNull().unique().references(() => organizations.id, { onDelete: 'cascade' }),
  stripeCustomerId: text('stripeCustomerId').notNull().unique(),
  stripeSubscriptionId: text('stripeSubscriptionId').notNull().unique(),
  stripePriceId: text('stripePriceId').notNull(),
  status: text('status').notNull(), // active, past_due, canceled, trialing
  currentPeriodStart: integer('currentPeriodStart', { mode: 'timestamp' }).notNull(),
  currentPeriodEnd: integer('currentPeriodEnd', { mode: 'timestamp' }).notNull(),
  cancelAtPeriodEnd: integer('cancelAtPeriodEnd', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// File Upload Metadata Table (R2 Tracking)
export const fileUploads = sqliteTable('file_uploads', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').references(() => organizations.id, { onDelete: 'cascade' }),
  fileName: text('fileName').notNull(),
  fileSize: integer('fileSize').notNull(),
  mimeType: text('mimeType').notNull(),
  r2Key: text('r2Key').notNull().unique(),
  publicUrl: text('publicUrl'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});

// Production Audit Logs Table
export const auditLogs = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  organizationId: text('organizationId').references(() => organizations.id, { onDelete: 'set null' }),
  userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // e.g. "user.login", "subscription.updated", "file.uploaded"
  ipAddress: text('ipAddress'),
  details: text('details'), // JSON payload
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
});
