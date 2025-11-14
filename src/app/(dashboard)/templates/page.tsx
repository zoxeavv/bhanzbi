"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FileText, Calendar, Settings } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { toast } from "sonner"
import type { Template } from "@/types/domain"
import { Input } from "@/components/ui/input"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function loadTemplates() {
      try {
        const res = await fetch("/api/templates")
        if (!res.ok) throw new Error("Failed to fetch templates")
        const data = await res.json()
        setTemplates(data)
      } catch (error) {
        console.error("Error loading templates:", error)
        toast.error("Erreur lors du chargement des templates")
      } finally {
        setLoading(false)
      }
    }
    loadTemplates()
  }, [])

  const filteredTemplates = templates.filter((template) =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-2">Gérez vos modèles d'offres commerciales</p>
        </div>
        <Link href="/templates/nouveau">
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Nouveau template
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template"
          description="Créez votre premier modèle d'offre commerciale."
          actionLabel="Créer un template"
          actionHref="/templates/nouveau"
        />
      ) : (
        <>
          <div className="max-w-md">
            <Input
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Link key={template.id} href={`/templates/${template.id}`}>
                <Card className="h-full hover:border-primary transition-all hover:shadow-lg cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {template.title}
                        </h3>
                        {template.tags.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {template.tags.length} tag{template.tags.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(template.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {template.category && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="h-4 w-4" />
                        <span>{template.category}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Aucun template trouvé pour "{searchQuery}"</div>
          )}
        </>
      )}
    </div>
  )
}
