import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientsTableSection } from '../ClientsTableSection';
import type { Client } from '@/types/domain';

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock window.confirm
const mockConfirm = vi.fn();
window.confirm = mockConfirm;

// Mock fetch
global.fetch = vi.fn();

describe('ClientsTableSection', () => {
  const mockClients: Client[] = [
    {
      id: '1',
      name: 'John Doe',
      company: 'Acme Corp',
      email: 'john@acme.com',
      phone: '123456789',
      tags: [],
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      name: 'Jane Smith',
      company: 'Tech Inc',
      email: 'jane@tech.com',
      phone: '987654321',
      tags: [],
      created_at: '2024-01-02T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
    },
    {
      id: '3',
      name: 'Bob Wilson',
      company: 'StartupXYZ',
      email: 'bob@startup.com',
      phone: '555555555',
      tags: [],
      created_at: '2024-01-03T00:00:00.000Z',
      updated_at: '2024-01-03T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
  });

  describe('Affichage des clients', () => {
    it('affiche les clients passés en props avec nom, email et compagnie', () => {
      render(<ClientsTableSection initialClients={mockClients} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('john@acme.com')).toBeInTheDocument();

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Tech Inc')).toBeInTheDocument();
      expect(screen.getByText('jane@tech.com')).toBeInTheDocument();

      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
      expect(screen.getByText('bob@startup.com')).toBeInTheDocument();
    });

    it('affiche la toolbar de recherche quand il y a des clients', () => {
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Recherche textuelle', () => {
    it('filtre les clients par nom (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'john');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('filtre les clients par nom en majuscules (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'JOHN');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('filtre les clients par compagnie (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'acme');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('filtre les clients par email (case-insensitive)', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'jane@tech');

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Tech Inc')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('affiche tous les clients quand la recherche est vide', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'xyz');
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

      await user.clear(searchInput);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('affiche "Aucun client" quand initialClients.length === 0', () => {
      render(<ClientsTableSection initialClients={[]} />);

      expect(screen.getByText('Aucun client')).toBeInTheDocument();
      expect(
        screen.getByText('Commencez par ajouter votre premier client.')
      ).toBeInTheDocument();
      expect(screen.getByText('Ajouter un client')).toBeInTheDocument();

      // Ne doit pas afficher la toolbar de recherche
      expect(
        screen.queryByPlaceholderText(
          'Rechercher un client (nom, société, email)...'
        )
      ).not.toBeInTheDocument();
    });

    it('affiche "Aucun résultat" quand la recherche ne retourne aucun résultat', async () => {
      const user = userEvent.setup();
      render(<ClientsTableSection initialClients={mockClients} />);

      const searchInput = screen.getByPlaceholderText(
        'Rechercher un client (nom, société, email)...'
      );

      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
      expect(
        screen.getByText('Aucun client ne correspond à ces critères.')
      ).toBeInTheDocument();
      expect(screen.getByText('Ajouter un client')).toBeInTheDocument();

      // Ne doit pas afficher les clients
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });
});

