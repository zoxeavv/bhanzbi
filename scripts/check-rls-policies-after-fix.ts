/**
 * Script pour vérifier l'état des policies RLS après application de la migration 0008
 * Utilise la connexion DB directe pour interroger PostgreSQL
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

interface PolicyStatus {
  table_name: string;
  has_select: string;
  has_insert: string;
  has_update: string;
  has_delete: string;
}

async function checkRLSPolicies() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('🔍 Vérification des policies RLS après migration 0008...\n');

    // Vérifier les policies pour chaque table
    const tables = ['clients', 'templates', 'offers', 'admin_allowed_emails'];
    const results: PolicyStatus[] = [];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT 
          $1 AS table_name,
          CASE 
            WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
            ELSE '❌'
          END AS has_select,
          CASE 
            WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
            ELSE '❌'
          END AS has_insert,
          CASE 
            WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
            ELSE '❌'
          END AS has_update,
          CASE 
            WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
            ELSE '❌'
          END AS has_delete
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = $1
      `, [table]);

      results.push(result.rows[0] as PolicyStatus);
    }

    // Afficher les résultats
    console.log('📊 État des policies RLS par table:\n');
    console.log('Table'.padEnd(25) + 'SELECT'.padEnd(10) + 'INSERT'.padEnd(10) + 'UPDATE'.padEnd(10) + 'DELETE');
    console.log('-'.repeat(65));

    let allOk = true;
    for (const result of results) {
      const status = `${result.has_select} ${result.has_insert} ${result.has_update} ${result.has_delete}`;
      console.log(`${result.table_name.padEnd(25)}${status}`);
      
      if (result.table_name !== 'admin_allowed_emails') {
        if (result.has_select === '❌' || result.has_insert === '❌' || 
            result.has_update === '❌' || result.has_delete === '❌') {
          allOk = false;
        }
      }
    }

    console.log('\n' + '='.repeat(65));

    // Vérifier RLS activé
    console.log('\n🔒 Vérification RLS activé:\n');
    const rlsCheck = await pool.query(`
      SELECT 
        tablename,
        rowsecurity AS rls_enabled,
        CASE 
          WHEN rowsecurity THEN '✅ RLS activé'
          ELSE '❌ RLS désactivé'
        END AS status
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
      ORDER BY tablename
    `);

    for (const row of rlsCheck.rows) {
      console.log(`${row.tablename.padEnd(25)}${row.status}`);
    }

    // Vérifier fonction org_id()
    console.log('\n🔧 Vérification fonction public.org_id():\n');
    const funcCheck = await pool.query(`
      SELECT 
        routine_name,
        CASE 
          WHEN routine_name = 'org_id' THEN '✅ Fonction existe'
          ELSE '❌ Fonction manquante'
        END AS status
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'org_id'
    `);

    if (funcCheck.rows.length > 0) {
      console.log(`✅ ${funcCheck.rows[0].routine_name}: ${funcCheck.rows[0].status}`);
    } else {
      console.log('❌ Fonction org_id() manquante');
      allOk = false;
    }

    // Résumé final
    console.log('\n' + '='.repeat(65));
    console.log('📋 RÉSUMÉ');
    console.log('='.repeat(65));

    if (allOk && results.every(r => 
      r.table_name === 'admin_allowed_emails' || 
      (r.has_select === '✅' && r.has_insert === '✅' && r.has_update === '✅' && r.has_delete === '✅')
    )) {
      console.log('✅ Toutes les policies RLS sont présentes pour les tables métier');
      console.log('✅ Migration 0008 appliquée avec succès');
      process.exit(0);
    } else {
      console.log('⚠️  Certaines policies RLS sont encore manquantes');
      console.log('   Vérifiez les résultats ci-dessus');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  checkRLSPolicies();
}

export { checkRLSPolicies };


