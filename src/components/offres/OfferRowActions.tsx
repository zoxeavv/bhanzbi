"use client"

import { MoreHorizontal, Eye, Download, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import type { Offer } from "@/types/domain"

interface OfferRowActionsProps {
  offer: Offer
}

export function OfferRowActions({ offer }: OfferRowActionsProps) {
  const router = useRouter()

  // handleView reste pour le dropdown menu (navigation programmatique)
  const handleView = () => {
    router.push(`/offres/${offer.id}`)
  }

  const handleDownload = async () => {
    try {
      // TODO: Implémenter le téléchargement du PDF
      // Pour l'instant, on simule avec un toast
      toast.info("Téléchargement du PDF en cours de développement")
      // Exemple d'implémentation future :
      // const response = await fetch(`/api/offres/${offer.id}/download`)
      // const blob = await response.blob()
      // const url = window.URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = `offre-${offer.id}.pdf`
      // a.click()
    } catch (error) {
      console.error("Error downloading offer:", error)
      toast.error("Erreur lors du téléchargement")
    }
  }

  const handleDuplicate = async () => {
    try {
      // Récupérer les détails de l'offre pour la dupliquer
      const response = await fetch(`/api/offres/${offer.id}`)
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'offre")
      }

      const offerData = await response.json()

      // Créer une nouvelle offre avec les mêmes données
      const duplicateResponse = await fetch("/api/offres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: offerData.client_id,
          template_id: offerData.template_id,
          title: `${offerData.title} (copie)`,
          items: offerData.items,
          subtotal: offerData.subtotal,
          tax_rate: offerData.tax_rate,
          tax_amount: offerData.tax_amount,
          total: offerData.total,
          status: "draft",
        }),
      })

      if (!duplicateResponse.ok) {
        throw new Error("Erreur lors de la duplication")
      }

      const newOffer = await duplicateResponse.json()
      toast.success("Offre dupliquée avec succès")
      router.push(`/offres/${newOffer.id}`)
      router.refresh()
    } catch (error) {
      console.error("Error duplicating offer:", error)
      toast.error("Erreur lors de la duplication de l'offre")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-4 w-4" />
          Voir
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Télécharger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          Dupliquer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

