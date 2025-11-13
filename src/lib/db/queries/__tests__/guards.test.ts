import { describe, it, expect } from 'vitest';

function firstOrError<T>(result: T | undefined, error: string): T {
  if (!result) {
    throw new Error(error);
  }
  return result;
}

function normalizeArray<T>(arr: T[] | null | undefined): T[] {
  return Array.isArray(arr) ? arr : [];
}

function normalizeString(str: string | null | undefined): string {
  return str ?? '';
}

function normalizeNumber(num: string | null | undefined, defaultValue: number = 0): number {
  if (num === null || num === undefined) return defaultValue;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
}

describe('guards', () => {
  describe('firstOrError', () => {
    it('returns value when defined', () => {
      expect(firstOrError('test', 'error')).toBe('test');
    });

    it('throws error when undefined', () => {
      expect(() => firstOrError(undefined, 'error')).toThrow('error');
    });
  });

  describe('normalizeArray', () => {
    it('returns array when valid', () => {
      expect(normalizeArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('returns empty array when null', () => {
      expect(normalizeArray(null)).toEqual([]);
    });

    it('returns empty array when undefined', () => {
      expect(normalizeArray(undefined)).toEqual([]);
    });
  });

  describe('normalizeString', () => {
    it('returns string when valid', () => {
      expect(normalizeString('test')).toBe('test');
    });

    it('returns empty string when null', () => {
      expect(normalizeString(null)).toBe('');
    });

    it('returns empty string when undefined', () => {
      expect(normalizeString(undefined)).toBe('');
    });
  });

  describe('normalizeNumber', () => {
    it('returns number when valid', () => {
      expect(normalizeNumber('123')).toBe(123);
    });

    it('returns default when null', () => {
      expect(normalizeNumber(null, 5)).toBe(5);
    });

    it('returns default when undefined', () => {
      expect(normalizeNumber(undefined, 5)).toBe(5);
    });

    it('returns default when NaN', () => {
      expect(normalizeNumber('invalid', 5)).toBe(5);
    });
  });
});


