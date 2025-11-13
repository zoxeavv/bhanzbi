"use client"

import type { OffreVersion } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Download, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface VersionTimelineProps {
  versions: OffreVersion[]
  onRestore?: (version: OffreVersion) => void
}

export function VersionTimeline({ versions, onRestore }: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Aucune version disponible</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {versions.map((version, index) => (
        <Card key={version.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">Version {version.version_number}</h4>
                  {index === 0 && <Badge variant="default">Actuelle</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(version.created_at).toLocaleString("fr-FR", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
                {version.pdf_path && (
                  <p className="text-xs text-muted-foreground mt-1">PDF généré: {version.pdf_path}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {version.pdf_path && (
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  PDF
                </Button>
              )}
              {index !== 0 && onRestore && (
                <Button variant="outline" size="sm" onClick={() => onRestore(version)} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Restaurer
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
