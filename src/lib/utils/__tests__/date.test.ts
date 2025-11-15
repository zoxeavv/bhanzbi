import { describe, it, expect } from 'vitest';
import { formatDate, formatRelativeDate } from '../date';

describe('date utils', () => {
  describe('formatDate', () => {
    it('formate une date valide avec le format par défaut', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString);
      // Format attendu: "dd MMM yyyy" (ex: "15 janv. 2024")
      // Le format français peut varier légèrement selon la locale
      expect(result).toMatch(/\d{1,2}\s\w+\.?\s\d{4}/);
      expect(result).not.toBe('Date invalide');
      expect(result).toContain('2024');
    });

    it('formate une date valide avec un format personnalisé', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString, 'dd/MM/yyyy');
      expect(result).toBe('15/01/2024');
    });

    it('formate une date valide avec format long', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const result = formatDate(dateString, 'dd MMMM yyyy');
      expect(result).toMatch(/\d{1,2}\s\w+\s\d{4}/);
      expect(result).not.toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une date invalide', () => {
      const invalidDate = 'invalid-date';
      const result = formatDate(invalidDate);
      expect(result).toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une chaîne vide', () => {
      const emptyDate = '';
      const result = formatDate(emptyDate);
      expect(result).toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une date NaN', () => {
      const nanDate = '2024-13-45T99:99:99Z'; // Date invalide
      const result = formatDate(nanDate);
      expect(result).toBe('Date invalide');
    });
  });

  describe('formatRelativeDate', () => {
    it('formate une date valide en format relatif', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatRelativeDate(yesterday.toISOString());
      expect(result).toContain('il y a');
      expect(result).not.toBe('Date invalide');
    });

    it('formate une date future en format relatif', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = formatRelativeDate(tomorrow.toISOString());
      expect(result).toContain('dans');
      expect(result).not.toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une date invalide', () => {
      const invalidDate = 'invalid-date';
      const result = formatRelativeDate(invalidDate);
      expect(result).toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une chaîne vide', () => {
      const emptyDate = '';
      const result = formatRelativeDate(emptyDate);
      expect(result).toBe('Date invalide');
    });

    it('retourne "Date invalide" pour une date NaN', () => {
      const nanDate = '2024-13-45T99:99:99Z';
      const result = formatRelativeDate(nanDate);
      expect(result).toBe('Date invalide');
    });
  });
});

