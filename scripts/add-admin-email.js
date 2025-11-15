/**
 * Script pour ajouter thier0811@gmail.com en admin si ce n'est pas déjà le cas
 * 
 * Utilise Drizzle ORM pour garantir la compatibilité avec le schéma
 * 
 * Usage: node scripts/add-admin-email.js [org_id]
 */

import { db } from '../src/lib/db/index.js';
import { admin_allowed_emails } from '../src/lib/db/schema.js';
import { eq, and } from 'drizzle-orm';

const EMAIL = 'thier0811@gmail.com';
const NORMALIZED_EMAIL = EMAIL.trim().toLowerCase();

async function addAdminEmail() {
  try {
    // Récupère l'org_id depuis les arguments ou depuis les admins existants
    const orgIdArg = process.argv[2];
    let orgId = orgIdArg;

    if (!orgId) {
      // Essaie de récupérer l'org_id depuis les admins existants
      const existingAdmins = await db
        .select({ org_id: admin_allowed_emails.org_id })
        .from(admin_allowed_emails)
        .limit(1);

      if (existingAdmins.length > 0) {
        orgId = existingAdmins[0].org_id;
        console.log(`✅ Org ID trouvé depuis les admins existants: ${orgId}`);
      } else {
        // Utilise DEFAULT_ORG_ID depuis les variables d'environnement
        orgId = process.env.DEFAULT_ORG_ID || 'default-org-id';
        console.log(`⚠️  Utilisation de l'org_id par défaut: ${orgId}`);
        console.log(`   Pour spécifier un org_id différent, utilisez: node scripts/add-admin-email.js VOTRE_ORG_ID`);
      }
    }

    if (!orgId || orgId === 'default-org-id') {
      console.warn('\n⚠️  ATTENTION: Vous utilisez "default-org-id" comme org_id.');
      console.warn('   Assurez-vous que c\'est bien votre org_id réel.\n');
    }

    // Vérifie si l'email existe déjà pour cet org_id
    const existing = await db
      .select()
      .from(admin_allowed_emails)
      .where(
        and(
          eq(admin_allowed_emails.org_id, orgId),
          eq(admin_allowed_emails.email, NORMALIZED_EMAIL)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour org_id ${orgId}`);
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Créé le: ${existing[0].created_at}`);
      return;
    }

    // Récupère un created_by existant ou utilise 'system'
    let createdBy = 'system';
    try {
      const existingAdmin = await db
        .select({ created_by: admin_allowed_emails.created_by })
        .from(admin_allowed_emails)
        .limit(1);
      
      if (existingAdmin.length > 0) {
        createdBy = existingAdmin[0].created_by;
      }
    } catch (err) {
      // Ignore si pas d'admins existants
    }

    // Insère l'email en admin
    const result = await db
      .insert(admin_allowed_emails)
      .values({
        org_id: orgId,
        email: NORMALIZED_EMAIL,
        created_by: createdBy,
      })
      .returning();

    const newAdmin = result[0];
    console.log(`\n✅ Email ${NORMALIZED_EMAIL} ajouté en admin avec succès!`);
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Org ID: ${newAdmin.org_id}`);
    console.log(`   Créé par: ${newAdmin.created_by}`);
    console.log(`   Créé le: ${newAdmin.created_at}\n`);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour cet org_id`);
      } else {
        console.error('\n❌ Erreur lors de l\'ajout de l\'admin:');
        console.error(`   ${error.message}\n`);
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.error('💡 La table admin_allowed_emails n\'existe peut-être pas encore.');
          console.error('   Exécutez d\'abord les migrations Drizzle: npm run db:migrate\n');
        }
        process.exit(1);
      }
    } else {
      console.error('\n❌ Erreur inconnue:', error);
      process.exit(1);
    }
  } finally {
    // Ferme la connexion DB
    process.exit(0);
  }
}

addAdminEmail();


