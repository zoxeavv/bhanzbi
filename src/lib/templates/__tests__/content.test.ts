import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseTemplateContent, serializeTemplateContent } from '../content';
import type { TemplateField } from '../schema';

describe('parseTemplateContent', () => {
  beforeEach(() => {
    // Reset console.error mock before each test
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('valid content', () => {
    it('parses valid JSON with version and fields array', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'poste', field_type: 'text' },
          { field_name: 'montant', field_type: 'number', required: true },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        field_name: 'poste',
        field_type: 'text',
      });
      expect(result[1]).toMatchObject({
        field_name: 'montant',
        field_type: 'number',
        required: true,
      });
    });

    it('parses JSON without version (backward compatibility)', () => {
      const content = JSON.stringify({
        fields: [
          { field_name: 'poste', field_type: 'text' },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        field_name: 'poste',
        field_type: 'text',
      });
    });

    it('parses content with select field and options', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'statut', field_type: 'select', options: ['actif', 'inactif'] },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        field_name: 'statut',
        field_type: 'select',
        options: ['actif', 'inactif'],
      });
    });

    it('parses content with fields containing meta', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          {
            field_name: 'employee_name',
            field_type: 'text',
            meta: { businessKey: 'name', group: 'personal' },
          },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toHaveLength(1);
      expect(result[0].meta).toEqual({ businessKey: 'name', group: 'personal' });
    });

    it('parses content with all field types', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'text_field', field_type: 'text' },
          { field_name: 'number_field', field_type: 'number' },
          { field_name: 'date_field', field_type: 'date' },
          { field_name: 'textarea_field', field_type: 'textarea' },
          { field_name: 'select_field', field_type: 'select', options: ['A', 'B'] },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toHaveLength(5);
      expect(result.map(f => f.field_type)).toEqual(['text', 'number', 'date', 'textarea', 'select']);
    });

    it('parses empty fields array', () => {
      const content = JSON.stringify({ version: 1, fields: [] });
      const result = parseTemplateContent(content);
      expect(result).toEqual([]);
    });

    it('parses fields with optional properties', () => {
      const content = JSON.stringify({
        version: 1,
        fields: [
          {
            id: 'field-123',
            field_name: 'test',
            field_type: 'text',
            placeholder: 'Enter value',
            required: true,
          },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result[0]).toMatchObject({
        id: 'field-123',
        field_name: 'test',
        field_type: 'text',
        placeholder: 'Enter value',
        required: true,
      });
    });
  });

  describe('invalid content', () => {
    it('returns empty array for null input', () => {
      const result = parseTemplateContent(null);
      expect(result).toEqual([]);
    });

    it('returns empty array for undefined input', () => {
      const result = parseTemplateContent(undefined);
      expect(result).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      const result = parseTemplateContent('');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
      const result = parseTemplateContent('   ');
      expect(result).toEqual([]);
    });

    it('returns empty array for malformed JSON and logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const result = parseTemplateContent('{ invalid json }');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('parseTemplateContent');
    });

    it('returns empty array for JSON without fields property (default applied)', () => {
      // Le schéma Zod applique default([]) si fields est absent
      // Zod ignore les propriétés supplémentaires, donc { other: 'value' } passe
      const content = JSON.stringify({ other: 'value' });
      const result = parseTemplateContent(content);
      // Le schéma accepte l'objet et applique fields: [] par défaut avec version: 1
      expect(result).toEqual([]);
      // Pas d'erreur car la validation réussit (fields par défaut)
    });

    it('returns empty array for JSON with invalid field structure and logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: '', field_type: 'text' }, // invalid: empty name
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('parseTemplateContent');
    });

    it('returns empty array for JSON with invalid field_type and logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'test', field_type: 'invalid_type' },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns empty array for JSON with select field without options and logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const content = JSON.stringify({
        version: 1,
        fields: [
          { field_name: 'select_field', field_type: 'select' },
        ],
      });
      const result = parseTemplateContent(content);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns empty array for JSON with too many fields and logs error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const fields = Array.from({ length: 51 }, (_, i) => ({
        field_name: `field-${i}`,
        field_type: 'text' as const,
      }));
      const content = JSON.stringify({ version: 1, fields });
      const result = parseTemplateContent(content);
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('handles JSON parse error gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const result = parseTemplateContent('not json at all');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});

describe('serializeTemplateContent', () => {
  it('serializes valid fields array to JSON string with version', () => {
    const fields: TemplateField[] = [
      { field_name: 'poste', field_type: 'text' },
      { field_name: 'montant', field_type: 'number', required: true },
    ];
    const result = serializeTemplateContent(fields);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('version');
    expect(parsed.version).toBe(1);
    expect(parsed).toHaveProperty('fields');
    expect(parsed.fields).toHaveLength(2);
    expect(parsed.fields[0]).toMatchObject({
      field_name: 'poste',
      field_type: 'text',
    });
  });

  it('serializes fields with all properties including meta', () => {
    const fields: TemplateField[] = [
      {
        id: 'field-123',
        field_name: 'test',
        field_type: 'select',
        options: ['A', 'B', 'C'],
        placeholder: 'Choose option',
        required: true,
        meta: { businessKey: 'test_key', group: 'test_group' },
      },
    ];
    const result = serializeTemplateContent(fields);
    const parsed = JSON.parse(result);
    expect(parsed.version).toBe(1);
    expect(parsed.fields[0]).toMatchObject({
      id: 'field-123',
      field_name: 'test',
      field_type: 'select',
      options: ['A', 'B', 'C'],
      placeholder: 'Choose option',
      required: true,
      meta: { businessKey: 'test_key', group: 'test_group' },
    });
  });

  it('serializes empty array with version', () => {
    const fields: TemplateField[] = [];
    const result = serializeTemplateContent(fields);
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ version: 1, fields: [] });
  });

  it('produces valid JSON that can be parsed back', () => {
    const fields: TemplateField[] = [
      { field_name: 'poste', field_type: 'text' },
      { field_name: 'montant', field_type: 'number' },
      { field_name: 'date', field_type: 'date', required: true },
      { field_name: 'description', field_type: 'textarea' },
      { field_name: 'statut', field_type: 'select', options: ['actif', 'inactif'] },
    ];
    const serialized = serializeTemplateContent(fields);
    expect(() => JSON.parse(serialized)).not.toThrow();
    const parsed = JSON.parse(serialized);
    expect(parsed.version).toBe(1);
    expect(parsed.fields).toHaveLength(5);
  });
});

