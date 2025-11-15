#!/usr/bin/env node

/**
 * Script pour appliquer les migrations SQL directement
 * Usage: node scripts/apply-migration.js <fichier-migration.sql>
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyMigration(migrationFile) {
  const migrationPath = path.join(process.cwd(), migrationFile);
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Fichier de migration introuvable: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL n\'est pas défini dans les variables d\'environnement');
    console.error('   Définissez DATABASE_URL avant d\'exécuter ce script');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    console.log(`📦 Connexion à la base de données...`);
    await client.connect();
    console.log(`✅ Connecté à la base de données`);

    console.log(`\n📝 Application de la migration: ${migrationFile}`);
    console.log(`─────────────────────────────────────────────────────────`);
    
    await client.query(sql);
    
    console.log(`─────────────────────────────────────────────────────────`);
    console.log(`✅ Migration appliquée avec succès!\n`);
  } catch (error) {
    console.error(`\n❌ Erreur lors de l'application de la migration:`);
    console.error(error.message);
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Récupérer le fichier de migration depuis les arguments
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <fichier-migration.sql>');
  console.error('\nExemples:');
  console.error('  node scripts/apply-migration.js drizzle/0000_adapt_templates_table.sql');
  console.error('  node scripts/apply-migration.js drizzle/0005_add_templates_org_id_slug_unique.sql');
  process.exit(1);
}

applyMigration(migrationFile).catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
