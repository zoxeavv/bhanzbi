/**
 * Script pour ajouter thier0811@gmail.com en admin via MCP Supabase
 * 
 * Ce script :
 * 1. Crée/modifie la table admin_allowed_emails si nécessaire via API REST
 * 2. Crée l'enregistrement via MCP Supabase
 * 
 * Usage: 
 *   npx tsx scripts/add-admin-email-mcp.ts [org_id]
 */

// Charge les variables d'environnement
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const EMAIL = 'thier0811@gmail.com';
const NORMALIZED_EMAIL = EMAIL.trim().toLowerCase();

function showSQLInstructions(): void {
  console.error('\n📋 Exécutez le SQL suivant dans Supabase Dashboard (SQL Editor):\n');
  console.error('-- Créer/modifier la table admin_allowed_emails');
  console.error('CREATE TABLE IF NOT EXISTS admin_allowed_emails (');
  console.error('  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),');
  console.error('  org_id TEXT NOT NULL,');
  console.error('  email TEXT NOT NULL,');
  console.error('  created_by TEXT NOT NULL,');
  console.error('  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),');
  console.error('  used_at TIMESTAMPTZ');
  console.error(');');
  console.error('');
  console.error('-- Ajouter org_id si la colonne n\'existe pas');
  console.error('DO $$');
  console.error('BEGIN');
  console.error('  IF NOT EXISTS (');
  console.error('    SELECT 1 FROM information_schema.columns');
  console.error('    WHERE table_schema = \'public\'');
  console.error('    AND table_name = \'admin_allowed_emails\'');
  console.error('    AND column_name = \'org_id\'');
  console.error('  ) THEN');
  console.error('    ALTER TABLE admin_allowed_emails ADD COLUMN org_id TEXT;');
  console.error('    UPDATE admin_allowed_emails SET org_id = \'default-org-id\' WHERE org_id IS NULL;');
  console.error('    ALTER TABLE admin_allowed_emails ALTER COLUMN org_id SET NOT NULL;');
  console.error('  END IF;');
  console.error('END $$;');
  console.error('');
  console.error('-- Ajouter email si la colonne n\'existe pas');
  console.error('DO $$');
  console.error('BEGIN');
  console.error('  IF NOT EXISTS (');
  console.error('    SELECT 1 FROM information_schema.columns');
  console.error('    WHERE table_schema = \'public\'');
  console.error('    AND table_name = \'admin_allowed_emails\'');
  console.error('    AND column_name = \'email\'');
  console.error('  ) THEN');
  console.error('    ALTER TABLE admin_allowed_emails ADD COLUMN email TEXT;');
  console.error('    ALTER TABLE admin_allowed_emails ALTER COLUMN email SET NOT NULL;');
  console.error('  END IF;');
  console.error('END $$;');
  console.error('');
  console.error('-- Ajouter created_by si la colonne n\'existe pas');
  console.error('DO $$');
  console.error('BEGIN');
  console.error('  IF NOT EXISTS (');
  console.error('    SELECT 1 FROM information_schema.columns');
  console.error('    WHERE table_schema = \'public\'');
  console.error('    AND table_name = \'admin_allowed_emails\'');
  console.error('    AND column_name = \'created_by\'');
  console.error('  ) THEN');
  console.error('    ALTER TABLE admin_allowed_emails ADD COLUMN created_by TEXT;');
  console.error('    UPDATE admin_allowed_emails SET created_by = \'system\' WHERE created_by IS NULL;');
  console.error('    ALTER TABLE admin_allowed_emails ALTER COLUMN created_by SET NOT NULL;');
  console.error('  END IF;');
  console.error('END $$;');
  console.error('');
  console.error('-- Créer l\'index unique');
  console.error('CREATE UNIQUE INDEX IF NOT EXISTS admin_allowed_emails_org_id_email_unique');
  console.error('ON admin_allowed_emails(org_id, email);');
  console.error('');
}

async function main() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.NEXT_SUPABASE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error('❌ NEXT_PUBLIC_SUPABASE_URL n\'est pas défini dans .env.local');
      process.exit(1);
    }

    if (!supabaseServiceKey) {
      console.error('❌ NEXT_SUPABASE_ROLE_KEY ou SUPABASE_SERVICE_ROLE_KEY n\'est pas défini dans .env.local');
      process.exit(1);
    }

    // Récupère l'org_id depuis les arguments ou depuis la config
    const orgIdArg = process.argv[2];
    let orgId: string = orgIdArg || process.env.DEFAULT_ORG_ID || 'default-org-id';

    if (orgId === 'default-org-id') {
      console.warn('⚠️  Utilisation de "default-org-id" comme org_id.');
      console.warn('   Pour spécifier un org_id: npx tsx scripts/add-admin-email-mcp.ts VOTRE_ORG_ID\n');
    } else {
      console.log(`📋 Utilisation de l'org_id: ${orgId}\n`);
    }

    // Note: L'API REST Supabase ne permet pas d'exécuter du SQL arbitraire
    // La table doit être créée/modifiée manuellement dans Supabase Dashboard
    // Le script vérifiera si la table a les bonnes colonnes en essayant de créer l'enregistrement

    // Étape 2: Vérifier si l'email existe déjà via API REST
    console.log('🔍 Vérification si l\'email existe déjà...');
    const checkUrl = `${supabaseUrl}/rest/v1/admin_allowed_emails?org_id=eq.${orgId}&email=eq.${NORMALIZED_EMAIL}&select=*`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (checkResponse.ok) {
      const existing = await checkResponse.json();
      if (Array.isArray(existing) && existing.length > 0) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour org_id ${orgId}`);
        console.log(`   ID: ${existing[0].id}`);
        console.log(`   Créé le: ${existing[0].created_at}\n`);
        return;
      }
    }

    // Étape 3: Créer l'enregistrement via API REST (équivalent à MCP)
    console.log(`📝 Création de l'enregistrement pour ${NORMALIZED_EMAIL}...`);
    const createUrl = `${supabaseUrl}/rest/v1/admin_allowed_emails`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        org_id: orgId,
        email: NORMALIZED_EMAIL,
        created_by: 'script-mcp',
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      
      if (errorText.includes('duplicate') || errorText.includes('unique') || createResponse.status === 409) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour cet org_id\n`);
        return;
      }

      // Si c'est une erreur de colonne manquante, afficher les instructions SQL
      if (errorText.includes('PGRST204') || errorText.includes('column') || errorText.includes('Could not find') || errorText.includes('org_id')) {
        console.error('❌ La table admin_allowed_emails n\'a pas les colonnes attendues.');
        showSQLInstructions();
        process.exit(1);
      }

      // Si la table n'existe pas
      if (errorText.includes('relation') || errorText.includes('does not exist') || createResponse.status === 404) {
        console.error('❌ La table admin_allowed_emails n\'existe pas encore.');
        showSQLInstructions();
        process.exit(1);
      }

      throw new Error(`Erreur lors de la création: ${createResponse.status} - ${errorText}`);
    }

    const newAdmin = await createResponse.json();
    const admin = Array.isArray(newAdmin) ? newAdmin[0] : newAdmin;
    
    console.log(`\n✅ Email ${NORMALIZED_EMAIL} ajouté en admin avec succès!`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Org ID: ${admin.org_id}`);
    console.log(`   Créé par: ${admin.created_by}`);
    console.log(`   Créé le: ${admin.created_at}\n`);

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

