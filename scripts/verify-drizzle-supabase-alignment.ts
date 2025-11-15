/**
 * Script pour vérifier l'alignement Drizzle ↔ Supabase réel
 * Utilise la connexion DB directe pour interroger le schéma PostgreSQL
 */

import { Pool } from 'pg';
import { clients, templates, offers, crm_users, admin_allowed_emails } from '../src/lib/db/schema';

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: Array<{ column: string; references: string }>;
  uniqueConstraints: Array<{ columns: string[]; name: string }>;
  indexes: Array<{ name: string; columns: string[] }>;
}

// Extraction du schéma Drizzle
function extractDrizzleSchema(): Record<string, TableInfo> {
  const schema: Record<string, TableInfo> = {};

  schema.clients = {
    name: 'clients',
    columns: [
      { name: 'id', type: 'text', nullable: false, default: 'gen_random_uuid()' },
      { name: 'org_id', type: 'text', nullable: false, default: null },
      { name: 'name', type: 'text', nullable: false, default: null },
      { name: 'company', type: 'text', nullable: false, default: "''" },
      { name: 'email', type: 'text', nullable: false, default: "''" },
      { name: 'phone', type: 'text', nullable: false, default: "''" },
      { name: 'tags', type: 'jsonb', nullable: false, default: "'[]'::jsonb" },
      { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' },
    ],
    primaryKey: ['id'],
    foreignKeys: [],
    uniqueConstraints: [],
    indexes: [
      { name: 'idx_clients_org_id', columns: ['org_id'] },
      { name: 'idx_clients_created_at', columns: ['created_at'] },
    ],
  };

  schema.templates = {
    name: 'templates',
    columns: [
      { name: 'id', type: 'text', nullable: false, default: 'gen_random_uuid()' },
      { name: 'org_id', type: 'text', nullable: false, default: null },
      { name: 'title', type: 'text', nullable: false, default: null },
      { name: 'slug', type: 'varchar(255)', nullable: false, default: null },
      { name: 'content', type: 'text', nullable: false, default: "''" },
      { name: 'template_kind', type: 'varchar(50)', nullable: false, default: "'GENERIC'" },
      { name: 'category', type: 'text', nullable: false, default: "''" },
      { name: 'tags', type: 'jsonb', nullable: false, default: "'[]'::jsonb" },
      { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' },
    ],
    primaryKey: ['id'],
    foreignKeys: [],
    uniqueConstraints: [
      { columns: ['org_id', 'slug'], name: 'templates_org_id_slug_unique' },
    ],
    indexes: [
      { name: 'idx_templates_org_id', columns: ['org_id'] },
      { name: 'idx_templates_created_at', columns: ['created_at'] },
    ],
  };

  schema.offers = {
    name: 'offers',
    columns: [
      { name: 'id', type: 'text', nullable: false, default: 'gen_random_uuid()' },
      { name: 'org_id', type: 'text', nullable: false, default: null },
      { name: 'client_id', type: 'text', nullable: false, default: null },
      { name: 'template_id', type: 'text', nullable: true, default: null },
      { name: 'title', type: 'text', nullable: false, default: null },
      { name: 'items', type: 'jsonb', nullable: false, default: "'[]'::jsonb" },
      { name: 'subtotal', type: 'numeric(10,2)', nullable: false, default: "'0'" },
      { name: 'tax_rate', type: 'numeric(5,2)', nullable: false, default: "'0'" },
      { name: 'tax_amount', type: 'numeric(10,2)', nullable: false, default: "'0'" },
      { name: 'total', type: 'numeric(10,2)', nullable: false, default: "'0'" },
      { name: 'status', type: 'offer_status', nullable: false, default: "'draft'" },
      { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' },
    ],
    primaryKey: ['id'],
    foreignKeys: [
      { column: 'client_id', references: 'clients.id' },
      { column: 'template_id', references: 'templates.id' },
    ],
    uniqueConstraints: [],
    indexes: [
      { name: 'idx_offers_org_id', columns: ['org_id'] },
      { name: 'idx_offers_created_at', columns: ['created_at'] },
      { name: 'idx_offers_org_id_created_at', columns: ['org_id', 'created_at'] },
      { name: 'idx_offers_org_id_status', columns: ['org_id', 'status'] },
      { name: 'idx_offers_client_id', columns: ['client_id'] },
      { name: 'idx_offers_org_client', columns: ['org_id', 'client_id'] },
    ],
  };

  schema.crm_users = {
    name: 'crm_users',
    columns: [
      { name: 'id', type: 'text', nullable: false, default: 'gen_random_uuid()' },
      { name: 'email', type: 'text', nullable: false, default: null },
      { name: 'org_id', type: 'text', nullable: true, default: null },
      { name: 'created_at', type: 'timestamp', nullable: false, default: 'now()' },
      { name: 'updated_at', type: 'timestamp', nullable: false, default: 'now()' },
    ],
    primaryKey: ['id'],
    foreignKeys: [],
    uniqueConstraints: [
      { columns: ['email'], name: 'crm_users_email_unique' },
    ],
    indexes: [],
  };

  schema.admin_allowed_emails = {
    name: 'admin_allowed_emails',
    columns: [
      { name: 'id', type: 'text', nullable: false, default: 'gen_random_uuid()' },
      { name: 'org_id', type: 'text', nullable: false, default: null },
      { name: 'email', type: 'text', nullable: false, default: null },
      { name: 'created_by', type: 'text', nullable: false, default: null },
      { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
      { name: 'used_at', type: 'timestamptz', nullable: true, default: null },
    ],
    primaryKey: ['id'],
    foreignKeys: [],
    uniqueConstraints: [
      { columns: ['org_id', 'email'], name: 'admin_allowed_emails_org_id_email_unique' },
    ],
    indexes: [
      { name: 'idx_admin_allowed_emails_org_id', columns: ['org_id'] },
      { name: 'idx_admin_allowed_emails_email', columns: ['email'] },
    ],
  };

  return schema;
}

// Interroger le schéma PostgreSQL réel
async function queryDatabaseSchema(pool: Pool): Promise<Record<string, TableInfo>> {
  const schema: Record<string, TableInfo> = {};

  // Liste des tables dans le schema public
  const tablesResult = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tableNames = tablesResult.rows.map((r: any) => r.table_name);

  for (const tableName of tableNames) {
    // Colonnes
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    const columns: ColumnInfo[] = columnsResult.rows.map((r: any) => {
      let type = r.data_type;
      if (r.character_maximum_length) {
        type = `${type}(${r.character_maximum_length})`;
      } else if (r.numeric_precision && r.numeric_scale) {
        type = `${type}(${r.numeric_precision},${r.numeric_scale})`;
      }
      return {
        name: r.column_name,
        type,
        nullable: r.is_nullable === 'YES',
        default: r.column_default,
      };
    });

    // Primary Key
    const pkResult = await pool.query(`
      SELECT kc.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kc
        ON tc.constraint_name = kc.constraint_name
        AND tc.table_schema = kc.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      ORDER BY kc.ordinal_position;
    `, [tableName]);

    const primaryKey = pkResult.rows.map((r: any) => r.column_name);

    // Foreign Keys
    const fkResult = await pool.query(`
      SELECT
        kc.column_name,
        ccu.table_name || '.' || ccu.column_name AS references
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kc
        ON tc.constraint_name = kc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [tableName]);

    const foreignKeys = fkResult.rows.map((r: any) => ({
      column: r.column_name,
      references: r.references,
    }));

    // Unique constraints
    const uniqueResult = await pool.query(`
      SELECT
        tc.constraint_name,
        array_agg(kc.column_name ORDER BY kc.ordinal_position) AS columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kc
        ON tc.constraint_name = kc.constraint_name
        AND tc.table_schema = kc.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1
      GROUP BY tc.constraint_name;
    `, [tableName]);

    const uniqueConstraints = uniqueResult.rows.map((r: any) => ({
      columns: r.columns,
      name: r.constraint_name,
    }));

    // Indexes (non-unique)
    const indexesResult = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = $1
        AND indexname NOT IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_schema = 'public'
            AND table_name = $1
            AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        );
    `, [tableName]);

    const indexes = indexesResult.rows.map((r: any) => {
      // Extraire les colonnes de l'indexdef (simplifié)
      const match = r.indexdef.match(/\(([^)]+)\)/);
      const columns = match ? match[1].split(',').map((c: string) => c.trim().replace(/"/g, '')) : [];
      return {
        name: r.indexname,
        columns,
      };
    });

    schema[tableName] = {
      name: tableName,
      columns,
      primaryKey,
      foreignKeys,
      uniqueConstraints,
      indexes,
    };
  }

  return schema;
}

// Comparer les schémas
function compareSchemas(drizzle: Record<string, TableInfo>, db: Record<string, TableInfo>) {
  const drizzleTables = Object.keys(drizzle);
  const dbTables = Object.keys(db);

  const results = {
    aligned: [] as string[],
    divergent: [] as Array<{ table: string; issues: string[] }>,
    phantom: [] as string[],
    missing: [] as string[],
  };

  // Tables Drizzle
  for (const tableName of drizzleTables) {
    if (!db[tableName]) {
      results.phantom.push(tableName);
      continue;
    }

    const drizzleTable = drizzle[tableName];
    const dbTable = db[tableName];
    const issues: string[] = [];

    // Comparer colonnes
    const drizzleCols = new Map(drizzleTable.columns.map(c => [c.name, c]));
    const dbCols = new Map(dbTable.columns.map(c => [c.name, c]));

    // Colonnes manquantes en DB
    for (const [colName, drizzleCol] of drizzleCols) {
      if (!dbCols.has(colName)) {
        issues.push(`Colonne manquante en DB: ${colName}`);
      } else {
        const dbCol = dbCols.get(colName)!;
        if (drizzleCol.type !== dbCol.type && !normalizeType(drizzleCol.type).includes(normalizeType(dbCol.type))) {
          issues.push(`Type différent pour ${colName}: Drizzle=${drizzleCol.type}, DB=${dbCol.type}`);
        }
        if (drizzleCol.nullable !== dbCol.nullable) {
          issues.push(`Nullability différente pour ${colName}: Drizzle=${drizzleCol.nullable ? 'nullable' : 'NOT NULL'}, DB=${dbCol.nullable ? 'nullable' : 'NOT NULL'}`);
        }
      }
    }

    // Colonnes présentes en DB mais pas en Drizzle
    for (const [colName] of dbCols) {
      if (!drizzleCols.has(colName)) {
        issues.push(`Colonne présente en DB mais absente de Drizzle: ${colName}`);
      }
    }

    // Primary Key
    if (JSON.stringify(drizzleTable.primaryKey.sort()) !== JSON.stringify(dbTable.primaryKey.sort())) {
      issues.push(`PK différente: Drizzle=[${drizzleTable.primaryKey.join(',')}], DB=[${dbTable.primaryKey.join(',')}]`);
    }

    // Unique constraints
    const drizzleUniques = new Set(drizzleTable.uniqueConstraints.map(u => u.name));
    const dbUniques = new Set(dbTable.uniqueConstraints.map(u => u.name));
    for (const unique of drizzleUniques) {
      if (!dbUniques.has(unique)) {
        issues.push(`Contrainte unique manquante en DB: ${unique}`);
      }
    }

    // Indexes
    const drizzleIndexes = new Set(drizzleTable.indexes.map(i => i.name));
    const dbIndexes = new Set(dbTable.indexes.map(i => i.name));
    for (const index of drizzleIndexes) {
      if (!dbIndexes.has(index)) {
        issues.push(`Index manquant en DB: ${index}`);
      }
    }

    if (issues.length > 0) {
      results.divergent.push({ table: tableName, issues });
    } else {
      results.aligned.push(tableName);
    }
  }

  // Tables présentes en DB mais pas en Drizzle (métier uniquement)
  const businessTables = ['clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users'];
  for (const tableName of dbTables) {
    if (!drizzleTables.includes(tableName) && businessTables.includes(tableName)) {
      results.missing.push(tableName);
    }
  }

  return results;
}

function normalizeType(type: string): string {
  return type.toLowerCase().replace(/\s+/g, '');
}

// Main
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔍 Extraction du schéma Drizzle...');
    const drizzleSchema = extractDrizzleSchema();
    console.log(`   ✅ ${Object.keys(drizzleSchema).length} tables définies en Drizzle`);

    console.log('\n🔍 Interrogation du schéma Supabase...');
    const dbSchema = await queryDatabaseSchema(pool);
    console.log(`   ✅ ${Object.keys(dbSchema).length} tables trouvées en DB`);

    console.log('\n📊 Comparaison des schémas...');
    const comparison = compareSchemas(drizzleSchema, dbSchema);

    console.log('\n' + '='.repeat(80));
    console.log('RÉSULTATS DE LA COMPARAISON');
    console.log('='.repeat(80));

    console.log(`\n✅ Tables alignées (${comparison.aligned.length}):`);
    comparison.aligned.forEach(t => console.log(`   - ${t}`));

    if (comparison.divergent.length > 0) {
      console.log(`\n⚠️  Tables divergentes (${comparison.divergent.length}):`);
      comparison.divergent.forEach(({ table, issues }) => {
        console.log(`   - ${table}:`);
        issues.forEach(issue => console.log(`     • ${issue}`));
      });
    }

    if (comparison.phantom.length > 0) {
      console.log(`\n❌ Tables fantômes (définies en Drizzle mais absentes en DB) (${comparison.phantom.length}):`);
      comparison.phantom.forEach(t => console.log(`   - ${t}`));
    }

    if (comparison.missing.length > 0) {
      console.log(`\n⚠️  Tables présentes en DB mais absentes de Drizzle (${comparison.missing.length}):`);
      comparison.missing.forEach(t => console.log(`   - ${t}`));
    }

    // Résumé
    console.log('\n' + '='.repeat(80));
    console.log('RÉSUMÉ');
    console.log('='.repeat(80));
    console.log(`✅ Alignées: ${comparison.aligned.length}`);
    console.log(`⚠️  Divergentes: ${comparison.divergent.length}`);
    console.log(`❌ Fantômes: ${comparison.phantom.length}`);
    console.log(`⚠️  Manquantes: ${comparison.missing.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

export { extractDrizzleSchema, queryDatabaseSchema, compareSchemas };

