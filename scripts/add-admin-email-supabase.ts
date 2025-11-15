/**
 * Script pour ajouter thier0811@gmail.com en admin via l'API Supabase REST
 * 
 * Utilise directement l'API Supabase pour éviter les problèmes de connexion PostgreSQL
 * 
 * Usage: 
 *   npx tsx scripts/add-admin-email-supabase.ts [org_id]
 */

// Charge les variables d'environnement
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const EMAIL = 'thier0811@gmail.com';
const NORMALIZED_EMAIL = EMAIL.trim().toLowerCase();

async function main() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Supporte les deux noms de variables possibles
    const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL n\'est pas défini dans .env.local');
      process.exit(1);
    }

    if (!supabaseServiceKey) {
      console.error('❌ NEXT_SUPABASE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY n\'est pas défini dans .env.local');
      console.error('   Cette clé est nécessaire pour créer des enregistrements via l\'API REST');
      process.exit(1);
    }

    // Récupère l'org_id depuis les arguments ou depuis la config
    const orgIdArg = process.argv[2];
    let orgId: string = orgIdArg || process.env.DEFAULT_ORG_ID || 'default-org-id';

    if (orgId === 'default-org-id') {
      console.warn('⚠️  Utilisation de "default-org-id" comme org_id.');
      console.warn('   Pour spécifier un org_id: npx tsx scripts/add-admin-email-supabase.ts VOTRE_ORG_ID\n');
    } else {
      console.log(`📋 Utilisation de l'org_id: ${orgId}`);
    }

    // Vérifie si l'email existe déjà
    const checkUrl = `${supabaseUrl}/rest/v1/admin_allowed_emails?org_id=eq.${orgId}&email=eq.${NORMALIZED_EMAIL}&select=*`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!checkResponse.ok) {
      // Si la table n'existe pas, on essaie quand même de créer
      if (checkResponse.status === 404 || checkResponse.status === 400) {
        console.log('ℹ️  La table admin_allowed_emails n\'existe peut-être pas encore, tentative de création...');
      } else {
        const errorText = await checkResponse.text();
        throw new Error(`Erreur lors de la vérification: ${checkResponse.status} - ${errorText}`);
      }
    } else {
      const existing = await checkResponse.json();
      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour org_id ${orgId}`);
        console.log(`   ID: ${existing[0].id}`);
        console.log(`   Créé le: ${existing[0].created_at}`);
        return;
      }
    }

    // Utilise le schéma réel de la table admin_allowed_emails
    // Colonnes: id (auto), org_id, email, created_by, created_at (auto), used_at (nullable)
    const bodyData = {
      org_id: orgId,
      email: NORMALIZED_EMAIL,
      created_by: 'script-supabase',
    };

    console.log(`📝 Création avec colonnes: ${Object.keys(bodyData).join(', ')}`);
    const createUrl = `${supabaseUrl}/rest/v1/admin_allowed_emails`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(bodyData),
    });

    if (createResponse.ok) {
      const newAdmin = await createResponse.json();
      const admin = Array.isArray(newAdmin) ? newAdmin[0] : newAdmin;
      console.log(`\n✅ Email ${NORMALIZED_EMAIL} ajouté en admin avec succès!`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Org ID: ${admin.org_id || orgId}`);
      if (admin.created_at) console.log(`   Créé le: ${admin.created_at}`);
      if (admin.created_by) console.log(`   Créé par: ${admin.created_by}`);
      return;
    }

    const errorText = await createResponse.text();
    
    if (errorText.includes('duplicate') || errorText.includes('unique') || createResponse.status === 409) {
      console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour cet org_id`);
      return;
    }

    // Si la table n'existe pas ou si les colonnes ne correspondent pas
    if (errorText.includes('relation') || errorText.includes('does not exist') || createResponse.status === 404) {
      console.error('\n❌ La table admin_allowed_emails n\'existe pas encore.');
      console.error('\n📋 Pour créer la table, exécutez la migration SQL suivante dans Supabase Dashboard:');
      console.error('   Fichier: drizzle/0007_create_admin_allowed_emails.sql');
      console.error('\n   Ou exécutez directement dans Supabase SQL Editor:');
      console.error('   CREATE TABLE IF NOT EXISTS admin_allowed_emails (');
      console.error('     id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),');
      console.error('     org_id TEXT NOT NULL,');
      console.error('     email TEXT NOT NULL,');
      console.error('     created_by TEXT NOT NULL,');
      console.error('     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),');
      console.error('     used_at TIMESTAMPTZ');
      console.error('   );');
      console.error('   CREATE UNIQUE INDEX IF NOT EXISTS admin_allowed_emails_org_id_email_unique');
      console.error('   ON admin_allowed_emails(org_id, email);\n');
      process.exit(1);
    }

    // Si erreur de colonne manquante, la table existe mais avec un schéma différent
    if (errorText.includes('PGRST204') || errorText.includes('column') || errorText.includes('Could not find')) {
      console.error('\n❌ Erreur: La table admin_allowed_emails existe mais avec une structure différente.');
      console.error(`   Erreur: ${errorText}`);
      console.error('\n📋 Le schéma attendu est:');
      console.error('   - id (TEXT PRIMARY KEY)');
      console.error('   - org_id (TEXT NOT NULL)');
      console.error('   - email (TEXT NOT NULL)');
      console.error('   - created_by (TEXT NOT NULL)');
      console.error('   - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())');
      console.error('   - used_at (TIMESTAMPTZ nullable)');
      console.error('\n💡 Solutions:');
      console.error('   1. Vérifiez la structure de la table dans Supabase Dashboard');
      console.error('   2. Exécutez la migration drizzle/0007_create_admin_allowed_emails.sql si nécessaire');
      console.error('   3. Adaptez le script si la structure est différente intentionnellement\n');
      process.exit(1);
    }

    // Autre erreur
    throw new Error(`Erreur lors de la création: ${createResponse.status} - ${errorText}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Erreur lors de l\'ajout de l\'admin:');
      console.error(`   ${error.message}\n`);
      process.exit(1);
    } else {
      console.error('\n❌ Erreur inconnue:', error);
      process.exit(1);
    }
  }
}

main();

