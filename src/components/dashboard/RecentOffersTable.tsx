"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowRight, FileCheck } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Offer {
  id: string
  title: string
  total: number | null | undefined
  created_at: string | null | undefined
  clientName?: string
  status?: string
}

interface RecentOffersTableProps {
  offers: Offer[]
  maxItems?: number
}

export function RecentOffersTable({ offers, maxItems = 5 }: RecentOffersTableProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Date inconnue"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "Date invalide"
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatTotal = (total: number | null | undefined) => {
    const safeTotal = total ?? 0
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(safeTotal / 100)
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Brouillon", variant: "outline" },
      sent: { label: "Envoyée", variant: "default" },
      accepted: { label: "Acceptée", variant: "default" },
      rejected: { label: "Refusée", variant: "destructive" },
    }

    const statusConfig = statusMap[status.toLowerCase()] || { label: status, variant: "secondary" as const }
    
    return (
      <Badge variant={statusConfig.variant} className="text-xs">
        {statusConfig.label}
      </Badge>
    )
  }

  const displayedOffers = offers.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Offres récentes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/offres">
            Voir tout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {displayedOffers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucune offre récente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Créez votre première offre pour commencer
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedOffers.map((offer) => (
                  <TableRow key={offer.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/offres/${offer.id}`} className="hover:underline">
                        {offer.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {offer.clientName || "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(offer.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatTotal(offer.total)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(offer.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

