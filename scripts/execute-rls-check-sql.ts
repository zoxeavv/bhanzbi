/**
 * Script pour exécuter les requêtes SQL de vérification RLS via PostgreSQL direct
 * 
 * Ce script utilise DATABASE_URL pour se connecter directement à PostgreSQL
 * et exécute les requêtes SQL pour vérifier les RLS policies.
 * 
 * Usage:
 *   npx tsx scripts/execute-rls-check-sql.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface PolicyInfo {
  tablename: string;
  policyname: string;
  operation: string;
  using_expression: string | null;
  with_check_expression: string | null;
  uses_org_id: boolean;
}

interface PolicySummary {
  tablename: string;
  select_policies: number;
  insert_policies: number;
  update_policies: number;
  delete_policies: number;
  total_policies: number;
  status: string;
}

async function executeRLSCheck() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL n\'est pas défini dans .env.local');
    process.exit(1);
  }

  console.log('🔍 Exécution des vérifications RLS via PostgreSQL direct...\n');

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    // ========================================================================
    // 1. Vérifier si RLS est activé sur les tables
    // ========================================================================
    console.log('📊 1. État RLS par table:');
    console.log('─'.repeat(60));
    
    const rlsStatusQuery = `
      SELECT 
        tablename,
        rowsecurity AS rls_enabled,
        CASE 
          WHEN rowsecurity THEN '✅ RLS activé'
          ELSE '❌ RLS désactivé'
        END AS status
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails', 'crm_users')
      ORDER BY tablename;
    `;

    const rlsStatusResult = await pool.query(rlsStatusQuery);
    rlsStatusResult.rows.forEach(row => {
      console.log(`   ${row.status} ${row.tablename}`);
    });
    console.log('');

    // ========================================================================
    // 2. Lister toutes les policies avec détails
    // ========================================================================
    console.log('📊 2. Liste complète des policies RLS:');
    console.log('─'.repeat(60));
    
    const policiesQuery = `
      SELECT 
        tablename,
        policyname,
        cmd AS operation,
        qual::text AS using_expression,
        with_check::text AS with_check_expression,
        CASE 
          WHEN qual::text LIKE '%org_id()%' OR qual::text LIKE '%public.org_id()%' 
            OR with_check::text LIKE '%org_id()%' OR with_check::text LIKE '%public.org_id()%'
          THEN true
          ELSE false
        END AS uses_org_id_function
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
      ORDER BY tablename, 
        CASE cmd
          WHEN 'SELECT' THEN 1
          WHEN 'INSERT' THEN 2
          WHEN 'UPDATE' THEN 3
          WHEN 'DELETE' THEN 4
          ELSE 5
        END,
        policyname;
    `;

    const policiesResult = await pool.query(policiesQuery);
    const policies: PolicyInfo[] = policiesResult.rows;

    if (policies.length === 0) {
      console.log('   ⚠️  Aucune policy trouvée');
    } else {
      policies.forEach(policy => {
        const orgIdStatus = policy.uses_org_id ? '✅' : '❌';
        console.log(`   ${policy.tablename} [${policy.operation}] ${policy.policyname}`);
        console.log(`      ${orgIdStatus} Utilise org_id(): ${policy.uses_org_id}`);
        if (policy.using_expression) {
          console.log(`      USING: ${policy.using_expression.substring(0, 80)}...`);
        }
        if (policy.with_check_expression) {
          console.log(`      WITH CHECK: ${policy.with_check_expression.substring(0, 80)}...`);
        }
      });
    }
    console.log('');

    // ========================================================================
    // 3. Détecter les doublons
    // ========================================================================
    console.log('📊 3. Détection des doublons:');
    console.log('─'.repeat(60));
    
    const duplicatesQuery = `
      SELECT 
        tablename,
        cmd AS operation,
        COUNT(*) AS policy_count,
        STRING_AGG(policyname, ', ' ORDER BY policyname) AS policy_names,
        CASE 
          WHEN COUNT(*) > 1 THEN '⚠️ DOUBLONS DÉTECTÉS'
          ELSE '✅ OK'
        END AS status
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
      GROUP BY tablename, cmd
      HAVING COUNT(*) > 1
      ORDER BY tablename, cmd;
    `;

    const duplicatesResult = await pool.query(duplicatesQuery);
    if (duplicatesResult.rows.length === 0) {
      console.log('   ✅ Aucun doublon détecté');
    } else {
      duplicatesResult.rows.forEach(row => {
        console.log(`   ⚠️  ${row.tablename} [${row.operation}]: ${row.policy_count} policies`);
        console.log(`      ${row.policy_names}`);
      });
    }
    console.log('');

    // ========================================================================
    // 4. Résumé par table (comme dans votre résultat)
    // ========================================================================
    console.log('📊 4. Résumé par table:');
    console.log('─'.repeat(60));
    
    const summaryQuery = `
      SELECT 
        tablename,
        COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN policyname END) AS select_policies,
        COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN policyname END) AS insert_policies,
        COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN policyname END) AS update_policies,
        COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN policyname END) AS delete_policies,
        COUNT(DISTINCT policyname) AS total_policies,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN cmd = 'SELECT' THEN policyname END) = 1
           AND COUNT(DISTINCT CASE WHEN cmd = 'INSERT' THEN policyname END) = 1
           AND COUNT(DISTINCT CASE WHEN cmd = 'UPDATE' THEN policyname END) = 1
           AND COUNT(DISTINCT CASE WHEN cmd = 'DELETE' THEN policyname END) = 1
          THEN '✅ Toutes les policies correctes (1 par opération)'
          ELSE '⚠️ Policies manquantes ou en trop'
        END AS status
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails')
      GROUP BY tablename
      ORDER BY tablename;
    `;

    const summaryResult = await pool.query(summaryQuery);
    const summaries: PolicySummary[] = summaryResult.rows;

    summaries.forEach(summary => {
      console.log(`   ${summary.tablename}:`);
      console.log(`      SELECT: ${summary.select_policies} | INSERT: ${summary.insert_policies} | UPDATE: ${summary.update_policies} | DELETE: ${summary.delete_policies}`);
      console.log(`      Total: ${summary.total_policies} policies | ${summary.status}`);
    });
    console.log('');

    // ========================================================================
    // 5. Comparaison avec les résultats attendus
    // ========================================================================
    console.log('📊 5. Comparaison avec attentes (migration 0002_enable_rls.sql):');
    console.log('─'.repeat(60));
    
    const expectedPolicies = {
      clients: { select: 1, insert: 1, update: 1, delete: 1 },
      templates: { select: 1, insert: 1, update: 1, delete: 1 },
      offers: { select: 1, insert: 1, update: 1, delete: 1 },
    };

    summaries.forEach(summary => {
      const expected = expectedPolicies[summary.tablename as keyof typeof expectedPolicies];
      if (expected) {
        const selectOk = summary.select_policies === expected.select ? '✅' : '❌';
        const insertOk = summary.insert_policies === expected.insert ? '✅' : '❌';
        const updateOk = summary.update_policies === expected.update ? '✅' : '❌';
        const deleteOk = summary.delete_policies === expected.delete ? '✅' : '❌';
        
        console.log(`   ${summary.tablename}:`);
        console.log(`      SELECT: ${selectOk} ${summary.select_policies}/${expected.select} (attendu: ${expected.select})`);
        console.log(`      INSERT: ${insertOk} ${summary.insert_policies}/${expected.insert} (attendu: ${expected.insert})`);
        console.log(`      UPDATE: ${updateOk} ${summary.update_policies}/${expected.update} (attendu: ${expected.update})`);
        console.log(`      DELETE: ${deleteOk} ${summary.delete_policies}/${expected.delete} (attendu: ${expected.delete})`);
      }
    });
    console.log('');

    // ========================================================================
    // 6. Vérifier la fonction public.org_id()
    // ========================================================================
    console.log('📊 6. Vérification de la fonction public.org_id():');
    console.log('─'.repeat(60));
    
    const functionQuery = `
      SELECT 
        routine_name,
        routine_type,
        security_type,
        CASE 
          WHEN security_type = 'DEFINER' THEN '✅ SECURITY DEFINER (peut accéder à auth.jwt())'
          ELSE '⚠️ SECURITY INVOKER'
        END AS security_status
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = 'org_id';
    `;

    const functionResult = await pool.query(functionQuery);
    if (functionResult.rows.length === 0) {
      console.log('   ❌ Fonction public.org_id() n\'existe pas');
    } else {
      functionResult.rows.forEach(row => {
        console.log(`   ✅ ${row.routine_name}: ${row.security_status}`);
      });
    }
    console.log('');

    // ========================================================================
    // Résumé final
    // ========================================================================
    console.log('─'.repeat(60));
    console.log('📋 Résumé final:');
    console.log('─'.repeat(60));
    
    const allCorrect = summaries.every(s => {
      const expected = expectedPolicies[s.tablename as keyof typeof expectedPolicies];
      return expected && 
        s.select_policies === expected.select &&
        s.insert_policies === expected.insert &&
        s.update_policies === expected.update &&
        s.delete_policies === expected.delete;
    });

    if (allCorrect) {
      console.log('   ✅ Toutes les tables ont le bon nombre de policies');
    } else {
      console.log('   ⚠️  Certaines tables ont des policies manquantes ou en trop');
      console.log('   → Exécutez scripts/cleanup-duplicate-rls-policies.sql pour corriger');
    }

  } catch (error) {
    console.error('\n❌ Erreur lors de l\'exécution:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeRLSCheck().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});


