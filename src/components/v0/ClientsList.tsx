'use client';

import type { Client } from '@/types/domain';

interface ClientsListProps {
  clients: Client[];
  onClientClick?: (client: Client) => void;
}

export function ClientsList({ clients, onClientClick }: ClientsListProps) {
  return (
    <div className="space-y-4">
      {clients.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No clients found
        </div>
      ) : (
        clients.map((client) => (
          <div
            key={client.id}
            className="border rounded-lg p-4 hover:bg-accent cursor-pointer"
            onClick={() => onClientClick?.(client)}
          >
            <h3 className="font-semibold">{client.name || client.company}</h3>
            {client.email && <p className="text-sm text-muted-foreground">{client.email}</p>}
            {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
          </div>
        ))
      )}
    </div>
  );
}

