"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, FileText, Search } from "lucide-react"
import { EmptyState } from "@/components/ui/EmptyState"
import { TemplateCard } from "@/components/templates/TemplateCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Toolbar } from "@/components/ui/Toolbar"

interface TemplateWithUsage {
  id: string
  title: string
  slug: string
  content: string
  category: string
  tags: string[]
  created_at: string
  updated_at: string
  lastUsedAt?: string | null
}

interface TemplatesPageClientProps {
  templates: TemplateWithUsage[]
}

export function TemplatesPageClient({ templates }: TemplatesPageClientProps) {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  // Afficher les messages d'erreur depuis les query params (redirections depuis les pages)
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      switch (error) {
        case 'template_not_found':
          toast.error("Le template demandé est introuvable.")
          break
        case 'template_load_failed':
          toast.error("Impossible de charger les templates. Veuillez réessayer.")
          break
        case 'unauthorized':
          toast.error("Vous n'êtes pas autorisé à accéder à cette page.")
          break
        default:
          toast.error("Une erreur est survenue.")
      }
      // Nettoyer l'URL en supprimant le paramètre d'erreur
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  // Extraire les catégories uniques
  const categories = Array.from(
    new Set(templates.map((template) => template.category).filter(Boolean))
  )

  // Filtrer les templates
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )

    const matchesCategory =
      categoryFilter === "all" ||
      template.category === categoryFilter ||
      (categoryFilter === "none" && !template.category)

    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Templates"
        description="Gérez vos modèles d'offres commerciales et créez des offres rapidement"
        actions={
          <Link href="/templates/nouveau">
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nouveau template
            </Button>
          </Link>
        }
      />

      {/* Search et filtres */}
      {templates.length > 0 && (
        <Toolbar>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="none">Non renseigné</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Toolbar>
      )}

      {/* Contenu */}
      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template"
          description="Créez votre premier modèle d'offre commerciale pour accélérer la création de vos offres."
          actionLabel="Créer un template"
          actionHref="/templates/nouveau"
        />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun template trouvé"
          description="Aucun template ne correspond à vos critères de recherche."
          actionLabel="Créer un template"
          actionHref="/templates/nouveau"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}

