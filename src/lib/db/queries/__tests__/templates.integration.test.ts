import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { db } from '../../index';
import { templates, offers, clients } from '../../schema';
import { eq, or } from 'drizzle-orm';
import {
  listTemplates,
  getTemplateById,
  getTemplateBySlug,
  createTemplate,
  updateTemplate,
} from '../templates';
import { createOffer, getLastUsedAtByTemplateIds } from '../offers';
import { createClient } from '../clients';

describe('templates integration tests', () => {
  const orgA = 'org-test-a';
  const orgB = 'org-test-b';

  // Helper pour nettoyer les données de test
  async function cleanupTestData() {
    // Supprimer dans l'ordre des dépendances (offers -> templates -> clients)
    await db.delete(offers).where(or(eq(offers.org_id, orgA), eq(offers.org_id, orgB)));
    await db.delete(templates).where(or(eq(templates.org_id, orgA), eq(templates.org_id, orgB)));
    await db.delete(clients).where(or(eq(clients.org_id, orgA), eq(clients.org_id, orgB)));
  }

  beforeAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('multi-tenant isolation', () => {
    it('listTemplates returns only templates for the specified org', async () => {
      // Créer des templates pour orgA et orgB
      const templateA1 = await createTemplate({
        orgId: orgA,
        title: 'Template A1',
        slug: 'template-a1',
      });
      const templateA2 = await createTemplate({
        orgId: orgA,
        title: 'Template A2',
        slug: 'template-a2',
      });
      const templateB1 = await createTemplate({
        orgId: orgB,
        title: 'Template B1',
        slug: 'template-b1',
      });

      // Vérifier que listTemplates(orgA) ne retourne que les templates de orgA
      const templatesA = await listTemplates(orgA);
      expect(templatesA).toHaveLength(2);
      expect(templatesA.map(t => t.id)).toContain(templateA1.id);
      expect(templatesA.map(t => t.id)).toContain(templateA2.id);
      expect(templatesA.map(t => t.id)).not.toContain(templateB1.id);

      // Vérifier que listTemplates(orgB) ne retourne que les templates de orgB
      const templatesB = await listTemplates(orgB);
      expect(templatesB).toHaveLength(1);
      expect(templatesB[0].id).toBe(templateB1.id);
    });

    it('getTemplateById returns template only if it belongs to the org', async () => {
      const templateA = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug: 'template-a',
      });

      // Devrait réussir avec la bonne org
      const found = await getTemplateById(templateA.id, orgA);
      expect(found.id).toBe(templateA.id);

      // Devrait échouer avec une autre org
      await expect(getTemplateById(templateA.id, orgB)).rejects.toThrow('not found');
    });

    it('getTemplateBySlug returns template only if it belongs to the org', async () => {
      const slug = 'shared-slug';
      const templateA = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug,
      });

      // Devrait trouver avec la bonne org
      const foundA = await getTemplateBySlug(slug, orgA);
      expect(foundA).not.toBeNull();
      expect(foundA?.id).toBe(templateA.id);

      // Ne devrait pas trouver avec une autre org (même slug)
      const foundB = await getTemplateBySlug(slug, orgB);
      expect(foundB).toBeNull();
    });

    it('allows same slug for different orgs', async () => {
      const slug = 'shared-slug';
      
      // Créer un template avec ce slug pour orgA
      const templateA = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug,
      });

      // Créer un template avec le même slug pour orgB (devrait réussir)
      const templateB = await createTemplate({
        orgId: orgB,
        title: 'Template B',
        slug,
      });

      expect(templateA.slug).toBe(slug);
      expect(templateB.slug).toBe(slug);
      expect(templateA.id).not.toBe(templateB.id);

      // Vérifier que chaque org voit son propre template
      const foundA = await getTemplateBySlug(slug, orgA);
      const foundB = await getTemplateBySlug(slug, orgB);
      expect(foundA?.id).toBe(templateA.id);
      expect(foundB?.id).toBe(templateB.id);
    });
  });

  describe('constraint (org_id, slug)', () => {
    it('prevents duplicate (org_id, slug) pairs', async () => {
      const slug = 'offre-standard';

      // Créer un premier template avec (orgA, slug)
      await createTemplate({
        orgId: orgA,
        title: 'Template 1',
        slug,
      });

      // Essayer de créer un deuxième template avec le même (orgA, slug) → doit échouer
      await expect(
        createTemplate({
          orgId: orgA,
          title: 'Template 2',
          slug,
        })
      ).rejects.toThrow(/existe déjà|duplicate|unique constraint/i);
    });

    it('allows same slug for different orgs', async () => {
      const slug = 'offre-standard';

      // Créer un template pour orgA
      const templateA = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug,
      });

      // Créer un template avec le même slug pour orgB → doit réussir
      const templateB = await createTemplate({
        orgId: orgB,
        title: 'Template B',
        slug,
      });

      expect(templateA.slug).toBe(slug);
      expect(templateB.slug).toBe(slug);
    });
  });

  describe('updateTemplate', () => {
    it('updates template successfully when it belongs to the org', async () => {
      const template = await createTemplate({
        orgId: orgA,
        title: 'Original Title',
        slug: 'original-slug',
        content: 'Original content',
        category: 'Original category',
      });

      // Mettre à jour le template
      const updated = await updateTemplate(template.id, orgA, {
        title: 'Nouveau titre',
        content: 'Nouveau contenu',
      });

      expect(updated.title).toBe('Nouveau titre');
      expect(updated.content).toBe('Nouveau contenu');
      expect(updated.category).toBe('Original category'); // Non modifié
      expect(updated.id).toBe(template.id);

      // Vérifier que les changements sont persistés
      const retrieved = await getTemplateById(template.id, orgA);
      expect(retrieved.title).toBe('Nouveau titre');
      expect(retrieved.content).toBe('Nouveau contenu');
    });

    it('fails to update template from different org', async () => {
      const template = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug: 'template-a',
      });

      // Essayer de mettre à jour avec orgB → doit échouer
      await expect(
        updateTemplate(template.id, orgB, {
          title: 'Hacked Title',
        })
      ).rejects.toThrow('not found');
    });

    it('does not update template when using wrong org', async () => {
      const template = await createTemplate({
        orgId: orgA,
        title: 'Original Title',
        slug: 'template-a',
      });

      // Essayer de mettre à jour avec orgB
      try {
        await updateTemplate(template.id, orgB, {
          title: 'Hacked Title',
        });
        // Si ça ne lance pas d'erreur, vérifier que le template n'a pas changé
        const retrieved = await getTemplateById(template.id, orgA);
        expect(retrieved.title).toBe('Original Title');
      } catch (error) {
        // Attendu : erreur "not found"
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('not found');
      }
    });

    it('updates slug successfully within same org', async () => {
      const template = await createTemplate({
        orgId: orgA,
        title: 'Template',
        slug: 'old-slug',
      });

      const updated = await updateTemplate(template.id, orgA, {
        slug: 'new-slug',
      });

      expect(updated.slug).toBe('new-slug');
      
      // Vérifier que l'ancien slug n'existe plus
      const oldSlugResult = await getTemplateBySlug('old-slug', orgA);
      expect(oldSlugResult).toBeNull();
      
      // Vérifier que le nouveau slug existe
      const newSlugResult = await getTemplateBySlug('new-slug', orgA);
      expect(newSlugResult?.id).toBe(template.id);
    });

    it('prevents updating slug to an existing slug in same org', async () => {
      const template1 = await createTemplate({
        orgId: orgA,
        title: 'Template 1',
        slug: 'slug-1',
      });

      const template2 = await createTemplate({
        orgId: orgA,
        title: 'Template 2',
        slug: 'slug-2',
      });

      // Essayer de mettre à jour template2 avec le slug de template1 → doit échouer
      await expect(
        updateTemplate(template2.id, orgA, {
          slug: 'slug-1',
        })
      ).rejects.toThrow(/existe déjà|duplicate|unique constraint/i);
    });
  });

  describe('getLastUsedAtByTemplateIds', () => {
    it('returns last used date for templates with offers', async () => {
      // Créer 2 templates pour orgA
      const template1 = await createTemplate({
        orgId: orgA,
        title: 'Template 1',
        slug: 'template-1',
      });
      const template2 = await createTemplate({
        orgId: orgA,
        title: 'Template 2',
        slug: 'template-2',
      });
      const template3 = await createTemplate({
        orgId: orgA,
        title: 'Template 3',
        slug: 'template-3',
      });

      // Créer un client pour les offres
      const client = await createClient({
        orgId: orgA,
        name: 'Test Client',
        company: 'Test Company',
      });

      // Créer des offres pour template1 à deux dates différentes
      const offer1_1 = await createOffer({
        orgId: orgA,
        client_id: client.id,
        template_id: template1.id,
        title: 'Offer 1-1',
        items: [],
        subtotal: 10000,
        tax_rate: 20,
        tax_amount: 2000,
        total: 12000,
      });

      // Attendre un peu pour avoir une date différente
      await new Promise(resolve => setTimeout(resolve, 10));

      const offer1_2 = await createOffer({
        orgId: orgA,
        client_id: client.id,
        template_id: template1.id,
        title: 'Offer 1-2',
        items: [],
        subtotal: 15000,
        tax_rate: 20,
        tax_amount: 3000,
        total: 18000,
      });

      // Créer une offre pour template2
      await new Promise(resolve => setTimeout(resolve, 10));
      const offer2_1 = await createOffer({
        orgId: orgA,
        client_id: client.id,
        template_id: template2.id,
        title: 'Offer 2-1',
        items: [],
        subtotal: 20000,
        tax_rate: 20,
        tax_amount: 4000,
        total: 24000,
      });

      // Récupérer les dates d'utilisation
      const lastUsed = await getLastUsedAtByTemplateIds(orgA, [
        template1.id,
        template2.id,
        template3.id,
      ]);

      // template1 devrait avoir la date de offer1_2 (la plus récente)
      expect(lastUsed[template1.id]).toBeDefined();
      expect(lastUsed[template1.id]).not.toBeNull();
      const template1Date = new Date(lastUsed[template1.id]!);
      const offer1_2Date = new Date(offer1_2.created_at);
      expect(template1Date.getTime()).toBeGreaterThanOrEqual(offer1_1.created_at ? new Date(offer1_1.created_at).getTime() : 0);
      expect(template1Date.getTime()).toBeGreaterThanOrEqual(offer1_2Date.getTime());

      // template2 devrait avoir la date de offer2_1
      expect(lastUsed[template2.id]).toBeDefined();
      expect(lastUsed[template2.id]).not.toBeNull();

      // template3 n'a pas d'offres, donc ne devrait pas apparaître ou avoir null
      // Selon l'implémentation, il peut ne pas apparaître dans le résultat
      // ou avoir une valeur null/undefined
      if (lastUsed[template3.id] !== undefined) {
        expect(lastUsed[template3.id]).toBeNull();
      }
    });

    it('returns empty object for empty templateIds array', async () => {
      const result = await getLastUsedAtByTemplateIds(orgA, []);
      expect(result).toEqual({});
    });

    it('only returns results for templates in the specified org', async () => {
      // Créer des templates pour orgA et orgB
      const templateA = await createTemplate({
        orgId: orgA,
        title: 'Template A',
        slug: 'template-a',
      });
      const templateB = await createTemplate({
        orgId: orgB,
        title: 'Template B',
        slug: 'template-b',
      });

      // Créer des clients
      const clientA = await createClient({
        orgId: orgA,
        name: 'Client A',
        company: 'Company A',
      });
      const clientB = await createClient({
        orgId: orgB,
        name: 'Client B',
        company: 'Company B',
      });

      // Créer des offres
      await createOffer({
        orgId: orgA,
        client_id: clientA.id,
        template_id: templateA.id,
        title: 'Offer A',
        items: [],
        subtotal: 10000,
        tax_rate: 20,
        tax_amount: 2000,
        total: 12000,
      });

      await createOffer({
        orgId: orgB,
        client_id: clientB.id,
        template_id: templateB.id,
        title: 'Offer B',
        items: [],
        subtotal: 10000,
        tax_rate: 20,
        tax_amount: 2000,
        total: 12000,
      });

      // Récupérer pour orgA avec les deux template IDs
      const lastUsedA = await getLastUsedAtByTemplateIds(orgA, [
        templateA.id,
        templateB.id,
      ]);

      // Devrait seulement retourner templateA (celui de orgA)
      expect(lastUsedA[templateA.id]).toBeDefined();
      expect(lastUsedA[templateB.id]).toBeUndefined();

      // Récupérer pour orgB
      const lastUsedB = await getLastUsedAtByTemplateIds(orgB, [
        templateA.id,
        templateB.id,
      ]);

      // Devrait seulement retourner templateB (celui de orgB)
      expect(lastUsedB[templateB.id]).toBeDefined();
      expect(lastUsedB[templateA.id]).toBeUndefined();
    });

    it('returns the maximum created_at date when multiple offers exist', async () => {
      const template = await createTemplate({
        orgId: orgA,
        title: 'Template',
        slug: 'template',
      });

      const client = await createClient({
        orgId: orgA,
        name: 'Client',
        company: 'Company',
      });

      // Créer plusieurs offres avec des dates différentes
      const dates: string[] = [];
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 10));
        const offer = await createOffer({
          orgId: orgA,
          client_id: client.id,
          template_id: template.id,
          title: `Offer ${i + 1}`,
          items: [],
          subtotal: 10000,
          tax_rate: 20,
          tax_amount: 2000,
          total: 12000,
        });
        dates.push(offer.created_at);
      }

      const lastUsed = await getLastUsedAtByTemplateIds(orgA, [template.id]);

      // La date retournée devrait être la plus récente
      expect(lastUsed[template.id]).toBeDefined();
      const lastUsedDate = new Date(lastUsed[template.id]!);
      const maxDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
      expect(lastUsedDate.getTime()).toBeGreaterThanOrEqual(maxDate.getTime() - 1000); // Tolérance de 1s
    });
  });
});

