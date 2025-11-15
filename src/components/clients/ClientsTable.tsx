"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientsTableRow } from "./ClientsTableRow";
import type { Client } from "@/types/domain";

interface ClientsTableProps {
  clients: Client[];
  onDelete?: (clientId: string) => Promise<void>;
}

/**
 * Table des clients avec colonnes : Nom, Société, Email, Date
 */
export function ClientsTable({ clients, onDelete }: ClientsTableProps) {
  if (clients.length === 0) {
    return null; // Empty state géré par le parent
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Société</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <ClientsTableRow key={client.id} client={client} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
