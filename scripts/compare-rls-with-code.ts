/**
 * Script pour comparer les résultats RLS de la DB avec les attentes du code
 * 
 * Ce script compare :
 * - Les résultats que vous avez fournis (policies dupliquées)
 * - Les attentes selon la migration 0002_enable_rls.sql
 * - Le schéma Drizzle
 * 
 * Usage:
 *   npx tsx scripts/compare-rls-with-code.ts
 */

interface ActualRLSState {
  tablename: string;
  select_policies: number;
  insert_policies: number;
  update_policies: number;
  delete_policies: number;
  total_policies: number;
  status: string;
}

interface ExpectedRLSState {
  tablename: string;
  select_policies: number;
  insert_policies: number;
  update_policies: number;
  delete_policies: number;
  rls_enabled: boolean;
  policy_names: {
    select: string;
    insert: string;
    update: string;
    delete: string;
  };
}

// Résultats réels que vous avez fournis
const actualResults: ActualRLSState[] = [
  {
    tablename: "clients",
    select_policies: 2,
    insert_policies: 2,
    update_policies: 1,
    delete_policies: 1,
    total_policies: 6,
    status: "⚠️ Policies manquantes"
  },
  {
    tablename: "offers",
    select_policies: 2,
    insert_policies: 2,
    update_policies: 1,
    delete_policies: 1,
    total_policies: 6,
    status: "⚠️ Policies manquantes"
  },
  {
    tablename: "templates",
    select_policies: 2,
    insert_policies: 1,
    update_policies: 1,
    delete_policies: 1,
    total_policies: 5,
    status: "⚠️ Policies manquantes"
  }
];

// Attentes selon migration 0002_enable_rls.sql
const expectedStates: ExpectedRLSState[] = [
  {
    tablename: "clients",
    select_policies: 1,
    insert_policies: 1,
    update_policies: 1,
    delete_policies: 1,
    rls_enabled: true,
    policy_names: {
      select: "Users can view clients from their organization",
      insert: "Users can insert clients for their organization",
      update: "Users can update clients from their organization",
      delete: "Users can delete clients from their organization"
    }
  },
  {
    tablename: "templates",
    select_policies: 1,
    insert_policies: 1,
    update_policies: 1,
    delete_policies: 1,
    rls_enabled: true,
    policy_names: {
      select: "Users can view templates from their organization",
      insert: "Users can insert templates for their organization",
      update: "Users can update templates from their organization",
      delete: "Users can delete templates from their organization"
    }
  },
  {
    tablename: "offers",
    select_policies: 1,
    insert_policies: 1,
    update_policies: 1,
    delete_policies: 1,
    rls_enabled: true,
    policy_names: {
      select: "Users can view offers from their organization",
      insert: "Users can insert offers for their organization",
      update: "Users can update offers from their organization",
      delete: "Users can delete offers from their organization"
    }
  },
  {
    tablename: "admin_allowed_emails",
    select_policies: 0,
    insert_policies: 0,
    update_policies: 0,
    delete_policies: 0,
    rls_enabled: false, // RLS non activé dans migration 0007
    policy_names: {
      select: "",
      insert: "",
      update: "",
      delete: ""
    }
  }
];

