"use client"

import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileCheck } from "lucide-react"
import type { Offer } from "@/types/domain"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils/date"
import { formatCurrency } from "@/lib/utils/currency"

interface ClientOffersTableProps {
  offers: Offer[]
}

export function ClientOffersTable({ offers }: ClientOffersTableProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      draft: { label: "Brouillon", variant: "outline" },
      sent: { label: "Envoyée", variant: "default" },
      accepted: { label: "Acceptée", variant: "default" },
      rejected: { label: "Refusée", variant: "destructive" },
    }

    const statusConfig =
      statusMap[status.toLowerCase()] || { label: status, variant: "secondary" as const }

    return (
      <Badge variant={statusConfig.variant} className="text-xs">
        {statusConfig.label}
      </Badge>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Aucune offre</p>
        <p className="text-xs text-muted-foreground mt-1">
          Créez votre première offre pour ce client
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow
              key={offer.id}
              className={cn("cursor-pointer hover:bg-muted/50 transition-colors")}
              onClick={() => {
                router.push(`/offres/${offer.id}`);
              }}
            >
              <TableCell className="font-medium">
                {offer.title || `Offre #${offer.id.slice(0, 8)}`}
              </TableCell>
              <TableCell>{getStatusBadge(offer.status)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(offer.total)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {formatDate(offer.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

