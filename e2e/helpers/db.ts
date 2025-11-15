import { Pool } from 'pg';

/**
 * Helper pour réinitialiser la DB de test entre les tests
 * 
 * Note: Adaptez selon votre structure DB et vos besoins de test.
 * Pour l'instant, on nettoie seulement les données de test.
 */

const DATABASE_URL = process.env.DATABASE_URL;
const TEST_ORG_ID = process.env.E2E_TEST_ORG_ID || 'org_test_e2e';

let pool: Pool | null = null;

/**
 * Obtenir une connexion à la DB
 */
function getPool(): Pool {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required for E2E tests');
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
    });
  }
  
  return pool;
}

/**
 * Nettoyer les données de test de la DB
 * 
 * Supprime toutes les données créées par les tests E2E pour l'org de test.
 */
export async function cleanupTestData() {
  const db = getPool();
  
  try {
    // Supprimer dans l'ordre des dépendances (offers -> templates -> clients)
    await db.query('DELETE FROM offers WHERE org_id = $1', [TEST_ORG_ID]);
    await db.query('DELETE FROM templates WHERE org_id = $1', [TEST_ORG_ID]);
    await db.query('DELETE FROM clients WHERE org_id = $1', [TEST_ORG_ID]);
  } catch (error) {
    console.error('[E2E DB Helper] Error cleaning up test data:', error);
    throw error;
  }
}

/**
 * Créer des données de seed pour les tests
 * 
 * Crée quelques templates de base pour les tests de listing.
 */
export async function seedTestData() {
  const db = getPool();
  
  try {
    // Créer quelques templates de test
    const templates = [
      {
        title: 'Template Test 1',
        slug: 'template-test-1',
        content: JSON.stringify({ fields: [{ field_name: 'test1', field_type: 'text' }] }),
      },
      {
        title: 'Template Test 2',
        slug: 'template-test-2',
        content: JSON.stringify({ fields: [{ field_name: 'test2', field_type: 'number' }] }),
      },
      {
        title: 'Template Test 3',
        slug: 'template-test-3',
        content: JSON.stringify({ fields: [{ field_name: 'test3', field_type: 'date' }] }),
      },
    ];
    
    for (const template of templates) {
      await db.query(
        `INSERT INTO templates (org_id, title, slug, content, category, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (org_id, slug) DO NOTHING`,
        [TEST_ORG_ID, template.title, template.slug, template.content, '', '[]']
      );
    }
  } catch (error) {
    console.error('[E2E DB Helper] Error seeding test data:', error);
    throw error;
  }
}

/**
 * Créer un client de test
 * 
 * @returns L'ID du client créé
 */
export async function createTestClient(): Promise<string> {
  const db = getPool();
  
  try {
    const result = await db.query(
      `INSERT INTO clients (org_id, name, company, email, phone, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id`,
      [
        TEST_ORG_ID,
        'Client Test E2E',
        'Test Company',
        'test-client@example.com',
        '0123456789',
        '[]',
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('[E2E DB Helper] Error creating test client:', error);
    throw error;
  }
}

/**
 * Obtenir le premier client de test (ou en créer un si aucun n'existe)
 * 
 * @returns L'ID du client
 */
export async function getOrCreateTestClient(): Promise<string> {
  const db = getPool();
  
  try {
    // Chercher un client existant
    const existing = await db.query(
      `SELECT id FROM clients WHERE org_id = $1 LIMIT 1`,
      [TEST_ORG_ID]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    
    // Sinon, créer un nouveau client
    return await createTestClient();
  } catch (error) {
    console.error('[E2E DB Helper] Error getting or creating test client:', error);
    throw error;
  }
}

/**
 * Fermer la connexion à la DB
 */
export async function closeDbConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}


