"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2, FileText, FileCheck, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import type { Offer } from "@/types/domain"

interface ActivityItem {
  id: string
  type: "offer_created" | "offer_sent" | "offer_accepted" | "offer_rejected"
  title: string
  description?: string
  timestamp: string
}

interface ClientActivityTimelineProps {
  offers: Offer[]
}

const typeIcons = {
  offer_created: FileCheck,
  offer_sent: FileCheck,
  offer_accepted: CheckCircle2,
  offer_rejected: FileText,
}

const typeColors = {
  offer_created: "text-primary",
  offer_sent: "text-primary",
  offer_accepted: "text-success",
  offer_rejected: "text-destructive",
}

const typeBgColors = {
  offer_created: "bg-primary/10",
  offer_sent: "bg-primary/10",
  offer_accepted: "bg-success/10",
  offer_rejected: "bg-destructive/10",
}

export function ClientActivityTimeline({ offers }: ClientActivityTimelineProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return "Date invalide"
      return formatDistanceToNow(date, { addSuffix: true, locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  // Générer les activités depuis les offres
  const activities: ActivityItem[] = offers.flatMap((offer) => {
    const items: ActivityItem[] = [
      {
        id: `${offer.id}-created`,
        type: "offer_created",
        title: "Offre créée",
        description: offer.title || `Offre #${offer.id.slice(0, 8)}`,
        timestamp: offer.created_at,
      },
    ]

    // Ajouter les événements selon le statut
    if (offer.status === "sent") {
      items.push({
        id: `${offer.id}-sent`,
        type: "offer_sent",
        title: "Offre envoyée",
        description: offer.title || `Offre #${offer.id.slice(0, 8)}`,
        timestamp: offer.updated_at,
      })
    }

    if (offer.status === "accepted") {
      items.push({
        id: `${offer.id}-accepted`,
        type: "offer_accepted",
        title: "Offre acceptée",
        description: offer.title || `Offre #${offer.id.slice(0, 8)}`,
        timestamp: offer.updated_at,
      })
    }

    if (offer.status === "rejected") {
      items.push({
        id: `${offer.id}-rejected`,
        type: "offer_rejected",
        title: "Offre refusée",
        description: offer.title || `Offre #${offer.id.slice(0, 8)}`,
        timestamp: offer.updated_at,
      })
    }

    return items
  })

  // Trier par date décroissante
  const sortedActivities = activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  if (sortedActivities.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucune activité récente
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sortedActivities.map((item) => {
              const Icon = typeIcons[item.type]
              const iconColor = typeColors[item.type]
              const iconBg = typeBgColors[item.type]

              return (
                <div key={item.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background",
                      iconBg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

