/**
 * Script pour ajouter thier0811@gmail.com en admin si ce n'est pas déjà le cas
 * 
 * Utilise la fonction addAdminAllowedEmail existante pour garantir la cohérence
 * 
 * Usage: 
 *   npx tsx scripts/add-admin-email.ts [org_id]
 *   ou
 *   tsx scripts/add-admin-email.ts [org_id]
 */

// Charge les variables d'environnement depuis .env.local ou .env
import { config } from 'dotenv';
import { resolve } from 'path';

// Essaie de charger .env.local d'abord, puis .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { addAdminAllowedEmail, listAdminAllowedEmails } from '../src/lib/db/queries/adminAllowedEmails';
import { getRequiredDefaultOrgId } from '../src/lib/config/org';

const EMAIL = 'thier0811@gmail.com';
const NORMALIZED_EMAIL = EMAIL.trim().toLowerCase();

async function main() {
  try {
    // Vérifie que DATABASE_URL est configuré
    if (!process.env.DATABASE_URL) {
      console.error('\n❌ Erreur: DATABASE_URL n\'est pas défini.');
      console.error('   Assurez-vous d\'avoir un fichier .env.local ou .env avec:');
      console.error('   DATABASE_URL=postgresql://user:password@host:port/database\n');
      process.exit(1);
    }

    // Récupère l'org_id depuis les arguments ou depuis la config
    const orgIdArg = process.argv[2];
    let orgId: string;

    if (orgIdArg) {
      orgId = orgIdArg;
      console.log(`📋 Utilisation de l'org_id fourni: ${orgId}`);
    } else {
      // Utilise DEFAULT_ORG_ID depuis les variables d'environnement
      try {
        orgId = getRequiredDefaultOrgId();
        console.log(`✅ Utilisation de DEFAULT_ORG_ID: ${orgId}`);
      } catch (error) {
        // Essaie de récupérer depuis les admins existants via une requête directe
        try {
          const { db } = await import('../src/lib/db/index');
          const { admin_allowed_emails } = await import('../src/lib/db/schema');
          const existingAdmins = await db.select({ org_id: admin_allowed_emails.org_id })
            .from(admin_allowed_emails)
            .limit(1);
          
          if (existingAdmins.length > 0 && existingAdmins[0].org_id) {
            orgId = existingAdmins[0].org_id;
            console.log(`✅ Org ID trouvé depuis les admins existants: ${orgId}`);
          } else {
            orgId = 'default-org-id';
            console.warn(`⚠️  DEFAULT_ORG_ID non configuré et aucun admin existant, utilisation de: ${orgId}`);
            console.warn(`   Pour spécifier un org_id, utilisez: npm run add-admin VOTRE_ORG_ID`);
          }
        } catch (dbError) {
          orgId = 'default-org-id';
          console.warn(`⚠️  Utilisation de l'org_id par défaut: ${orgId}`);
          console.warn(`   Pour spécifier un org_id, utilisez: npm run add-admin VOTRE_ORG_ID`);
        }
      }
    }

    if (!orgId || orgId === 'default-org-id') {
      console.warn('\n⚠️  ATTENTION: Vous utilisez "default-org-id" comme org_id.');
      console.warn('   Assurez-vous que c\'est bien votre org_id réel.\n');
    }

    // Vérifie si l'email existe déjà
    try {
      const existingAdmins = await listAdminAllowedEmails(orgId);
      const exists = existingAdmins.some(admin => admin.email.toLowerCase() === NORMALIZED_EMAIL);
      
      if (exists) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour org_id ${orgId}`);
        const admin = existingAdmins.find(a => a.email.toLowerCase() === NORMALIZED_EMAIL);
        if (admin) {
          console.log(`   ID: ${admin.id}`);
          console.log(`   Créé le: ${admin.created_at}`);
        }
        return;
      }
    } catch (error) {
      // Continue si la vérification échoue (table peut ne pas exister)
      console.log('ℹ️  Vérification des admins existants ignorée, création directe...');
    }

    // Récupère un created_by existant ou utilise 'system'
    let createdBy = 'system';
    try {
      const existingAdmins = await listAdminAllowedEmails(orgId);
      if (existingAdmins.length > 0) {
        createdBy = existingAdmins[0].created_by;
      }
    } catch (error) {
      // Ignore si pas d'admins existants
    }

    // Ajoute l'email en admin
    const newAdmin = await addAdminAllowedEmail(orgId, NORMALIZED_EMAIL, createdBy);
    
    console.log(`\n✅ Email ${NORMALIZED_EMAIL} ajouté en admin avec succès!`);
    console.log(`   ID: ${newAdmin.id}`);
    console.log(`   Org ID: ${orgId}`);
    console.log(`   Créé par: ${newAdmin.created_by}`);
    console.log(`   Créé le: ${newAdmin.created_at}\n`);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('déjà autorisé') || error.message.includes('unique') || error.message.includes('duplicate')) {
        console.log(`✅ L'email ${NORMALIZED_EMAIL} est déjà admin pour cet org_id`);
      } else {
        console.error('\n❌ Erreur lors de l\'ajout de l\'admin:');
        console.error(`   ${error.message}\n`);
        
        if (error.message.includes('DATABASE_URL') || error.message.includes('Missing required environment variable')) {
          console.error('💡 La variable d\'environnement DATABASE_URL n\'est pas définie.');
          console.error('   Assurez-vous d\'avoir un fichier .env.local ou .env avec:');
          console.error('   DATABASE_URL=postgresql://...\n');
          console.error('   Le script charge automatiquement .env.local puis .env\n');
        } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
          console.error('💡 La table admin_allowed_emails n\'existe peut-être pas encore.');
          console.error('   Exécutez d\'abord les migrations Drizzle: npm run db:migrate\n');
        }
        process.exit(1);
      }
    } else {
      console.error('\n❌ Erreur inconnue:', error);
      process.exit(1);
    }
  }
}

main();

