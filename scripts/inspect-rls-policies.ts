/**
 * Script pour inspecter les RLS (Row Level Security) policies via API Supabase
 * 
 * Ce script utilise l'API REST Supabase avec service_role pour contourner RLS
 * et vérifier l'état des policies RLS.
 * 
 * Usage:
 *   npx tsx scripts/inspect-rls-policies.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface RLSCheckResult {
  table: string;
  rlsEnabled: boolean;
  policiesCount: number;
  policies: PolicyInfo[];
}

interface PolicyInfo {
  name: string;
  operation: string;
  hasUsing: boolean;
  hasWithCheck: boolean;
  usesOrgId: boolean;
}

async function checkRLSStatus(table: string, supabaseUrl: string, serviceKey: string): Promise<RLSCheckResult> {
  // Note: L'API REST Supabase ne fournit pas directement les informations RLS
  // On peut seulement tester si RLS bloque les requêtes
  
  // Test 1: Essayer de lire sans authentification (devrait être bloqué si RLS activé)
  const anonUrl = `${supabaseUrl}/rest/v1/${table}?limit=1&select=*`;
  const anonResponse = await fetch(anonUrl, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`, // Service role bypass RLS
      'Content-Type': 'application/json',
    },
  });

  // Test 2: Essayer avec anon key (devrait être bloqué si RLS activé et pas de policy permissive)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let anonKeyResponse: Response | null = null;
  
  if (anonKey) {
    anonKeyResponse = await fetch(anonUrl, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Si service_role fonctionne mais anon_key échoue → RLS probablement activé
  const rlsEnabled = anonKeyResponse ? !anonKeyResponse.ok : null;

  return {
    table,
    rlsEnabled: rlsEnabled ?? false,
    policiesCount: 0, // Impossible de compter via API REST
    policies: [],
  };
}

async function inspectRLSPolicies() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes.');
    process.exit(1);
  }

  console.log('🔍 Inspection des RLS Policies via API Supabase...\n');
  console.log(`📋 URL: ${supabaseUrl}\n`);

  const tables = ['clients', 'templates', 'offers', 'admin_allowed_emails'];

  console.log('⚠️  LIMITATION: L\'API REST Supabase ne fournit pas directement les informations RLS.');
  console.log('   Pour une inspection complète, utilisez le script SQL:\n');
  console.log('   scripts/inspect-rls-policies.sql\n');
  console.log('   Ou exécutez-le dans Supabase SQL Editor.\n');
  console.log('─'.repeat(60));
  console.log('');

  for (const table of tables) {
    console.log(`📊 Table: ${table}`);
    console.log('─'.repeat(60));

    try {
      const result = await checkRLSStatus(table, supabaseUrl, supabaseServiceKey);
      
      console.log(`   RLS Status: ${result.rlsEnabled !== null ? (result.rlsEnabled ? '✅ Probablement activé' : '❌ Probablement désactivé') : '❓ Impossible à déterminer'}`);
      console.log(`   Policies: ${result.policiesCount} (non détectable via API REST)`);
      
      // Test supplémentaire : essayer d'insérer avec anon key
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (anonKey && table === 'admin_allowed_emails') {
        // Test INSERT avec anon key (devrait échouer si RLS activé sans policy permissive)
        const testInsertUrl = `${supabaseUrl}/rest/v1/${table}`;
        const insertResponse = await fetch(testInsertUrl, {
          method: 'POST',
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            org_id: 'test-org',
            email: 'test@example.com',
            created_by: 'test-script',
          }),
        });

        if (insertResponse.status === 201) {
          console.log(`   ⚠️  INSERT avec anon key réussit → RLS peut être désactivé ou policy permissive`);
          // Nettoyer le test
          if (insertResponse.headers.get('location')) {
            const location = insertResponse.headers.get('location');
            if (location) {
              await fetch(`${supabaseUrl}${location}`, {
                method: 'DELETE',
                headers: {
                  'apikey': supabaseServiceKey,
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
              });
            }
          }
        } else if (insertResponse.status === 401 || insertResponse.status === 403) {
          console.log(`   ✅ INSERT avec anon key bloqué → RLS probablement activé`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log('\n📋 Pour une inspection complète des RLS policies:');
  console.log('   1. Exécutez scripts/inspect-rls-policies.sql dans Supabase SQL Editor');
  console.log('   2. Ou utilisez psql pour exécuter les requêtes directement\n');
}

inspectRLSPolicies().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});

