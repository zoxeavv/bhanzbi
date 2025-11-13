import { pgTable, text, timestamp, jsonb, numeric, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const offerStatusEnum = pgEnum('offer_status', ['draft', 'sent', 'accepted', 'rejected']);

// Tables
export const clients = pgTable('clients', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  company: text('company').notNull().default(''),
  email: text('email').notNull().default(''),
  phone: text('phone').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const templates = pgTable('templates', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull().default(''),
  category: text('category').notNull().default(''),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

export const offers = pgTable('offers', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
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
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// CRM users table (if needed for auth)
export const crm_users = pgTable('crm_users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  org_id: text('org_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// Trigger function for updated_at (can be created via migration)
// CREATE OR REPLACE FUNCTION update_updated_at_column()
// RETURNS TRIGGER AS $$
// BEGIN
//   NEW.updated_at = NOW();
//   RETURN NEW;
// END;
// $$ language 'plpgsql';

// CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
//   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
// (same for templates, offers, crm_users)


