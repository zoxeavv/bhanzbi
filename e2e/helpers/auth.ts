import { Page } from '@playwright/test';

/**
 * Helper pour l'authentification dans les tests E2E
 * 
 * Note: Adaptez ces fonctions selon votre système d'authentification réel.
 * Pour l'instant, on suppose une authentification Supabase avec email/password.
 */

const TEST_USER_EMAIL = process.env.E2E_TEST_USER_EMAIL || 'test@example.com';
const TEST_USER_PASSWORD = process.env.E2E_TEST_PASSWORD || 'testpassword123';

/**
 * Se connecter à l'application
 * 
 * @param page - Page Playwright
 */
export async function login(page: Page) {
  // Aller sur la page de login
  await page.goto('/authentication/login');
  
  // Attendre que le formulaire soit visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
  
  // Remplir le formulaire de connexion
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Connexion")').first();
  
  await emailInput.fill(TEST_USER_EMAIL);
  await passwordInput.fill(TEST_USER_PASSWORD);
  
  // Soumettre le formulaire
  await submitButton.click();
  
  // Attendre la redirection vers le dashboard
  // Ajustez selon votre flow d'authentification
  await page.waitForURL(/\/dashboard|\/templates|\/$/, { timeout: 10000 });
  
  // Attendre que la page soit chargée
  await page.waitForLoadState('networkidle');
}

/**
 * Vérifier si l'utilisateur est connecté
 * 
 * @param page - Page Playwright
 * @returns true si connecté, false sinon
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Vérifier la présence d'éléments qui n'apparaissent que quand on est connecté
    // Ajustez selon votre UI
    const dashboardIndicator = page.locator('text=/dashboard|templates|clients/i').first();
    await dashboardIndicator.waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Se déconnecter de l'application
 * 
 * @param page - Page Playwright
 */
export async function logout(page: Page) {
  // Chercher le bouton de déconnexion
  // Ajustez selon votre UI
  const logoutButton = page.locator('button:has-text("Déconnexion"), button:has-text("Logout"), [data-testid="logout"]').first();
  
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login|\/authentication/, { timeout: 5000 });
  }
}