function compareRLSStates() {
  console.log('🔍 Comparaison RLS DB réelle ↔ Code (migration 0002_enable_rls.sql)\n');
  console.log('═'.repeat(80));
  console.log('');

  // Créer un map des résultats réels
  const actualMap = new Map<string, ActualRLSState>();
  actualResults.forEach(r => actualMap.set(r.tablename, r));

  expectedStates.forEach(expected => {
    const actual = actualMap.get(expected.tablename);
    
    console.log(`📊 Table: ${expected.tablename}`);
    console.log('─'.repeat(80));
    
    if (!actual) {
      console.log(`   ⚠️  Pas de données réelles pour cette table`);
      console.log(`   Attendu: ${expected.select_policies} SELECT, ${expected.insert_policies} INSERT, ${expected.update_policies} UPDATE, ${expected.delete_policies} DELETE`);
      console.log('');
      return;
    }

    // Comparer chaque type de policy
    const selectMatch = actual.select_policies === expected.select_policies;
    const insertMatch = actual.insert_policies === expected.insert_policies;
    const updateMatch = actual.update_policies === expected.update_policies;
    const deleteMatch = actual.delete_policies === expected.delete_policies;

    console.log(`   SELECT:  ${selectMatch ? '✅' : '❌'} ${actual.select_policies} (attendu: ${expected.select_policies}) ${!selectMatch ? `→ ${actual.select_policies - expected.select_policies} doublon(s)` : ''}`);
    console.log(`   INSERT:  ${insertMatch ? '✅' : '❌'} ${actual.insert_policies} (attendu: ${expected.insert_policies}) ${!insertMatch ? `→ ${actual.insert_policies - expected.insert_policies} doublon(s)` : ''}`);
    console.log(`   UPDATE:  ${updateMatch ? '✅' : '❌'} ${actual.update_policies} (attendu: ${expected.update_policies})`);
    console.log(`   DELETE:  ${deleteMatch ? '✅' : '❌'} ${actual.delete_policies} (attendu: ${expected.delete_policies})`);
    console.log(`   Total:   ${actual.total_policies} policies (attendu: ${expected.select_policies + expected.insert_policies + expected.update_policies + expected.delete_policies})`);

    if (!selectMatch || !insertMatch || !updateMatch || !deleteMatch) {
      console.log(`   ⚠️  ÉCARTS DÉTECTÉS:`);
      if (!selectMatch) {
        console.log(`      - SELECT: ${actual.select_policies - expected.select_policies} policy(s) en trop`);
      }
      if (!insertMatch) {
        console.log(`      - INSERT: ${actual.insert_policies - expected.insert_policies} policy(s) en trop`);
      }
      if (!updateMatch) {
        console.log(`      - UPDATE: ${actual.update_policies - expected.update_policies} ${actual.update_policies > expected.update_policies ? 'en trop' : 'manquante(s)'}`);
      }
      if (!deleteMatch) {
        console.log(`      - DELETE: ${actual.delete_policies - expected.delete_policies} ${actual.delete_policies > expected.delete_policies ? 'en trop' : 'manquante(s)'}`);
      }
    }

    console.log('');
  });

  // Résumé des problèmes
  console.log('═'.repeat(80));
  console.log('📋 Résumé des problèmes détectés:');
  console.log('═'.repeat(80));
  console.log('');

  const problems: string[] = [];

  actualResults.forEach(actual => {
    const expected = expectedStates.find(e => e.tablename === actual.tablename);
    if (!expected) return;

    if (actual.select_policies > expected.select_policies) {
      problems.push(`${actual.tablename}: ${actual.select_policies - expected.select_policies} policy SELECT en trop`);
    }
    if (actual.insert_policies > expected.insert_policies) {
      problems.push(`${actual.tablename}: ${actual.insert_policies - expected.insert_policies} policy INSERT en trop`);
    }
    if (actual.update_policies !== expected.update_policies) {
      problems.push(`${actual.tablename}: UPDATE policies ${actual.update_policies !== expected.update_policies ? 'différent' : 'OK'}`);
    }
    if (actual.delete_policies !== expected.delete_policies) {
      problems.push(`${actual.tablename}: DELETE policies ${actual.delete_policies !== expected.delete_policies ? 'différent' : 'OK'}`);
    }
  });

  if (problems.length === 0) {
    console.log('   ✅ Aucun problème détecté');
  } else {
    problems.forEach(problem => {
      console.log(`   ⚠️  ${problem}`);
    });
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('🔧 Actions recommandées:');
  console.log('═'.repeat(80));
  console.log('');
  console.log('1. Exécutez scripts/list-all-rls-policies.sql dans Supabase SQL Editor');
  console.log('   → Pour voir toutes les policies et identifier les doublons');
  console.log('');
  console.log('2. Exécutez scripts/cleanup-duplicate-rls-policies.sql');
  console.log('   → Section 1: Liste les policies à supprimer');
  console.log('   → Section 2: Décommentez pour supprimer les doublons');
  console.log('   → Section 3: Vérifie le résultat final');
  console.log('');
  console.log('3. Après nettoyage, chaque table devrait avoir exactement 4 policies:');
  console.log('   - clients: 1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE');
  console.log('   - templates: 1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE');
  console.log('   - offers: 1 SELECT, 1 INSERT, 1 UPDATE, 1 DELETE');
  console.log('');
}

compareRLSStates();


