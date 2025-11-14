"use client"

import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ClientRowActions } from "./ClientRowActions"
import type { Client } from "@/types/domain"
import { cn } from "@/lib/utils"

interface ClientWithOffersCount extends Client {
  offersCount?: number
}

interface ClientsTableProps {
  clients: ClientWithOffersCount[]
  onDelete?: (clientId: string) => Promise<void>
}

export function ClientsTable({ clients, onDelete }: ClientsTableProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Date invalide"
      return format(date, "dd MMM yyyy", { locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const getSector = (tags: string[]) => {
    // Le secteur peut être dans les tags ou déduit
    // Pour l'instant, on prend le premier tag comme secteur
    return tags.length > 0 ? tags[0] : "Non renseigné"
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucun client trouvé
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Entreprise</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Secteur</TableHead>
            <TableHead className="text-center">Nb offres</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={() => {
                window.location.href = `/clients/${client.id}`
              }}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/clients/${client.id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {client.company || client.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.name}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {client.email || "-"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {getSector(client.tags)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {client.offersCount ?? 0}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(client.created_at)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <ClientRowActions client={client} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

