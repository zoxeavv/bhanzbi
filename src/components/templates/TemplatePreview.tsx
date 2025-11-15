"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Eye } from "lucide-react"
import type { TemplateField } from "@/lib/templates/schema"
import { Badge } from "@/components/ui/badge"

interface TemplatePreviewProps {
  fields: TemplateField[]
}

export function TemplatePreview({ fields }: TemplatePreviewProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }))
  }

  const renderField = (field: TemplateField, index: number) => {
    const value = formData[field.field_name] || ""
    const fieldId = `preview-${field.id ?? `field-${index}`}`
    const fieldKey = field.id ?? `field-${index}`

    switch (field.field_type) {
      case "textarea":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Textarea
              id={fieldId}
              value={value}
              onChange={(e) =>
                handleFieldChange(field.field_name, e.target.value)
              }
              placeholder={field.placeholder || ""}
              required={field.required}
            />
          </div>
        )

      case "select":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.field_name, val)}
            >
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder={field.placeholder || "Sélectionnez..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options && field.options.length > 0 ? (
                  field.options.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    Aucune option disponible
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        )

      case "date":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Input
              id={fieldId}
              type="date"
              value={value}
              onChange={(e) =>
                handleFieldChange(field.field_name, e.target.value)
              }
              required={field.required}
            />
          </div>
        )

      case "number":
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Input
              id={fieldId}
              type="number"
              value={value}
              onChange={(e) =>
                handleFieldChange(field.field_name, e.target.value)
              }
              placeholder={field.placeholder || ""}
              required={field.required}
            />
          </div>
        )

      case "text":
      default:
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldId}>
              {field.field_name}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>
            <Input
              id={fieldId}
              type="text"
              value={value}
              onChange={(e) =>
                handleFieldChange(field.field_name, e.target.value)
              }
              placeholder={field.placeholder || ""}
              required={field.required}
            />
          </div>
        )
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Aperçu du formulaire</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Visualisez le formulaire généré à partir de vos champs
        </p>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto pr-2">
        {fields.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  Aucun champ
                </h3>
                <p className="text-muted-foreground max-w-md">
                  Ajoutez des champs dans le panneau de gauche pour voir
                  l&apos;aperçu ici.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Formulaire</span>
                <Badge variant="secondary">
                  {fields.length} champ{fields.length > 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => renderField(field, index))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

