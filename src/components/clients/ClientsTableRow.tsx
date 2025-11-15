"use client";

import { useRouter } from "next/navigation";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { ClientRowActions } from "./ClientRowActions";
import type { Client } from "@/types/domain";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";

interface ClientsTableRowProps {
  client: Client;
  onDelete?: (clientId: string) => Promise<void>;
}

/**
 * Ligne de la table des clients
 * 
 * Cliquable pour naviguer vers /clients/[id]
 */
export function ClientsTableRow({ client, onDelete }: ClientsTableRowProps) {
  const router = useRouter();

  const handleRowClick = () => {
    router.push(`/clients/${client.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRowClick();
    }
  };

  return (
    <TableRow
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      aria-label={`Voir les détails de ${client.name || client.company || "ce client"}`}
    >
      <TableCell className="font-medium">
        {client.name}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.company || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {client.email || "-"}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatDate(client.created_at)}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()} className="w-[70px]">
        <ClientRowActions client={client} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}
