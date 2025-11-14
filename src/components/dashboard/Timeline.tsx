"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CheckCircle2, FileText, UserPlus, FileCheck, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface TimelineItem {
  id: string
  type: "offer_created" | "offer_sent" | "client_added" | "template_created"
  title: string
  description?: string
  timestamp: string
  user?: string
}

interface TimelineProps {
  items: TimelineItem[]
  maxItems?: number
}

const typeIcons = {
  offer_created: FileCheck,
  offer_sent: CheckCircle2,
  client_added: UserPlus,
  template_created: FileText,
}

const typeColors = {
  offer_created: "text-primary",
  offer_sent: "text-success",
  client_added: "text-primary",
  template_created: "text-muted-foreground",
}

const typeBgColors = {
  offer_created: "bg-primary/10",
  offer_sent: "bg-success/10",
  client_added: "bg-primary/10",
  template_created: "bg-muted",
}

export function Timeline({ items, maxItems = 10 }: TimelineProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return "Date invalide"
      return formatDistanceToNow(date, { addSuffix: true, locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const displayedItems = items.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucune activité récente</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {displayedItems.map((item, index) => {
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
                          {item.user && (
                            <p className="text-xs text-muted-foreground mt-1">
                              par {item.user}
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
        )}
      </CardContent>
    </Card>
  )
}

