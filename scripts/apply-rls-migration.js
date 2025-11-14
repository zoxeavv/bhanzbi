#!/usr/bin/env node

/**
 * Script temporaire pour appliquer la migration RLS sur Supabase
 * Utilise le client PostgreSQL pour exécuter le SQL directement
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local manuellement
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  } catch (error) {
    // Ignore si le fichier n'existe pas
  }
}

// Essayer de charger .env.local
const envLocalPath = path.join(__dirname, '..', '.env.local');
loadEnvFile(envLocalPath);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function applyMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    console.log('📖 Reading migration file...');
    const sqlFile = path.join(__dirname, '..', 'drizzle', '0002_enable_rls.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    try {
      console.log('🚀 Executing RLS migration...');
      await client.query(sql);
      console.log('✅ RLS migration applied successfully!');
      
      // Vérifier que RLS est activé
      console.log('\n📊 Verifying RLS status...');
      const result = await client.query(`
        SELECT tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('clients', 'templates', 'offers')
        ORDER BY tablename;
      `);
      
      console.log('\nRLS Status:');
      result.rows.forEach(row => {
        console.log(`  - ${row.tablename}: ${row.rowsecurity ? '✅ Enabled' : '❌ Disabled'}`);
      });

      // Vérifier les politiques créées
      const policiesResult = await client.query(`
        SELECT tablename, policyname, cmd
        FROM pg_policies
        WHERE tablename IN ('clients', 'templates', 'offers')
        ORDER BY tablename, cmd;
      `);

      console.log('\n📋 Policies created:');
      const policiesByTable = {};
      policiesResult.rows.forEach(row => {
        if (!policiesByTable[row.tablename]) {
          policiesByTable[row.tablename] = [];
        }
        policiesByTable[row.tablename].push(row.cmd);
      });

      Object.entries(policiesByTable).forEach(([table, cmds]) => {
        const uniqueCmds = [...new Set(cmds)];
        console.log(`  - ${table}: ${uniqueCmds.join(', ')}`);
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();

