/**
 * Script de vérification des corrections de l'audit technique
 * 
 * Ce script vérifie que toutes les corrections de l'audit ont été correctement appliquées :
 * 1. Table crm_users supprimée (ou n'existe pas)
 * 2. RLS activé sur admin_allowed_emails avec toutes les policies
 * 3. Enum offer_status existe avec toutes les valeurs
 * 
 * Usage:
 *   npx tsx scripts/verify-audit-corrections.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function verifyAuditCorrections() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Variable d\'environnement DATABASE_URL manquante.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  console.log('🔍 Vérification des corrections de l\'audit technique...\n');

  let allChecksPassed = true;

  try {
    // ========================================================================
    // VÉRIFICATION 1: Table crm_users supprimée
    // ========================================================================
    console.log('📋 Vérification 1: Table crm_users supprimée');
    console.log('─'.repeat(60));

    const crmUsersCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'crm_users'
      ) AS table_exists;
    `);

    const crmUsersExists = crmUsersCheck.rows[0].table_exists;

    if (crmUsersExists) {
      console.log('   ❌ Table crm_users existe encore en base de données');
      allChecksPassed = false;
    } else {
      console.log('   ✅ Table crm_users n\'existe pas (ou a été supprimée)');
    }

    // ========================================================================
    // VÉRIFICATION 2: RLS sur admin_allowed_emails
    // ========================================================================
    console.log('\n📋 Vérification 2: RLS sur admin_allowed_emails');
    console.log('─'.repeat(60));

    // Vérifier que RLS est activé
    const rlsCheck = await pool.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'admin_allowed_emails'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `);

    if (rlsCheck.rows.length === 0) {
      console.log('   ❌ Table admin_allowed_emails n\'existe pas');
      allChecksPassed = false;
    } else {
      const rlsEnabled = rlsCheck.rows[0].relrowsecurity;
      if (rlsEnabled) {
        console.log('   ✅ RLS est activé sur admin_allowed_emails');
      } else {
        console.log('   ❌ RLS n\'est pas activé sur admin_allowed_emails');
        allChecksPassed = false;
      }
    }

    // Vérifier les policies
    const policiesCheck = await pool.query(`
      SELECT cmd, COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_allowed_emails'
      GROUP BY cmd
      ORDER BY cmd;
    `);

    const expectedPolicies = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    const existingPolicies = policiesCheck.rows.map((row: any) => row.cmd);

    console.log('\n   Policies existantes:');
    policiesCheck.rows.forEach((row: any) => {
      console.log(`   - ${row.cmd}: ${row.count} policy(s)`);
    });

    expectedPolicies.forEach((cmd) => {
      if (existingPolicies.includes(cmd)) {
        console.log(`   ✅ Policy ${cmd} présente`);
      } else {
        console.log(`   ❌ Policy ${cmd} manquante`);
        allChecksPassed = false;
      }
    });

    // ========================================================================
    // VÉRIFICATION 3: Enum offer_status
    // ========================================================================
    console.log('\n📋 Vérification 3: Enum offer_status');
    console.log('─'.repeat(60));

    const enumCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'offer_status'
      ) AS enum_exists;
    `);

    const enumExists = enumCheck.rows[0].enum_exists;

    if (!enumExists) {
      console.log('   ❌ Enum offer_status n\'existe pas');
      allChecksPassed = false;
    } else {
      console.log('   ✅ Enum offer_status existe');

      // Vérifier les valeurs de l'enum
      const enumValuesCheck = await pool.query(`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'offer_status')
        ORDER BY enumsortorder;
      `);

      const expectedValues = ['draft', 'sent', 'accepted', 'rejected'];
      const existingValues = enumValuesCheck.rows.map((row: any) => row.enumlabel);

      console.log('\n   Valeurs de l\'enum:');
      existingValues.forEach((value) => {
        console.log(`   - ${value}`);
      });

      expectedValues.forEach((value) => {
        if (existingValues.includes(value)) {
          console.log(`   ✅ Valeur "${value}" présente`);
        } else {
          console.log(`   ❌ Valeur "${value}" manquante`);
          allChecksPassed = false;
        }
      });
    }

    // ========================================================================
    // RÉSUMÉ
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    if (allChecksPassed) {
      console.log('✅ Toutes les vérifications ont réussi !');
      console.log('   Les corrections de l\'audit ont été correctement appliquées.');
    } else {
      console.log('❌ Certaines vérifications ont échoué.');
      console.log('   Veuillez vérifier les points marqués ci-dessus.');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la vérification:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await pool.end();
  }

  process.exit(allChecksPassed ? 0 : 1);
}

verifyAuditCorrections().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});


