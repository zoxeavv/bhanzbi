"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { OfferRowActions } from "./OfferRowActions"
import type { Offer } from "@/types/domain"
import { cn } from "@/lib/utils"

interface OfferWithRelations extends Offer {
  clientName?: string
  templateName?: string
}

interface OffersTableProps {
  offers: OfferWithRelations[]
}

const statusConfig = {
  draft: { label: "Brouillon", variant: "secondary" as const },
  sent: { label: "Envoyée", variant: "default" as const },
  accepted: { label: "Acceptée", variant: "default" as const },
  rejected: { label: "Refusée", variant: "destructive" as const },
}

export function OffersTable({ offers }: OffersTableProps) {
  const router = useRouter()
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Date invalide"
      return format(date, "dd MMM yyyy", { locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const formatAmount = (amountInCentimes: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amountInCentimes / 100)
  }

  const formatId = (id: string) => {
    // Afficher les 8 premiers caractères de l'ID
    return id.substring(0, 8).toUpperCase()
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Aucune offre trouvée
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Template</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow
              key={offer.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors"
              )}
              onClick={() => {
                router.push(`/offres/${offer.id}`)
              }}
            >
              <TableCell className="font-mono text-sm text-muted-foreground">
                <Link
                  href={`/offres/${offer.id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {formatId(offer.id)}
                </Link>
              </TableCell>
              <TableCell className="font-medium">
                <Link
                  href={`/clients/${offer.client_id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {offer.clientName || "Client inconnu"}
                </Link>
              </TableCell>
              <TableCell>
                <Badge
                  variant={statusConfig[offer.status].variant}
                  className="text-xs"
                >
                  {statusConfig[offer.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {offer.templateName || (
                  <span className="text-muted-foreground/50">Aucun</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(offer.total)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(offer.created_at)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <OfferRowActions offer={offer} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

