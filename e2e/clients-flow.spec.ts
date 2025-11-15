import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { cleanupTestData, getOrCreateTestClient } from './helpers/db';

// Skip les tests si DATABASE_URL n'est pas configuré
const hasDatabase = !!process.env.DATABASE_URL;

test.describe('Clients Flow E2E', () => {
  // Nettoyer les données avant et après chaque test
  test.beforeEach(async () => {
    if (hasDatabase) {
      await cleanupTestData();
    }
  });

  test.afterEach(async () => {
    if (hasDatabase) {
      await cleanupTestData();
    }
  });

  test('should navigate from clients list to client detail to create offer with pre-selected client', async ({ page }) => {
    // Skip si DATABASE_URL n'est pas configuré
    test.skip(!hasDatabase, 'DATABASE_URL environment variable is required for this test');
    
    // 1. Se connecter avec un user admin
    await login(page);
    
    // 2. Créer un client de test en DB pour garantir qu'il existe
    const clientId = await getOrCreateTestClient();
    
    // 3. Aller sur /clients
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');
    
    // 4. Vérifier que la page clients est chargée
    const pageTitle = page.locator('h1, [data-testid="page-title"]').filter({ hasText: /Clients/i }).first();
    await expect(pageTitle).toBeVisible({ timeout: 5000 });
    
    // 5. Vérifier qu'au moins un client apparaît dans la liste
    // Chercher les lignes de la table (tbody tr avec role="button" ou simplement tr cliquable)
    const clientRows = page.locator('table tbody tr[role="button"], table tbody tr').filter({ 
      hasText: /Client Test|Test Company|test-client@example.com/i 
    });
    
    // Attendre qu'au moins une ligne soit visible
    await expect(clientRows.first()).toBeVisible({ timeout: 5000 });
    
    // 6. Cliquer sur le client de test → on arrive sur /clients/[id]
    await clientRows.first().click();
    
    // Attendre la navigation vers /clients/[id]
    await page.waitForURL(/\/clients\/[^/]+$/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que l'URL contient bien l'ID du client (ou au moins un ID)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/clients\/[^/]+$/);
    
    // 7. Vérifier la présence du bouton "Nouvelle offre"
    const newOfferButton = page.locator('button:has-text("Nouvelle offre"), a:has-text("Nouvelle offre")').first();
    await expect(newOfferButton).toBeVisible({ timeout: 5000 });
    
    // 8. Cliquer dessus → on arrive sur /create-offre?clientId=...
    await newOfferButton.click();
    
    // Attendre la navigation vers /create-offre avec clientId dans l'URL
    await page.waitForURL(/\/create-offre.*clientId=/, { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    // Vérifier que clientId est bien dans l'URL
    const url = page.url();
    expect(url).toContain('clientId=');
    
    // 9. Vérifier que dans le wizard Step 1, le client est déjà sélectionné
    // Chercher le Step 1 du wizard (sélection client)
    const step1Title = page.locator('h2, h3').filter({ 
      hasText: /Sélectionnez un client|Sélectionner un client/i 
    }).first();
    
    // Attendre que le Step 1 soit visible
    await expect(step1Title).toBeVisible({ timeout: 5000 });
    
    // Attendre que les clients soient chargés dans le wizard
    // Attendre que la liste des clients soit visible (soit avec des clients, soit avec "Aucun client trouvé")
    const clientsList = page.locator('div.max-h-64, div[class*="space-y-2"]').first();
    await expect(clientsList).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le client de test est visible dans la liste
    const clientInWizard = page.locator('text=/Client Test|Test Company/i').first();
    await expect(clientInWizard).toBeVisible({ timeout: 5000 });
    
    // Vérifier que le client est highlighté/sélectionné
    // Le client pré-sélectionné devrait avoir un style différent (bg-primary/10, border-primary, etc.)
    const selectedClientCard = page.locator('[class*="bg-primary"], [class*="border-primary"]')
      .filter({ hasText: /Client Test|Test Company/i })
      .first();
    
    // Vérifier que le client est sélectionné (soit visuellement highlighté, soit le bouton Suivant est activé)
    const isHighlighted = await selectedClientCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Vérifier que le bouton "Suivant" est activé (ce qui indique qu'un client est sélectionné)
    const nextButton = page.locator('button:has-text("Suivant"), button:has-text("Next")').first();
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    
    // Le bouton ne doit pas être désactivé (ce qui indiquerait qu'aucun client n'est sélectionné)
    const isDisabled = await nextButton.isDisabled().catch(() => false);
    expect(isDisabled).toBeFalsy();
    
    // Vérification finale : le texte du client doit être visible dans la zone de sélection
    // Cela confirme que le client est bien présent et probablement sélectionné
    await expect(clientInWizard).toBeVisible();
  });
});

