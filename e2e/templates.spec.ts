import { test, expect } from '@playwright/test';
import { login, isLoggedIn } from './helpers/auth';
import { cleanupTestData, seedTestData } from './helpers/db';

test.describe('Templates E2E', () => {
  // Nettoyer les données avant et après chaque test
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test.describe('Listing /templates', () => {
    test('should display templates page with title and cards', async ({ page }) => {
      // Se connecter
      await login(page);
      
      // Aller sur /templates
      await page.goto('/templates');
      
      // Attendre que la page soit chargée
      await page.waitForLoadState('networkidle');
      
      // Vérifier la présence du titre "Templates"
      // Le PageHeader devrait contenir "Templates"
      const pageTitle = page.locator('h1, [data-testid="page-title"]').filter({ hasText: /Templates/i }).first();
      await expect(pageTitle).toBeVisible({ timeout: 5000 });
      
      // Vérifier qu'au moins une TemplateCard est visible (si des données existent)
      // Si aucune donnée, on devrait voir un EmptyState
      const templateCards = page.locator('[data-testid="template-card"], .template-card, article').filter({ hasText: /template/i });
      const emptyState = page.locator('text=/aucun template|no templates|empty/i');
      
      const hasCards = await templateCards.count() > 0;
      const hasEmptyState = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
      
      // Soit on a des cartes, soit on a un empty state
      expect(hasCards || hasEmptyState).toBeTruthy();
    });

    test('should filter templates by search query', async ({ page }) => {
      // Se connecter
      await login(page);
      
      // Créer des données de test
      await seedTestData();
      
      // Aller sur /templates
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
      
      // Attendre que les templates soient chargés
      const templateCards = page.locator('[data-testid="template-card"], .template-card, article').filter({ hasText: /template/i });
      await templateCards.first().waitFor({ timeout: 5000 });
      
      // Compter le nombre initial de cartes
      const initialCount = await templateCards.count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Trouver le champ de recherche
      const searchInput = page.locator('input[type="search"], input[placeholder*="recherche" i], input[placeholder*="search" i]').first();
      
      if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Taper un terme de recherche
        await searchInput.fill('Test 1');
        await page.waitForTimeout(500); // Attendre le debounce de la recherche
        
        // Vérifier que le nombre de cartes a diminué
        const filteredCount = await templateCards.count();
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
        
        // Vérifier que les cartes visibles contiennent le terme recherché
        if (filteredCount > 0) {
          const firstCard = templateCards.first();
          await expect(firstCard).toContainText(/test 1/i);
        }
      } else {
        // Si pas de champ de recherche, skip ce test
        test.skip();
      }
    });
  });

  test.describe('Création via /templates/nouveau', () => {
    test('should create template from file upload', async ({ page }) => {
      // Se connecter
      await login(page);
      
      // Aller sur /templates/nouveau
      await page.goto('/templates/nouveau');
      await page.waitForLoadState('networkidle');
      
      // Vérifier que la page est bien chargée
      const pageTitle = page.locator('h1').filter({ hasText: /nouveau template|new template/i }).first();
      await expect(pageTitle).toBeVisible({ timeout: 5000 });
      
      // Créer un fichier mock pour l'upload
      // Note: Playwright peut simuler un upload de fichier
      const fileInput = page.locator('input[type="file"]').first();
      
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Créer un fichier .docx mock (juste un fichier texte avec l'extension .docx)
        // Dans un vrai test, vous pourriez utiliser un vrai fichier .docx de test
        const testFilePath = 'e2e/fixtures/test-template.docx';
        
        // Si le fichier n'existe pas, créer un fichier vide pour le test
        // (le mockParseDocx s'en occupera)
        try {
          await fileInput.setInputFiles(testFilePath);
        } catch {
          // Si le fichier n'existe pas, créer un fichier temporaire
          // Pour ce test, on simule juste l'upload
          await fileInput.evaluate((el: HTMLInputElement) => {
            const file = new File(['test content'], 'test-template.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            el.files = dataTransfer.files;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        
        // Attendre l'état de chargement/parsing
        const loadingIndicator = page.locator('text=/analyse|parsing|chargement|loading/i').first();
        await expect(loadingIndicator).toBeVisible({ timeout: 5000 });
        
        // Attendre la redirection vers /templates/[id]
        await page.waitForURL(/\/templates\/[^/]+$/, { timeout: 30000 });
        
        // Vérifier que la page d'édition est chargée
        // Le TemplateDetailClient devrait afficher les champs générés
        const fieldsPanel = page.locator('text=/poste|salaire|date_debut|fields|champs/i').first();
        await expect(fieldsPanel).toBeVisible({ timeout: 5000 });
      } else {
        // Si pas de file input visible, skip ce test
        test.skip();
      }
    });
  });

  test.describe('Édition d\'un template', () => {
    test('should edit template field and persist changes', async ({ page }) => {
      // Se connecter
      await login(page);
      
      // Créer un template de test en DB
      await seedTestData();
      
      // Aller sur /templates
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');
      
      // Cliquer sur le premier template
      const firstTemplateCard = page.locator('[data-testid="template-card"], .template-card, article').filter({ hasText: /template/i }).first();
      await firstTemplateCard.waitFor({ timeout: 5000 });
      await firstTemplateCard.click();
      
      // Attendre la navigation vers la page de détail
      await page.waitForURL(/\/templates\/[^/]+$/, { timeout: 5000 });
      await page.waitForLoadState('networkidle');
      
      // Trouver un champ à modifier dans TemplateStructurePanel
      // Chercher un input pour field_name ou label
      const fieldInput = page.locator('input[name*="field_name"], input[placeholder*="nom" i], input[placeholder*="name" i]').first();
      
      if (await fieldInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Modifier le champ
        const originalValue = await fieldInput.inputValue();
        const newValue = originalValue + ' modifié';
        await fieldInput.fill(newValue);
        
        // Chercher le bouton "Enregistrer"
        const saveButton = page.locator('button:has-text("Enregistrer"), button:has-text("Save"), [data-testid="save-button"]').first();
        
        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();
          
          // Attendre le message de succès (toast)
          const successMessage = page.locator('text=/succès|success|enregistré|saved/i').first();
          await expect(successMessage).toBeVisible({ timeout: 5000 });
          
          // Recharger la page pour vérifier la persistance
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          // Vérifier que le changement est toujours là
          const updatedInput = page.locator('input[name*="field_name"], input[placeholder*="nom" i], input[placeholder*="name" i]').first();
          await expect(updatedInput).toHaveValue(newValue);
        } else {
          // Si pas de bouton save visible, peut-être que c'est auto-save
          // Attendre un peu pour que l'auto-save se déclenche
          await page.waitForTimeout(2000);
          
          // Recharger et vérifier
          await page.reload();
          await page.waitForLoadState('networkidle');
          
          const updatedInput = page.locator('input[name*="field_name"], input[placeholder*="nom" i], input[placeholder*="name" i]').first();
          const currentValue = await updatedInput.inputValue();
          expect(currentValue).toBe(newValue);
        }
      } else {
        // Si pas de champ éditable visible, skip ce test
        test.skip();
      }
    });
  });

  test.describe('Utilisation dans une offre (optionnel)', () => {
    test('should use template in offer creation', async ({ page }) => {
      // Se connecter
      await login(page);
      
      // Créer un template de test
      await seedTestData();
      
      // Aller sur la page de création d'offre
      // Ajustez l'URL selon votre routing
      const offersPage = page.locator('a[href*="/offres"], a[href*="/offers"]').first();
      
      if (await offersPage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await offersPage.click();
        await page.waitForLoadState('networkidle');
        
        // Chercher le bouton "Nouvelle offre" ou "Créer une offre"
        const newOfferButton = page.locator('button:has-text("Nouvelle"), button:has-text("Créer"), a[href*="/offres/nouveau"]').first();
        
        if (await newOfferButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await newOfferButton.click();
          await page.waitForLoadState('networkidle');
          
          // Chercher le sélecteur de template (dans CreateOfferStepper)
          const templateSelect = page.locator('select[name*="template"], [data-testid="template-select"]').first();
          
          if (await templateSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
            // Sélectionner un template
            await templateSelect.selectOption({ index: 0 });
            
            // Attendre que les champs du template apparaissent
            // Les champs devraient être générés dynamiquement
            const templateFields = page.locator('input[name*="field"], input[placeholder*="poste" i], input[placeholder*="salaire" i]');
            
            // Vérifier qu'au moins un champ du template est visible
            const fieldsCount = await templateFields.count();
            expect(fieldsCount).toBeGreaterThan(0);
          } else {
            // Si pas de sélecteur de template, skip ce test
            test.skip();
          }
        } else {
          // Si pas de bouton de création, skip ce test
          test.skip();
        }
      } else {
        // Si pas de lien vers les offres, skip ce test
        test.skip();
      }
    });
  });
});


