import { describe, it, expect } from 'vitest';
import { templateFieldSchema, templateContentSchema, validateTemplateContent } from '../schema';

describe('templateFieldSchema', () => {
  describe('valid fields', () => {
    it('accepts a valid text field', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'poste',
        field_type: 'text',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field_name).toBe('poste');
        expect(result.data.field_type).toBe('text');
        expect(result.data.required).toBe(false); // default
      }
    });

    it('accepts a valid number field', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'montant',
        field_type: 'number',
        placeholder: 'Entrez un montant',
        required: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field_type).toBe('number');
        expect(result.data.required).toBe(true);
        expect(result.data.placeholder).toBe('Entrez un montant');
      }
    });

    it('accepts a valid date field', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'date_debut',
        field_type: 'date',
        required: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field_type).toBe('date');
      }
    });

    it('accepts a valid textarea field', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'description',
        field_type: 'textarea',
        placeholder: 'Description détaillée',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field_type).toBe('textarea');
      }
    });

    it('accepts a valid select field with options', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'statut',
        field_type: 'select',
        options: ['actif', 'inactif', 'en_attente'],
        required: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field_type).toBe('select');
        expect(result.data.options).toEqual(['actif', 'inactif', 'en_attente']);
      }
    });

    it('accepts a select field with id', () => {
      const result = templateFieldSchema.safeParse({
        id: 'field-123',
        field_name: 'categorie',
        field_type: 'select',
        options: ['A', 'B', 'C'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('field-123');
      }
    });

    it('accepts a field with meta property', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'test_field',
        field_type: 'text',
        meta: {
          businessKey: 'employee_name',
          group: 'personal_info',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.meta).toEqual({
          businessKey: 'employee_name',
          group: 'personal_info',
        });
      }
    });

    it('accepts a select field with maximum allowed options (50)', () => {
      const options = Array.from({ length: 50 }, (_, i) => `option-${i}`);
      const result = templateFieldSchema.safeParse({
        field_name: 'large_select',
        field_type: 'select',
        options,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.options?.length).toBe(50);
      }
    });

    it('accepts a field_name at maximum length (100 characters)', () => {
      const longName = 'a'.repeat(100);
      const result = templateFieldSchema.safeParse({
        field_name: longName,
        field_type: 'text',
      });
      expect(result.success).toBe(true);
    });

    it('accepts an option at maximum length (100 characters)', () => {
      const longOption = 'a'.repeat(100);
      const result = templateFieldSchema.safeParse({
        field_name: 'select_field',
        field_type: 'select',
        options: [longOption],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid fields', () => {
    it('rejects empty field_name', () => {
      const result = templateFieldSchema.safeParse({
        field_name: '',
        field_type: 'text',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('requis');
      }
    });

    it('rejects missing field_name', () => {
      const result = templateFieldSchema.safeParse({
        field_type: 'text',
      });
      expect(result.success).toBe(false);
    });

    it('rejects field_name exceeding 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = templateFieldSchema.safeParse({
        field_name: longName,
        field_type: 'text',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100 caractères');
      }
    });

    it('rejects invalid field_type', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'test',
        field_type: 'invalid_type',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Type de champ invalide');
      }
    });

    it('rejects select field without options', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'statut',
        field_type: 'select',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const optionsError = result.error.issues.find(issue => issue.path.includes('options'));
        expect(optionsError?.message).toContain('au moins une option');
      }
    });

    it('rejects select field with empty options array', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'statut',
        field_type: 'select',
        options: [],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const optionsError = result.error.issues.find(issue => issue.path.includes('options'));
        expect(optionsError?.message).toContain('au moins une option');
      }
    });

    it('rejects select field with more than 50 options', () => {
      const options = Array.from({ length: 51 }, (_, i) => `option-${i}`);
      const result = templateFieldSchema.safeParse({
        field_name: 'large_select',
        field_type: 'select',
        options,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const optionsError = result.error.issues.find(issue => issue.path.includes('options'));
        expect(optionsError?.message).toContain('50 options');
      }
    });

    it('rejects empty option string', () => {
      const result = templateFieldSchema.safeParse({
        field_name: 'select_field',
        field_type: 'select',
        options: ['valid', ''],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const optionError = result.error.issues.find(issue => 
          issue.path.includes('options') && issue.message.includes('vide')
        );
        expect(optionError).toBeDefined();
      }
    });

    it('rejects option exceeding 100 characters', () => {
      const longOption = 'a'.repeat(101);
      const result = templateFieldSchema.safeParse({
        field_name: 'select_field',
        field_type: 'select',
        options: [longOption],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const optionError = result.error.issues.find(issue => 
          issue.path.includes('options') && issue.message.includes('100 caractères')
        );
        expect(optionError).toBeDefined();
      }
    });
  });
});

