"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Building2, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  created_at: string
  avatar?: string
}

interface RecentClientsProps {
  clients: Client[]
  maxItems?: number
}

export function RecentClients({ clients, maxItems = 5 }: RecentClientsProps) {
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return "Date invalide"
      return formatDistanceToNow(date, { addSuffix: true, locale: fr })
    } catch {
      return "Date invalide"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const displayedClients = clients.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Clients récents</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            Voir tout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {displayedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Aucun client récent</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ajoutez votre premier client pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedClients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={client.avatar} alt={client.name} />
                  <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    {client.company && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{client.company}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(client.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

