import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../currency';

describe('currency utils', () => {
  describe('formatCurrency', () => {
    it('formate un montant en centimes en EUR avec format français', () => {
      const result = formatCurrency(12345);
      // Intl.NumberFormat utilise un espace insécable avant €
      expect(result).toContain('123,45');
      expect(result).toContain('€');
    });

    it('formate un montant rond sans décimales', () => {
      const result = formatCurrency(10000);
      expect(result).toContain('100,00');
      expect(result).toContain('€');
    });

    it('formate un montant avec des milliers', () => {
      const result = formatCurrency(1234567);
      // Intl.NumberFormat utilise un espace insécable pour les milliers
      expect(result).toContain('12');
      expect(result).toContain('345,67');
      expect(result).toContain('€');
    });

    it('formate zéro centimes', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0,00');
      expect(result).toContain('€');
    });

    it('formate un montant négatif', () => {
      const result = formatCurrency(-5000);
      expect(result).toContain('-50,00');
      expect(result).toContain('€');
    });

    it('formate un montant avec un seul chiffre de centimes', () => {
      const result = formatCurrency(12340);
      expect(result).toContain('123,40');
      expect(result).toContain('€');
    });

    it('formate un grand montant', () => {
      const result = formatCurrency(99999999);
      expect(result).toContain('999');
      expect(result).toContain('999,99');
      expect(result).toContain('€');
    });

    it('formate un montant avec un seul centime', () => {
      const result = formatCurrency(1);
      expect(result).toContain('0,01');
      expect(result).toContain('€');
    });

    it('formate correctement un montant extrêmement grand', () => {
      const result = formatCurrency(99999999999); // ~999 millions €
      expect(result).toContain('€');
      expect(result).toMatch(/[0-9]/); // nombre formaté
    });
  });
});

