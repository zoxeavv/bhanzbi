/**
 * Script de test pour vérifier la configuration MCP Supabase
 * 
 * Ce script teste si MCP Supabase est correctement configuré et accessible.
 * 
 * Usage:
 *   npx tsx scripts/test-mcp-supabase.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function testSupabaseConnection() {
  console.log('🔍 Test de connexion Supabase...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Vérifier les variables d'environnement
  console.log('📋 Vérification des variables d\'environnement:');
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Défini' : '❌ Manquant'}`);
  console.log(`   NEXT_SUPABASE_ROLE_KEY: ${supabaseServiceKey ? '✅ Défini' : '❌ Manquant'}\n`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes.');
    console.error('   Assurez-vous d\'avoir configuré NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local\n');
    process.exit(1);
  }

  // Extraire le project_ref de l'URL
  const projectRefMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = projectRefMatch ? projectRefMatch[1] : null;

  console.log('📋 Informations du projet:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Project Reference: ${projectRef || '❌ Non détecté'}\n`);

  // Test 1: Vérifier l'accessibilité de l'API REST
  console.log('🧪 Test 1: Accessibilité de l\'API REST Supabase...');
  try {
    const healthCheckUrl = `${supabaseUrl}/rest/v1/`;
    const response = await fetch(healthCheckUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    if (response.ok) {
      console.log('   ✅ API REST accessible\n');
    } else {
      console.log(`   ⚠️  API REST répond avec le statut: ${response.status}\n`);
    }
  } catch (error) {
    console.error(`   ❌ Erreur de connexion: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 2: Vérifier l'existence des tables
  console.log('🧪 Test 2: Vérification des tables...');
  const tables = ['clients', 'templates', 'offers', 'admin_allowed_emails'];

  for (const table of tables) {
    try {
      const tableUrl = `${supabaseUrl}/rest/v1/${table}?limit=1&select=*`;
      const response = await fetch(tableUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Table "${table}" existe (${Array.isArray(data) ? data.length : '?'} lignes)`);
      } else if (response.status === 404) {
        console.log(`   ⚠️  Table "${table}" n'existe pas ou n'est pas accessible`);
      } else {
        console.log(`   ⚠️  Table "${table}" répond avec le statut: ${response.status}`);
      }
    } catch (error) {
      console.error(`   ❌ Erreur lors de la vérification de "${table}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  console.log('');

  // Test 3: Vérifier les colonnes d'une table (clients)
  console.log('🧪 Test 3: Vérification du schéma de la table "clients"...');
  try {
    const schemaUrl = `${supabaseUrl}/rest/v1/clients?limit=0&select=*`;
    const response = await fetch(schemaUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    if (response.ok) {
      // Essayer de lire une ligne pour voir les colonnes
      const dataUrl = `${supabaseUrl}/rest/v1/clients?limit=1&select=*`;
      const dataResponse = await fetch(dataUrl, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });

      if (dataResponse.ok) {
        const data = await dataResponse.json();
        if (Array.isArray(data) && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   ✅ Colonnes détectées: ${columns.join(', ')}`);
          
          // Vérifier la présence de org_id
          if (columns.includes('org_id')) {
            console.log('   ✅ Colonne "org_id" présente');
          } else {
            console.log('   ⚠️  Colonne "org_id" absente');
          }
        } else {
          console.log('   ⚠️  Table vide, impossible de détecter les colonnes');
        }
      }
    } else {
      console.log(`   ⚠️  Impossible d'accéder au schéma (statut: ${response.status})`);
    }
  } catch (error) {
    console.error(`   ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  console.log('');

  // Instructions pour MCP
  console.log('📋 Configuration MCP Supabase:');
  console.log('   Pour utiliser MCP Supabase dans Cursor, configurez:');
  console.log('');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "supabase": {');
  console.log(`         "url": "https://mcp.supabase.com/mcp",`);
  if (projectRef) {
    console.log(`         "project_ref": "${projectRef}",`);
  }
  console.log('         "read_only": true');
  console.log('       }');
  console.log('     }');
  console.log('   }');
  console.log('');
  console.log('   Voir docs/MCP_SUPABASE_SETUP.md pour plus de détails.\n');

  console.log('✅ Tests terminés\n');
}

testSupabaseConnection().catch((error) => {
  console.error('\n❌ Erreur lors des tests:', error);
  process.exit(1);
});

