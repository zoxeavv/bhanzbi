/**
 * Script pour mettre à jour l'org_id d'un utilisateur existant dans Supabase Auth
 * 
 * Ce script met à jour user_metadata.org_id pour un utilisateur existant
 * 
 * Usage: 
 *   npx tsx scripts/update-user-org-id.ts [email] [org_id]
 */

// Charge les variables d'environnement
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

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

    // Récupère l'email et org_id depuis les arguments
    const emailArg = process.argv[2];
    const orgIdArg = process.argv[3];

    if (!emailArg) {
      console.error('❌ Usage: npx tsx scripts/update-user-org-id.ts [email] [org_id]');
      console.error('   Exemple: npx tsx scripts/update-user-org-id.ts thier0811@gmail.com default-org-id');
      process.exit(1);
    }

    const email = emailArg.trim().toLowerCase();
    const orgId = orgIdArg || process.env.DEFAULT_ORG_ID || 'default-org-id';

    console.log(`🔍 Recherche de l'utilisateur: ${email}`);
    console.log(`📋 Org ID à utiliser: ${orgId}\n`);

    // Crée un client Supabase Admin
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Recherche l'utilisateur par email
    const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Erreur lors de la recherche: ${listError.message}`);
    }

    const user = usersData.users.find(u => u.email?.toLowerCase() === email);

    if (!user) {
      console.error(`❌ Utilisateur avec l'email ${email} non trouvé`);
      process.exit(1);
    }

    console.log(`✅ Utilisateur trouvé:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Org ID actuel: ${user.user_metadata?.org_id || 'non défini'}`);
    console.log(`   Rôle actuel: ${user.user_metadata?.role || 'non défini'}\n`);

    // Vérifie si l'email est dans l'allowlist pour déterminer le rôle
    const checkUrl = `${supabaseUrl}/rest/v1/admin_allowed_emails?org_id=eq.${orgId}&email=eq.${email}&select=*`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    });

    let role: string | undefined = user.user_metadata?.role;
    if (checkResponse.ok) {
      const allowedEmails = await checkResponse.json();
      if (Array.isArray(allowedEmails) && allowedEmails.length > 0 && !role) {
        role = 'ADMIN';
        console.log(`   Email trouvé dans l'allowlist, rôle ADMIN sera ajouté`);
      }
    }

    // Met à jour user_metadata avec org_id et rôle si nécessaire
    const { data: updateData, error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          org_id: orgId,
          ...(role ? { role } : {}),
        },
      }
    );

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    console.log(`✅ Utilisateur mis à jour avec succès!`);
    console.log(`   ID: ${updateData.user.id}`);
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Nouveau Org ID: ${updateData.user.user_metadata?.org_id}`);
    console.log(`   Rôle: ${updateData.user.user_metadata?.role || 'non défini'}`);
    if (role && !user.user_metadata?.role) {
      console.log(`   ✅ Rôle ADMIN ajouté car l'email est dans l'allowlist`);
    }
    console.log(`\n💡 L'utilisateur devra se déconnecter et se reconnecter pour que les changements prennent effet.\n`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('\n❌ Erreur:');
      console.error(`   ${error.message}\n`);
      process.exit(1);
    } else {
      console.error('\n❌ Erreur inconnue:', error);
      process.exit(1);
    }
  }
}

main();