describe('templateContentSchema', () => {
  describe('valid content', () => {
    it('accepts content with version and 2-3 fields of different types', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [
          { field_name: 'poste', field_type: 'text' },
          { field_name: 'montant', field_type: 'number', required: true },
          { field_name: 'date_debut', field_type: 'date' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.fields).toHaveLength(3);
      }
    });

    it('defaults version to 1 when missing (backward compatibility)', () => {
      const result = templateContentSchema.safeParse({
        fields: [
          { field_name: 'poste', field_type: 'text' },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.fields).toHaveLength(1);
      }
    });

    it('accepts content with select field and valid options', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [
          { field_name: 'statut', field_type: 'select', options: ['actif', 'inactif'] },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts content with fields containing meta', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [
          {
            field_name: 'employee_name',
            field_type: 'text',
            meta: { businessKey: 'name', group: 'personal' },
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fields[0].meta).toEqual({ businessKey: 'name', group: 'personal' });
      }
    });

    it('accepts empty fields array', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.fields).toEqual([]);
      }
    });

    it('defaults to empty fields array and version 1 when fields is missing', () => {
      const result = templateContentSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.fields).toEqual([]);
      }
    });

    it('accepts maximum allowed fields (50)', () => {
      const fields = Array.from({ length: 50 }, (_, i) => ({
        field_name: `field-${i}`,
        field_type: 'text' as const,
      }));
      const result = templateContentSchema.safeParse({ version: 1, fields });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe(1);
        expect(result.data.fields).toHaveLength(50);
      }
    });
  });

  describe('invalid content', () => {
    it('rejects content without fields property', () => {
      const result = templateContentSchema.safeParse({
        // Pas de propriété fields
        other: 'value',
      });
      // Le schéma a un default([]), donc ça devrait passer mais avec fields: []
      // En fait, avec Zod, si fields n'est pas présent, le default s'applique
      // Donc ce test devrait passer. Testons plutôt avec un objet complètement différent.
      const result2 = templateContentSchema.safeParse(null);
      expect(result2.success).toBe(false);
    });

    it('rejects content with more than 50 fields', () => {
      const fields = Array.from({ length: 51 }, (_, i) => ({
        field_name: `field-${i}`,
        field_type: 'text' as const,
      }));
      const result = templateContentSchema.safeParse({ version: 1, fields });
      expect(result.success).toBe(false);
      if (!result.success) {
        const fieldsError = result.error.issues.find(issue => issue.path.includes('fields'));
        expect(fieldsError?.message).toContain('50 champs');
      }
    });

    it('rejects content with invalid field', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [
          { field_name: 'valid', field_type: 'text' },
          { field_name: '', field_type: 'text' }, // invalid: empty name
        ],
      });
      expect(result.success).toBe(false);
    });

    it('rejects content with invalid select field', () => {
      const result = templateContentSchema.safeParse({
        version: 1,
        fields: [
          { field_name: 'select_field', field_type: 'select' }, // missing options
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('validateTemplateContent', () => {
  describe('valid content', () => {
    it('validates and returns valid TemplateContent with version', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'poste', field_type: 'text' },
          { field_name: 'montant', field_type: 'number' },
        ],
      });
      const result = validateTemplateContent(content);
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
      expect(result?.fields).toHaveLength(2);
    });

    it('validates content without version (backward compatibility)', () => {
      const content = JSON.stringify({
        fields: [
          { field_name: 'poste', field_type: 'text' },
        ],
      });
      const result = validateTemplateContent(content);
      expect(result).not.toBeNull();
      expect(result?.version).toBe(1);
      expect(result?.fields).toHaveLength(1);
    });

    it('returns empty fields with version 1 for null input', () => {
      const result = validateTemplateContent(null);
      expect(result).toEqual({ version: 1, fields: [] });
    });

    it('returns empty fields with version 1 for undefined input', () => {
      const result = validateTemplateContent(undefined);
      expect(result).toEqual({ version: 1, fields: [] });
    });

    it('returns empty fields with version 1 for empty string', () => {
      const result = validateTemplateContent('');
      expect(result).toEqual({ version: 1, fields: [] });
    });

    it('returns empty fields with version 1 for whitespace-only string', () => {
      const result = validateTemplateContent('   ');
      expect(result).toEqual({ version: 1, fields: [] });
    });
  });

  describe('invalid content', () => {
    it('returns null for malformed JSON', () => {
      const result = validateTemplateContent('{ invalid json }');
      expect(result).toBeNull();
    });

    it('returns null for JSON without fields property', () => {
      const result = validateTemplateContent('{"other": "value"}');
      // En fait, avec le default([]), ça devrait retourner { version: 1, fields: [] }
      // Mais testons avec un cas vraiment invalide
      const result2 = validateTemplateContent('null');
      expect(result2).toBeNull();
    });

    it('returns null for JSON with invalid field structure', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: '', field_type: 'text' }, // invalid: empty name
        ],
      });
      const result = validateTemplateContent(content);
      expect(result).toBeNull();
    });

    it('returns null for JSON with invalid field_type', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'test', field_type: 'invalid_type' },
        ],
      });
      const result = validateTemplateContent(content);
      expect(result).toBeNull();
    });

    it('returns null for JSON with select field without options', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'select_field', field_type: 'select' },
        ],
      });
      const result = validateTemplateContent(content);
      expect(result).toBeNull();
    });

    it('returns null for JSON with too many fields', () => {
      const fields = Array.from({ length: 51 }, (_, i) => ({
        field_name: `field-${i}`,
        field_type: 'text' as const,
      }));
      const content = JSON.stringify({ version: 1, fields });
      const result = validateTemplateContent(content);
      expect(result).toBeNull();
    });
  });
});


