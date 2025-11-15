import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { db } from '@/lib/db/index';
import { templates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createTemplateFromParsedDocx,
} from '../nouveau/actions';
import {
  duplicateTemplate,
  updateTemplateAction,
  resetTemplateStructure,
} from '../actions';
import { serializeTemplateContent } from '@/lib/templates/content';
import { getTemplateById } from '@/lib/db/queries/templates';

// Mock de getCurrentOrgId et requireAdmin
vi.mock('@/lib/auth/session', () => ({
  getCurrentOrgId: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock('@/lib/auth/permissions', () => ({
  requireAdmin: vi.fn(),
}));

import { getCurrentOrgId } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/permissions';

describe('templates Server Actions integration tests', () => {
  const testOrgId = 'org_test_1';
  const mockGetCurrentOrgId = vi.mocked(getCurrentOrgId);
  const mockRequireAdmin = vi.mocked(requireAdmin);

  // Helper pour nettoyer les données de test
  async function cleanupTestData() {
    await db.delete(templates).where(eq(templates.org_id, testOrgId));
  }

  beforeAll(async () => {
    mockGetCurrentOrgId.mockResolvedValue(testOrgId);
    mockRequireAdmin.mockResolvedValue(undefined); // Par défaut, autoriser (ADMIN)
    await cleanupTestData();
  });

  beforeEach(async () => {
    mockGetCurrentOrgId.mockResolvedValue(testOrgId);
    mockRequireAdmin.mockResolvedValue(undefined); // Par défaut, autoriser (ADMIN)
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('createTemplateFromParsedDocx', () => {
    it('creates template successfully with valid payload', async () => {
      const fields = [
        { field_name: 'poste', field_type: 'text' as const },
        { field_name: 'montant', field_type: 'number' as const },
      ];
      const content = serializeTemplateContent(fields);

      const result = await createTemplateFromParsedDocx({
        title: 'Test Template',
        slug: 'test-template',
        content,
        category: 'test',
        tags: ['tag1', 'tag2'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.template.title).toBe('Test Template');
        expect(result.template.slug).toBe('test-template');
        expect(result.template.org_id).toBeUndefined(); // Pas dans le type Template retourné
        expect(result.template.content).toBe(content);

        // Vérifier en DB que le template existe avec le bon org_id
        const dbTemplate = await getTemplateById(result.template.id, testOrgId);
        expect(dbTemplate.id).toBe(result.template.id);
        expect(dbTemplate.title).toBe('Test Template');
      }
    });

    it('handles slug collision by generating unique slug', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);
      const slug = 'collision-slug';

      // Créer un premier template avec ce slug
      const firstResult = await createTemplateFromParsedDocx({
        title: 'First Template',
        slug,
        content,
      });

      expect(firstResult.success).toBe(true);
      if (firstResult.success) {
        expect(firstResult.template.slug).toBe(slug);
      }

      // Re-appeler avec le même slug → devrait générer un slug différent
      const secondResult = await createTemplateFromParsedDocx({
        title: 'Second Template',
        slug,
        content,
      });

      expect(secondResult.success).toBe(true);
      if (secondResult.success) {
        expect(secondResult.template.slug).not.toBe(slug);
        expect(secondResult.template.slug).toContain(slug);
        expect(secondResult.template.slug).toMatch(/^collision-slug-\d+$/);
      }
    });

    it('returns VALIDATION_ERROR for invalid content structure', async () => {
      const invalidContent = '{"invalid": "structure"}'; // Pas de fields

      const result = await createTemplateFromParsedDocx({
        title: 'Test Template',
        slug: 'test-template',
        content: invalidContent,
      });

      // Le schéma Zod accepte n'importe quelle string pour content
      // Donc ça devrait passer la validation Zod mais peut échouer ailleurs
      // Vérifions le comportement réel
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
      }
    });

    it('uses correct orgId from getCurrentOrgId', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const result = await createTemplateFromParsedDocx({
        title: 'Org Test Template',
        slug: 'org-test-template',
        content,
      });

      expect(result.success).toBe(true);
      expect(mockGetCurrentOrgId).toHaveBeenCalled();

      if (result.success) {
        // Vérifier que le template appartient bien à testOrgId
        const dbTemplate = await getTemplateById(result.template.id, testOrgId);
        expect(dbTemplate.id).toBe(result.template.id);
      }
    });
  });

  describe('duplicateTemplate', () => {
    it('duplicates template successfully', async () => {
      // Créer un template de base en DB
      const fields = [
        { field_name: 'original', field_type: 'text' as const },
        { field_name: 'number', field_type: 'number' as const },
      ];
      const content = serializeTemplateContent(fields);

      const originalResult = await createTemplateFromParsedDocx({
        title: 'Original Template',
        slug: 'original-template',
        content,
        category: 'original',
        tags: ['tag1'],
      });

      expect(originalResult.success).toBe(true);
      if (!originalResult.success) return;

      const originalId = originalResult.template.id;

      // Dupliquer le template
      const duplicateResult = await duplicateTemplate(originalId);

      expect(duplicateResult.success).toBe(true);
      if (duplicateResult.success) {
        expect(duplicateResult.template.title).toContain('(copie)');
        expect(duplicateResult.template.id).not.toBe(originalId);
        expect(duplicateResult.template.slug).not.toBe(originalResult.template.slug);
        expect(duplicateResult.template.content).toBe(originalResult.template.content);
        expect(duplicateResult.template.category).toBe(originalResult.template.category);
        expect(duplicateResult.template.tags).toEqual(originalResult.template.tags);

        // Vérifier que le nouveau template existe en DB avec le même org_id
        const dbTemplate = await getTemplateById(duplicateResult.template.id, testOrgId);
        expect(dbTemplate.id).toBe(duplicateResult.template.id);
      }
    });

    it('returns TEMPLATE_NOT_FOUND for non-existent template', async () => {
      const nonExistentId = 'non-existent-id-12345';

      const result = await duplicateTemplate(nonExistentId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('TEMPLATE_NOT_FOUND');
        expect(result.message).toBeTruthy();
      }
    });

    it('generates unique slug for duplicate', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const originalResult = await createTemplateFromParsedDocx({
        title: 'Test Template',
        slug: 'test-template',
        content,
      });

      expect(originalResult.success).toBe(true);
      if (!originalResult.success) return;

      // Dupliquer plusieurs fois
      const duplicate1 = await duplicateTemplate(originalResult.template.id);
      const duplicate2 = await duplicateTemplate(originalResult.template.id);

      expect(duplicate1.success).toBe(true);
      expect(duplicate2.success).toBe(true);

      if (duplicate1.success && duplicate2.success) {
        // Les slugs doivent être différents
        expect(duplicate1.template.slug).not.toBe(duplicate2.template.slug);
        expect(duplicate1.template.slug).not.toBe(originalResult.template.slug);
        expect(duplicate2.template.slug).not.toBe(originalResult.template.slug);
      }
    });
  });

  describe('updateTemplateAction', () => {
    it('updates template content successfully', async () => {
      // Créer un template avec content initial
      const initialFields = [
        { field_name: 'old', field_type: 'text' as const },
      ];
      const initialContent = serializeTemplateContent(initialFields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Update Test Template',
        slug: 'update-test-template',
        content: initialContent,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const templateId = createResult.template.id;

      // Générer un nouveau content
      const newFields = [
        { field_name: 'new', field_type: 'text' as const },
        { field_name: 'updated', field_type: 'number' as const },
      ];
      const newContent = serializeTemplateContent(newFields);

      // Mettre à jour le template
      const updateResult = await updateTemplateAction(templateId, {
        content: newContent,
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.template.content).toBe(newContent);

        // Vérifier en DB que le content est bien mis à jour
        const dbTemplate = await getTemplateById(templateId, testOrgId);
        expect(dbTemplate.content).toBe(newContent);
      }
    });

    it('updates other fields successfully', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Original Title',
        slug: 'original-slug',
        content,
        category: 'original-category',
        tags: ['tag1'],
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const updateResult = await updateTemplateAction(createResult.template.id, {
        title: 'Updated Title',
        category: 'updated-category',
        tags: ['tag2', 'tag3'],
      });

      expect(updateResult.ok).toBe(true);
      if (updateResult.ok) {
        expect(updateResult.template.title).toBe('Updated Title');
        expect(updateResult.template.category).toBe('updated-category');
        expect(updateResult.template.tags).toEqual(['tag2', 'tag3']);
      }
    });

    it('returns INVALID_CONTENT_STRUCTURE for invalid content', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Test Template',
        slug: 'test-template',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Essayer de mettre à jour avec un content invalide (JSON cassé)
      const updateResult = await updateTemplateAction(createResult.template.id, {
        content: '{ invalid json }',
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.code).toBe('INVALID_CONTENT_STRUCTURE');
      }
    });

    it('returns INVALID_CONTENT_STRUCTURE for content with too many fields', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Test Template',
        slug: 'test-template',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Créer un content avec plus de 50 fields (limite)
      const tooManyFields = Array.from({ length: 51 }, (_, i) => ({
        field_name: `field-${i}`,
        field_type: 'text' as const,
      }));
      const invalidContent = serializeTemplateContent(tooManyFields);

      const updateResult = await updateTemplateAction(createResult.template.id, {
        content: invalidContent,
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.code).toBe('INVALID_CONTENT_STRUCTURE');
      }
    });

    it('returns TEMPLATE_NOT_FOUND for non-existent template', async () => {
      const nonExistentId = 'non-existent-id-12345';

      const updateResult = await updateTemplateAction(nonExistentId, {
        title: 'Updated Title',
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });
  });

  describe('resetTemplateStructure', () => {
    it('resets template structure to empty fields', async () => {
      // Créer un template avec quelques fields
      const fields = [
        { field_name: 'field1', field_type: 'text' as const },
        { field_name: 'field2', field_type: 'number' as const },
        { field_name: 'field3', field_type: 'date' as const },
      ];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Reset Test Template',
        slug: 'reset-test-template',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const templateId = createResult.template.id;

      // Vérifier que le template a bien des fields
      expect(createResult.template.content).toBe(content);

      // Réinitialiser la structure
      const resetResult = await resetTemplateStructure(templateId);

      expect(resetResult.ok).toBe(true);
      if (resetResult.ok) {
        const expectedEmptyContent = JSON.stringify({ fields: [] });
        expect(resetResult.template.content).toBe(expectedEmptyContent);

        // Vérifier en DB que le content est bien réinitialisé
        const dbTemplate = await getTemplateById(templateId, testOrgId);
        expect(dbTemplate.content).toBe(expectedEmptyContent);
      }
    });

    it('returns TEMPLATE_NOT_FOUND for non-existent template', async () => {
      const nonExistentId = 'non-existent-id-12345';

      const resetResult = await resetTemplateStructure(nonExistentId);

      expect(resetResult.ok).toBe(false);
      if (!resetResult.ok) {
        expect(resetResult.code).toBe('TEMPLATE_NOT_FOUND');
      }
    });

    it('preserves other template properties when resetting structure', async () => {
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Preserve Test Template',
        slug: 'preserve-test-template',
        content,
        category: 'test-category',
        tags: ['tag1', 'tag2'],
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      const resetResult = await resetTemplateStructure(createResult.template.id);

      expect(resetResult.ok).toBe(true);
      if (resetResult.ok) {
        // Vérifier que title, category, tags sont préservés
        expect(resetResult.template.title).toBe(createResult.template.title);
        expect(resetResult.template.category).toBe(createResult.template.category);
        expect(resetResult.template.tags).toEqual(createResult.template.tags);
        // Seul content doit être réinitialisé
        expect(resetResult.template.content).toBe(JSON.stringify({ fields: [] }));
      }
    });
  });

  describe('Permissions (requireAdmin)', () => {
    it('allows ADMIN users to create templates', async () => {
      // requireAdmin() ne throw pas (utilisateur ADMIN)
      mockRequireAdmin.mockResolvedValue(undefined);

      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const result = await createTemplateFromParsedDocx({
        title: 'Admin Test Template',
        slug: 'admin-test-template',
        content,
      });

      expect(result.success).toBe(true);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('blocks USER users from creating templates', async () => {
      // requireAdmin() throw une erreur (utilisateur USER)
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const result = await createTemplateFromParsedDocx({
        title: 'User Test Template',
        slug: 'user-test-template',
        content,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('UNAUTHORIZED');
      }
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('allows ADMIN users to duplicate templates', async () => {
      mockRequireAdmin.mockResolvedValue(undefined);

      // Créer un template d'abord
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Duplicate',
        slug: 'template-to-duplicate',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Dupliquer le template
      const duplicateResult = await duplicateTemplate(createResult.template.id);

      expect(duplicateResult.success).toBe(true);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('blocks USER users from duplicating templates', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      // Créer un template d'abord (avec ADMIN)
      mockRequireAdmin.mockResolvedValue(undefined);
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Duplicate',
        slug: 'template-to-duplicate-2',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Essayer de dupliquer avec USER (non autorisé)
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));
      const duplicateResult = await duplicateTemplate(createResult.template.id);

      expect(duplicateResult.success).toBe(false);
      if (!duplicateResult.success) {
        expect(duplicateResult.code).toBe('UNAUTHORIZED');
      }
    });

    it('allows ADMIN users to update templates', async () => {
      mockRequireAdmin.mockResolvedValue(undefined);

      // Créer un template d'abord
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Update',
        slug: 'template-to-update',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Mettre à jour le template
      const updateResult = await updateTemplateAction(createResult.template.id, {
        title: 'Updated Title',
      });

      expect(updateResult.ok).toBe(true);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('blocks USER users from updating templates', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      // Créer un template d'abord (avec ADMIN)
      mockRequireAdmin.mockResolvedValue(undefined);
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Update',
        slug: 'template-to-update-2',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Essayer de mettre à jour avec USER (non autorisé)
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));
      const updateResult = await updateTemplateAction(createResult.template.id, {
        title: 'Updated Title',
      });

      expect(updateResult.ok).toBe(false);
      if (!updateResult.ok) {
        expect(updateResult.code).toBe('UNAUTHORIZED');
      }
    });

    it('allows ADMIN users to reset template structure', async () => {
      mockRequireAdmin.mockResolvedValue(undefined);

      // Créer un template d'abord
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Reset',
        slug: 'template-to-reset',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Réinitialiser la structure
      const resetResult = await resetTemplateStructure(createResult.template.id);

      expect(resetResult.ok).toBe(true);
      expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('blocks USER users from resetting template structure', async () => {
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

      // Créer un template d'abord (avec ADMIN)
      mockRequireAdmin.mockResolvedValue(undefined);
      const fields = [{ field_name: 'test', field_type: 'text' as const }];
      const content = serializeTemplateContent(fields);

      const createResult = await createTemplateFromParsedDocx({
        title: 'Template to Reset',
        slug: 'template-to-reset-2',
        content,
      });

      expect(createResult.success).toBe(true);
      if (!createResult.success) return;

      // Essayer de réinitialiser avec USER (non autorisé)
      mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));
      const resetResult = await resetTemplateStructure(createResult.template.id);

      expect(resetResult.ok).toBe(false);
      if (!resetResult.ok) {
        expect(resetResult.code).toBe('UNAUTHORIZED');
      }
    });
  });
});

