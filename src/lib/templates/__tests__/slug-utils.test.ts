import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTemplateBySlug } from '@/lib/db/queries/templates';
import type { Template } from '@/types/domain';

// Mock de getTemplateBySlug
vi.mock('@/lib/db/queries/templates', () => ({
  getTemplateBySlug: vi.fn(),
}));

/**
 * Implémentation de ensureUniqueSlug pour les tests
 * Cette fonction reproduit la logique de ensureUniqueSlug des Server Actions
 */
async function ensureUniqueSlug(baseSlug: string, orgId: string): Promise<string> {
  // Vérifier si le slug existe déjà
  const existing = await getTemplateBySlug(baseSlug, orgId);
  
  if (!existing) {
    return baseSlug;
  }
  
  // Générer un slug alternatif avec timestamp
  const timestamp = Date.now();
  const uniqueSlug = `${baseSlug}-${timestamp}`;
  
  // Vérifier que le slug alternatif n'existe pas non plus (cas très rare)
  const existingAlt = await getTemplateBySlug(uniqueSlug, orgId);
  if (existingAlt) {
    // Si même le slug avec timestamp existe (quasi impossible), ajouter un random
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${timestamp}-${randomSuffix}`;
  }
  
  return uniqueSlug;
}

describe('ensureUniqueSlug', () => {
  const mockGetTemplateBySlug = vi.mocked(getTemplateBySlug);
  const orgId = 'org-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now() pour avoir des timestamps prévisibles dans les tests
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    // Mock Math.random() pour avoir des valeurs prévisibles
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when slug is available', () => {
    it('returns the slug unchanged when no template exists', async () => {
      mockGetTemplateBySlug.mockResolvedValue(null);

      const result = await ensureUniqueSlug('test-slug', orgId);

      expect(result).toBe('test-slug');
      expect(mockGetTemplateBySlug).toHaveBeenCalledTimes(1);
      expect(mockGetTemplateBySlug).toHaveBeenCalledWith('test-slug', orgId);
    });

    it('calls getTemplateBySlug with correct parameters', async () => {
      mockGetTemplateBySlug.mockResolvedValue(null);

      await ensureUniqueSlug('my-slug', orgId);

      expect(mockGetTemplateBySlug).toHaveBeenCalledWith('my-slug', orgId);
    });
  });

  describe('when slug is taken', () => {
    const existingTemplate: Template = {
      id: 'template-1',
      title: 'Existing Template',
      slug: 'test-slug',
      content: '',
      category: '',
      tags: [],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    it('returns a modified slug with timestamp when slug exists', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate) // Premier appel : slug existe
        .mockResolvedValueOnce(null); // Deuxième appel : slug avec timestamp n'existe pas

      const result = await ensureUniqueSlug('test-slug', orgId);

      expect(result).toBe('test-slug-1234567890');
      expect(mockGetTemplateBySlug).toHaveBeenCalledTimes(2);
      expect(mockGetTemplateBySlug).toHaveBeenNthCalledWith(1, 'test-slug', orgId);
      expect(mockGetTemplateBySlug).toHaveBeenNthCalledWith(2, 'test-slug-1234567890', orgId);
    });

    it('returns a slug that is different from the original', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate)
        .mockResolvedValueOnce(null);

      const originalSlug = 'test-slug';
      const result = await ensureUniqueSlug(originalSlug, orgId);

      expect(result).not.toBe(originalSlug);
      expect(result).toContain(originalSlug);
      expect(result).toMatch(/^test-slug-\d+$/);
    });

    it('generates a reasonable slug format (base-timestamp)', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate)
        .mockResolvedValueOnce(null);

      const result = await ensureUniqueSlug('my-template', orgId);

      expect(result).toMatch(/^my-template-\d+$/);
      expect(result.length).toBeGreaterThan('my-template'.length);
      expect(result).not.toBe('');
    });
  });

  describe('when slug with timestamp is also taken', () => {
    const existingTemplate: Template = {
      id: 'template-1',
      title: 'Existing Template',
      slug: 'test-slug',
      content: '',
      category: '',
      tags: [],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const existingTemplateWithTimestamp: Template = {
      id: 'template-2',
      title: 'Existing Template with Timestamp',
      slug: 'test-slug-1234567890',
      content: '',
      category: '',
      tags: [],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    it('returns a slug with timestamp and random suffix when timestamped slug also exists', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate) // Slug original existe
        .mockResolvedValueOnce(existingTemplateWithTimestamp); // Slug avec timestamp existe aussi

      const result = await ensureUniqueSlug('test-slug', orgId);

      // Math.random() mocké retourne 0.5, donc randomSuffix devrait être basé sur ça
      // 0.5.toString(36).substring(2, 8) = "k" (car 0.5 en base 36 commence par "0.")
      expect(result).toMatch(/^test-slug-1234567890-[a-z0-9]+$/);
      expect(result).not.toBe('test-slug');
      expect(result).not.toBe('test-slug-1234567890');
      expect(mockGetTemplateBySlug).toHaveBeenCalledTimes(2);
    });

    it('generates a reasonable slug format even with double collision', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate)
        .mockResolvedValueOnce(existingTemplateWithTimestamp);

      const result = await ensureUniqueSlug('my-slug', orgId);

      expect(result).toMatch(/^my-slug-\d+-[a-z0-9]+$/);
      expect(result.length).toBeGreaterThan('my-slug'.length);
      expect(result).not.toBe('');
      // Le format devrait être: base-timestamp-randomSuffix
      const parts = result.split('-');
      expect(parts.length).toBeGreaterThanOrEqual(3);
    });

    it('calls getTemplateBySlug twice in case of double collision', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce(existingTemplate)
        .mockResolvedValueOnce(existingTemplateWithTimestamp);

      await ensureUniqueSlug('test-slug', orgId);

      expect(mockGetTemplateBySlug).toHaveBeenCalledTimes(2);
      expect(mockGetTemplateBySlug).toHaveBeenNthCalledWith(1, 'test-slug', orgId);
      expect(mockGetTemplateBySlug).toHaveBeenNthCalledWith(2, 'test-slug-1234567890', orgId);
    });
  });

  describe('slug format validation', () => {
    it('preserves the base slug in the result', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce({} as Template)
        .mockResolvedValueOnce(null);

      const baseSlug = 'complex-slug-name-123';
      const result = await ensureUniqueSlug(baseSlug, orgId);

      expect(result).toContain(baseSlug);
      expect(result.startsWith(baseSlug)).toBe(true);
    });

    it('handles slugs with special characters correctly', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce({} as Template)
        .mockResolvedValueOnce(null);

      const baseSlug = 'slug-with-dashes';
      const result = await ensureUniqueSlug(baseSlug, orgId);

      expect(result).toMatch(/^slug-with-dashes-\d+$/);
    });

    it('handles short slugs', async () => {
      mockGetTemplateBySlug
        .mockResolvedValueOnce({} as Template)
        .mockResolvedValueOnce(null);

      const result = await ensureUniqueSlug('a', orgId);

      expect(result).toMatch(/^a-\d+$/);
      expect(result.length).toBeGreaterThan(1);
    });

    it('handles long slugs', async () => {
      const longSlug = 'a'.repeat(50);
      mockGetTemplateBySlug
        .mockResolvedValueOnce({} as Template)
        .mockResolvedValueOnce(null);

      const result = await ensureUniqueSlug(longSlug, orgId);

      expect(result).toContain(longSlug);
      expect(result.length).toBeGreaterThan(longSlug.length);
    });
  });

  describe('edge cases', () => {
    it('handles empty slug (should not happen in practice but tested for robustness)', async () => {
      mockGetTemplateBySlug.mockResolvedValue(null);

      const result = await ensureUniqueSlug('', orgId);

      expect(result).toBe('');
      expect(mockGetTemplateBySlug).toHaveBeenCalledWith('', orgId);
    });

    it('handles multiple sequential collisions correctly', async () => {
      // Simuler plusieurs collisions successives
      const existing1: Template = { id: '1', title: 'T1', slug: 'slug', content: '', category: '', tags: [], created_at: '', updated_at: '' };
      const existing2: Template = { id: '2', title: 'T2', slug: 'slug-1234567890', content: '', category: '', tags: [], created_at: '', updated_at: '' };

      mockGetTemplateBySlug
        .mockResolvedValueOnce(existing1)
        .mockResolvedValueOnce(existing2);

      const result = await ensureUniqueSlug('slug', orgId);

      // Devrait avoir un random suffix
      expect(result).toMatch(/^slug-1234567890-[a-z0-9]+$/);
      expect(mockGetTemplateBySlug).toHaveBeenCalledTimes(2);
    });
  });
});

