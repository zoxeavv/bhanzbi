import { describe, it, expect } from 'vitest';
import { filterClients, extractSectorsFromClients } from '../client-filters';
import type { ClientWithOffersCount } from '@/types/domain';

// Helper pour créer un client de test
function createTestClient(
  id: string,
  name: string,
  company: string,
  email: string,
  tags: string[] = [],
  offersCount: number = 0
): ClientWithOffersCount {
  return {
    id,
    name,
    company,
    email,
    phone: '',
    tags,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    offersCount,
  };
}

describe('client-filters utils', () => {
  const mockClients: ClientWithOffersCount[] = [
    createTestClient('1', 'Jean Dupont', 'TechCorp', 'jean@techcorp.fr', ['Technologie', 'Finance']),
    createTestClient('2', 'Marie Martin', 'FinanceInc', 'marie@finance.fr', ['Finance']),
    createTestClient('3', 'Pierre Durand', 'CommercePlus', 'pierre@commerce.fr', ['Commerce']),
    createTestClient('4', 'Sophie Bernard', 'TechStart', 'sophie@techstart.fr', []),
  ];

  describe('filterClients', () => {
    it('filtre par searchQuery dans le nom de l\'entreprise', () => {
      const result = filterClients(mockClients, 'TechCorp', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('TechCorp');
    });

    it('filtre par searchQuery dans le nom du contact', () => {
      const result = filterClients(mockClients, 'Jean', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jean Dupont');
    });

    it('filtre par searchQuery dans l\'email', () => {
      const result = filterClients(mockClients, 'marie@finance.fr', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('marie@finance.fr');
    });

    it('recherche insensible à la casse', () => {
      const result = filterClients(mockClients, 'TECHCORP', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('TechCorp');
    });

    it('filtre par secteur uniquement', () => {
      const result = filterClients(mockClients, '', 'Finance');
      expect(result).toHaveLength(2);
      expect(result.every(client => client.tags.includes('Finance'))).toBe(true);
    });

    it('filtre par secteur "all" retourne tous les clients', () => {
      const result = filterClients(mockClients, '', 'all');
      expect(result).toHaveLength(mockClients.length);
    });

    it('filtre par secteur "none" retourne les clients sans tags', () => {
      const result = filterClients(mockClients, '', 'none');
      expect(result).toHaveLength(1);
      expect(result[0].tags).toHaveLength(0);
    });

    it('combine searchQuery et secteur', () => {
      const result = filterClients(mockClients, 'Tech', 'Technologie');
      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('TechCorp');
      expect(result[0].tags).toContain('Technologie');
    });

    it('retourne un tableau vide si aucun client ne correspond', () => {
      const result = filterClients(mockClients, 'Inexistant', 'all');
      expect(result).toHaveLength(0);
    });

    it('retourne un tableau vide si le secteur ne correspond pas', () => {
      const result = filterClients(mockClients, '', 'Inexistant');
      expect(result).toHaveLength(0);
    });

    it('gère une recherche partielle dans le nom', () => {
      const result = filterClients(mockClients, 'Dup', 'all');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jean Dupont');
    });

    it('gère une recherche partielle dans l\'entreprise', () => {
      const result = filterClients(mockClients, 'Tech', 'all');
      expect(result).toHaveLength(2);
      expect(result.every(client => client.company.toLowerCase().includes('tech'))).toBe(true);
    });
  });

  describe('extractSectorsFromClients', () => {
    it('extrait tous les secteurs uniques', () => {
      const result = extractSectorsFromClients(mockClients);
      expect(result).toContain('Technologie');
      expect(result).toContain('Finance');
      expect(result).toContain('Commerce');
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('retourne un tableau vide pour une liste vide', () => {
      const result = extractSectorsFromClients([]);
      expect(result).toEqual([]);
    });

    it('retourne un tableau vide si aucun client n\'a de tags', () => {
      const clientsWithoutTags = [
        createTestClient('1', 'Jean', 'Company', 'jean@company.fr', []),
        createTestClient('2', 'Marie', 'Company2', 'marie@company.fr', []),
      ];
      const result = extractSectorsFromClients(clientsWithoutTags);
      expect(result).toEqual([]);
    });

    it('déduplique les secteurs', () => {
      const clientsWithDuplicates = [
        createTestClient('1', 'Jean', 'Company1', 'jean@company.fr', ['Technologie']),
        createTestClient('2', 'Marie', 'Company2', 'marie@company.fr', ['Technologie', 'Finance']),
        createTestClient('3', 'Pierre', 'Company3', 'pierre@company.fr', ['Finance']),
      ];
      const result = extractSectorsFromClients(clientsWithDuplicates);
      expect(result).toContain('Technologie');
      expect(result).toContain('Finance');
      expect(result.filter(s => s === 'Technologie').length).toBe(1);
      expect(result.filter(s => s === 'Finance').length).toBe(1);
    });

    it('filtre les tags vides', () => {
      const clientsWithEmptyTags = [
        createTestClient('1', 'Jean', 'Company', 'jean@company.fr', ['Technologie', '']),
        createTestClient('2', 'Marie', 'Company2', 'marie@company.fr', ['Finance']),
      ];
      const result = extractSectorsFromClients(clientsWithEmptyTags);
      expect(result).not.toContain('');
      expect(result).toContain('Technologie');
      expect(result).toContain('Finance');
    });
  });
});

