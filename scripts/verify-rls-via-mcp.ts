/**
 * Script pour vérifier les RLS policies via API Supabase REST
 * Utilise l'API REST Supabase pour contourner les limitations de MCP Supabase
 * 
 * Ce script :
 * 1. Teste l'accès aux tables avec différentes clés API
 * 2. Détecte si RLS bloque les requêtes
 * 3. Compare avec les résultats attendus
 * 
 * Usage:
 *   npx tsx scripts/verify-rls-via-mcp.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

interface RLSTestResult {
  table: string;
  serviceRoleAccess: boolean;
  anonKeyAccess: boolean;
  rlsLikelyEnabled: boolean;
  policiesCount?: number;
}

async function testRLSAccess(table: string, supabaseUrl: string, serviceKey: string, anonKey: string): Promise<RLSTestResult> {
  const url = `${supabaseUrl}/rest/v1/${table}?limit=1&select=*`;
  
  // Test avec service_role (bypass RLS)
  const serviceResponse = await fetch(url, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  });

  // Test avec anon_key (soumis à RLS)
  const anonResponse = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
  });

  const serviceRoleAccess = serviceResponse.ok;
  const anonKeyAccess = anonResponse.ok;
  
  // Si service_role fonctionne mais anon_key échoue → RLS probablement activé
  // Si les deux fonctionnent → RLS peut être désactivé ou policy permissive
  // Si les deux échouent → Problème de connexion ou table n'existe pas
  const rlsLikelyEnabled = serviceRoleAccess && !anonKeyAccess;

  return {
    table,
    serviceRoleAccess,
    anonKeyAccess,
    rlsLikelyEnabled,
  };
}

async function verifyRLSViaAPI() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes.');
    process.exit(1);
  }

  console.log('🔍 Vérification des RLS via API Supabase REST...\n');
  console.log(`📋 URL: ${supabaseUrl}\n`);

  const tables = ['clients', 'templates', 'offers', 'admin_allowed_emails'];
  const results: RLSTestResult[] = [];

  for (const table of tables) {
    console.log(`📊 Table: ${table}`);
    console.log('─'.repeat(60));
    
    try {
      const result = await testRLSAccess(table, supabaseUrl, supabaseServiceKey, supabaseAnonKey);
      results.push(result);
      
      console.log(`   Service Role (bypass RLS): ${result.serviceRoleAccess ? '✅ Accès OK' : '❌ Accès refusé'}`);
      console.log(`   Anon Key (soumis à RLS): ${result.anonKeyAccess ? '✅ Accès OK' : '❌ Accès refusé'}`);
      console.log(`   RLS probablement activé: ${result.rlsLikelyEnabled ? '✅ Oui' : '❌ Non'}`);
      
      if (result.serviceRoleAccess && !result.anonKeyAccess) {
        console.log(`   ✅ RLS fonctionne correctement (bloque anon, permet service_role)`);
      } else if (result.serviceRoleAccess && result.anonKeyAccess) {
        console.log(`   ⚠️  RLS peut être désactivé ou policy très permissive`);
      } else if (!result.serviceRoleAccess) {
        console.log(`   ❌ Problème de connexion ou table n'existe pas`);
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('');
  }

  console.log('─'.repeat(60));
  console.log('\n📋 Résumé:');
  console.log('─'.repeat(60));
  
  const rlsEnabledCount = results.filter(r => r.rlsLikelyEnabled).length;
  console.log(`   Tables avec RLS activé: ${rlsEnabledCount}/${tables.length}`);
  
  results.forEach(r => {
    const status = r.rlsLikelyEnabled ? '✅' : '⚠️';
    console.log(`   ${status} ${r.table}: RLS ${r.rlsLikelyEnabled ? 'activé' : 'désactivé ou permissif'}`);
  });

  console.log('\n⚠️  LIMITATION: L\'API REST ne peut pas lire directement les policies RLS.');
  console.log('   Pour une inspection complète, exécutez:');
  console.log('   scripts/list-all-rls-policies.sql dans Supabase SQL Editor\n');
}

verifyRLSViaAPI().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});

