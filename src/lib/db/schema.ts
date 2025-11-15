import { pgTable, text, timestamp, jsonb, numeric, varchar, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'sent', 'accepted', 'rejected']);

// Tables
export const clients = pgTable('clients', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  org_id: text('org_id').notNull(),
  name: text('name').notNull(),
  company: text('company').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const templates = pgTable('templates', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  org_id: text('org_id').notNull(),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: text('content').notNull().default(''),
  template_kind: varchar('template_kind', { length: 50 }).notNull().default('GENERIC'),
  category: text('category').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Contrainte unique composite sur (org_id, slug) pour garantir l'unicité au niveau organisationnel
  templatesOrgIdSlugUnique: uniqueIndex('templates_org_id_slug_unique').on(table.org_id, table.slug),
}));

export const offers = pgTable('offers', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  org_id: text('org_id').notNull(),
  client_id: text('client_id').notNull().references(() => clients.id),
  template_id: text('template_id').references(() => templates.id),
  title: text('title').notNull(),
  items: jsonb('items').$type<Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>>().notNull().default([]),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  tax_rate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  tax_amount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  status: offerStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Table des emails autorisés pour les admins
export const admin_allowed_emails = pgTable('admin_allowed_emails', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  org_id: text('org_id').notNull(),
  email: text('email').notNull(),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  used_at: timestamp('used_at', { withTimezone: true }),
}, (table) => ({
  // Contrainte unique composite sur (org_id, email) pour garantir l'unicité au niveau organisationnel
  adminAllowedEmailsOrgIdEmailUnique: uniqueIndex('admin_allowed_emails_org_id_email_unique').on(table.org_id, table.email),
}));
