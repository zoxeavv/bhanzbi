import { describe, it, expect } from 'vitest';
import { parseTags, getPrimarySector } from '../tags';

describe('tags utils', () => {
  describe('parseTags', () => {
    it('parse une chaîne avec des virgules', () => {
      const result = parseTags('Technologie, Finance, Commerce');
      expect(result).toEqual(['Technologie', 'Finance', 'Commerce']);
    });

    it('parse une chaîne avec des pipes', () => {
      const result = parseTags('Technologie|Finance|Commerce');
      expect(result).toEqual(['Technologie', 'Finance', 'Commerce']);
    });

    it('parse une chaîne mixte virgules et pipes', () => {
      const result = parseTags('Technologie, Finance|Commerce');
      expect(result).toEqual(['Technologie', 'Finance', 'Commerce']);
    });

    it('supprime les espaces autour des tags', () => {
      const result = parseTags('  Technologie  ,  Finance  ,  Commerce  ');
      expect(result).toEqual(['Technologie', 'Finance', 'Commerce']);
    });

    it('retourne un tableau vide pour une chaîne vide', () => {
      const result = parseTags('');
      expect(result).toEqual([]);
    });

    it('retourne un tableau vide pour une chaîne avec uniquement des espaces', () => {
      const result = parseTags('   ');
      expect(result).toEqual([]);
    });

    it('filtre les tags vides après trim', () => {
      const result = parseTags('Technologie,,Finance, ,Commerce');
      expect(result).toEqual(['Technologie', 'Finance', 'Commerce']);
    });

    it('gère une chaîne avec un seul tag', () => {
      const result = parseTags('Technologie');
      expect(result).toEqual(['Technologie']);
    });

    it('gère une chaîne avec des tags séparés par pipe uniquement', () => {
      const result = parseTags('A|B|C');
      expect(result).toEqual(['A', 'B', 'C']);
    });

    it('gère une chaîne avec des tags séparés par virgule uniquement', () => {
      const result = parseTags('A,B,C');
      expect(result).toEqual(['A', 'B', 'C']);
    });
  });

  describe('getPrimarySector', () => {
    it('retourne le premier tag quand des tags sont présents', () => {
      const result = getPrimarySector(['Technologie', 'Finance', 'Commerce']);
      expect(result).toBe('Technologie');
    });

    it('retourne le seul tag présent', () => {
      const result = getPrimarySector(['Technologie']);
      expect(result).toBe('Technologie');
    });

    it('retourne "Non renseigné" pour un tableau vide', () => {
      const result = getPrimarySector([]);
      expect(result).toBe('Non renseigné');
    });

    it('gère correctement un tag avec espaces', () => {
      const result = getPrimarySector(['  Technologie  ', 'Finance']);
      expect(result).toBe('  Technologie  '); // Note: ne trim pas, retourne tel quel
    });
  });
});

