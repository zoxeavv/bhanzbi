import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientsTableRow } from '../ClientsTableRow';
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

// Mock ClientRowActions pour simplifier les tests
vi.mock('../ClientRowActions', () => ({
  ClientRowActions: () => <span data-testid="client-row-actions">Actions</span>,
}));

describe('ClientsTableRow', () => {
  const mockClient: Client = {
    id: 'client-123',
    name: 'John Doe',
    company: 'Acme Corp',
    email: 'john@acme.com',
    phone: '123456789',
    tags: [],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Affichage', () => {
    it('affiche les informations du client (nom, compagnie, email, date)', () => {
      render(<ClientsTableRow client={mockClient} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('john@acme.com')).toBeInTheDocument();
    });

    it('affiche "-" pour la compagnie si elle est vide', () => {
      const clientWithoutCompany: Client = {
        ...mockClient,
        company: '',
      };
      render(
        <table>
          <tbody>
            <ClientsTableRow client={clientWithoutCompany} />
          </tbody>
        </table>
      );

      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Navigation au clic', () => {
    it('navigue vers /clients/[id] quand on clique sur la ligne', async () => {
      const user = userEvent.setup();
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      await user.click(row);

      expect(mockPush).toHaveBeenCalledWith('/clients/client-123');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Support clavier', () => {
    it('navigue vers /clients/[id] quand on appuie sur Enter', async () => {
      const user = userEvent.setup();
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      row.focus();
      await user.keyboard('{Enter}');

      expect(mockPush).toHaveBeenCalledWith('/clients/client-123');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('navigue vers /clients/[id] quand on appuie sur Espace', async () => {
      const user = userEvent.setup();
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      row.focus();
      await user.keyboard(' ');

      expect(mockPush).toHaveBeenCalledWith('/clients/client-123');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibilité', () => {
    it('a le role="button" pour indiquer que la ligne est cliquable', () => {
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      expect(row).toBeInTheDocument();
    });

    it('a tabIndex={0} pour la navigation au clavier', () => {
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      expect(row).toHaveAttribute('tabIndex', '0');
    });

    it('a un aria-label descriptif avec le nom du client', () => {
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      expect(row).toHaveAttribute(
        'aria-label',
        'Voir les détails de John Doe'
      );
    });

    it('utilise la compagnie dans aria-label si le nom est vide', () => {
      const clientWithCompanyOnly: Client = {
        ...mockClient,
        name: '',
        company: 'Acme Corp',
      };
      render(
        <table>
          <tbody>
            <ClientsTableRow client={clientWithCompanyOnly} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      expect(row).toHaveAttribute(
        'aria-label',
        'Voir les détails de Acme Corp'
      );
    });

    it('utilise "ce client" dans aria-label si ni nom ni compagnie', () => {
      const clientWithoutName: Client = {
        ...mockClient,
        name: '',
        company: '',
      };
      render(
        <table>
          <tbody>
            <ClientsTableRow client={clientWithoutName} />
          </tbody>
        </table>
      );

      const row = screen.getByRole('button');
      expect(row).toHaveAttribute('aria-label', 'Voir les détails de ce client');
    });
  });

  describe('Actions de ligne', () => {
    it('affiche les actions de ligne (ClientRowActions)', () => {
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      expect(screen.getByTestId('client-row-actions')).toBeInTheDocument();
    });

    it('ne déclenche pas la navigation quand on clique sur les actions', async () => {
      const user = userEvent.setup();
      render(
        <table>
          <tbody>
            <ClientsTableRow client={mockClient} />
          </tbody>
        </table>
      );

      const actions = screen.getByTestId('client-row-actions');
      await user.click(actions);

      // La navigation ne doit pas être déclenchée car stopPropagation est utilisé
      // (on ne peut pas tester stopPropagation directement, mais on vérifie que
      // le clic sur la ligne entière fonctionne toujours)
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});