describe('roundtrip: serializeTemplateContent → parseTemplateContent', () => {
  it('preserves fields through serialize → parse cycle', () => {
    const originalFields: TemplateField[] = [
      { field_name: 'poste', field_type: 'text', required: true },
      { field_name: 'montant', field_type: 'number', placeholder: 'Montant' },
      { field_name: 'statut', field_type: 'select', options: ['actif', 'inactif'] },
    ];

    const serialized = serializeTemplateContent(originalFields);
    const parsed = parseTemplateContent(serialized);

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      field_name: 'poste',
      field_type: 'text',
      required: true,
    });
    expect(parsed[1]).toMatchObject({
      field_name: 'montant',
      field_type: 'number',
      placeholder: 'Montant',
    });
    expect(parsed[2]).toMatchObject({
      field_name: 'statut',
      field_type: 'select',
      options: ['actif', 'inactif'],
    });
  });

  it('preserves all field properties including optional ones', () => {
    const originalFields: TemplateField[] = [
      {
        id: 'field-1',
        field_name: 'test',
        field_type: 'text',
        placeholder: 'Enter value',
        required: true,
      },
      {
        id: 'field-2',
        field_name: 'select_test',
        field_type: 'select',
        options: ['option1', 'option2', 'option3'],
        required: false,
      },
    ];

    const serialized = serializeTemplateContent(originalFields);
    const parsed = parseTemplateContent(serialized);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject(originalFields[0]);
    expect(parsed[1]).toMatchObject(originalFields[1]);
  });

  it('handles empty fields array', () => {
    const originalFields: TemplateField[] = [];
    const serialized = serializeTemplateContent(originalFields);
    const parsed = parseTemplateContent(serialized);
    expect(parsed).toEqual([]);
  });

  it('preserves field order', () => {
    const originalFields: TemplateField[] = [
      { field_name: 'first', field_type: 'text' },
      { field_name: 'second', field_type: 'number' },
      { field_name: 'third', field_type: 'date' },
    ];

    const serialized = serializeTemplateContent(originalFields);
    const parsed = parseTemplateContent(serialized);

    expect(parsed.map(f => f.field_name)).toEqual(['first', 'second', 'third']);
  });

  it('preserves complex select fields with many options', () => {
    const options = Array.from({ length: 20 }, (_, i) => `option-${i}`);
    const originalFields: TemplateField[] = [
      { field_name: 'large_select', field_type: 'select', options },
    ];

    const serialized = serializeTemplateContent(originalFields);
    const parsed = parseTemplateContent(serialized);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].options).toEqual(options);
  });
});

