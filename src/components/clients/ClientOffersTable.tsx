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
import { FileCheck, ArrowRight } from "lucide-react"
import type { Offer } from "@/types/domain"
import { cn } from "@/lib/utils"

interface ClientOffersTableProps {
  offers: Offer[]
}

export function ClientOffersTable({ offers }: ClientOffersTableProps) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Date invalide"
      return format(date, "dd MMM yyyy", { locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const formatTotal = (total: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(total / 100)
  }

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
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Date</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow
              key={offer.id}
              className={cn("cursor-pointer hover:bg-muted/50 transition-colors")}
            >
              <TableCell className="font-medium">
                <Link
                  href={`/offres/${offer.id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {offer.title || `Offre #${offer.id.slice(0, 8)}`}
                </Link>
              </TableCell>
              <TableCell>{getStatusBadge(offer.status)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatTotal(offer.total)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-sm">
                {formatDate(offer.created_at)}
              </TableCell>
              <TableCell>
                <Link
                  href={`/offres/${offer.id}`}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

