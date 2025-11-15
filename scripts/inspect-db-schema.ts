/**
 * Script pour inspecter le schéma réel de la base de données via API REST Supabase
 * 
 * Ce script utilise l'API REST Supabase pour inspecter le schéma et comparer avec Drizzle.
 * 
 * Usage:
 *   npx tsx scripts/inspect-db-schema.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function inspectSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Variables d\'environnement Supabase manquantes.');
    process.exit(1);
  }

  console.log('🔍 Inspection du schéma de la base de données Supabase...\n');
  console.log(`📋 URL: ${supabaseUrl}\n`);

  const tables = ['clients', 'templates', 'offers', 'admin_allowed_emails'];

  for (const table of tables) {
    console.log(`\n📊 Table: ${table}`);
    console.log('─'.repeat(60));

    try {
      // Essayer de lire une ligne pour voir la structure
      const url = `${supabaseUrl}/rest/v1/${table}?limit=1&select=*`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   Colonnes détectées (${columns.length}):`);
          columns.forEach(col => {
            const value = data[0][col];
            const type = typeof value;
            const isNull = value === null;
            console.log(`   - ${col}: ${type}${isNull ? ' (NULL)' : ''}`);
          });
        } else {
          console.log(`   ✅ Table existe mais est vide`);
          
          // Essayer d'obtenir les métadonnées via une requête HEAD ou OPTIONS
          // Note: L'API REST Supabase ne fournit pas directement le schéma,
          // mais on peut essayer d'insérer une ligne de test (puis la supprimer)
          // ou utiliser l'API PostgREST pour obtenir les métadonnées
          console.log(`   ⚠️  Impossible de détecter les colonnes (table vide)`);
        }
      } else {
        const errorText = await response.text();
        if (response.status === 404) {
          console.log(`   ❌ Table n'existe pas`);
        } else if (response.status === 401 || response.status === 403) {
          console.log(`   ⚠️  Accès refusé (RLS ou permissions)`);
        } else {
          console.log(`   ⚠️  Erreur ${response.status}: ${errorText.substring(0, 100)}`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Erreur: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  console.log('\n\n📋 Pour une inspection complète du schéma, exécutez le SQL suivant dans Supabase SQL Editor:');
  console.log('   Voir: scripts/inspect-db-schema.sql\n');
}

inspectSchema().catch((error) => {
  console.error('\n❌ Erreur:', error);
  process.exit(1);
});


