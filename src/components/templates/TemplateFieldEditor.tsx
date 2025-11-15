"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, GripVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { TemplateField } from "@/lib/templates/schema"

interface TemplateFieldEditorProps {
  field: TemplateField
  index: number
  onUpdate: (index: number, updates: Partial<TemplateField>) => void
  onDelete: (index: number) => void
  onValidationChange?: (index: number, isValid: boolean) => void
}

interface FieldErrors {
  field_name?: string
  options?: string
}

export function TemplateFieldEditor({
  field,
  index,
  onUpdate,
  onDelete,
  onValidationChange,
}: TemplateFieldEditorProps) {
  const [optionsText, setOptionsText] = useState(
    field.options?.join(", ") || ""
  )
  const [errors, setErrors] = useState<FieldErrors>({})

  // Fonction de validation
  const validateField = (fieldToValidate: TemplateField): FieldErrors => {
    const newErrors: FieldErrors = {}

    // Validation field_name : obligatoire et non vide
    if (!fieldToValidate.field_name || fieldToValidate.field_name.trim() === "") {
      newErrors.field_name = "Le nom du champ est requis"
    }

    // Validation options pour select : doit avoir au moins une option
    if (fieldToValidate.field_type === "select") {
      if (!fieldToValidate.options || fieldToValidate.options.length === 0) {
        newErrors.options = "Les champs de type 'select' doivent avoir au moins une option"
      } else {
        // Vérifier les doublons dans les options
        const uniqueOptions = new Set(fieldToValidate.options.map(opt => opt.toLowerCase().trim()))
        if (uniqueOptions.size < fieldToValidate.options.length) {
          newErrors.options = "Les options ne doivent pas contenir de doublons"
        }
      }
    }

    return newErrors
  }

  // Valider le champ à chaque changement
  useEffect(() => {
    const newErrors = validateField(field)
    setErrors(newErrors)
    
    // Remonter l'état de validation au parent
    if (onValidationChange) {
      const isValid = Object.keys(newErrors).length === 0
      onValidationChange(index, isValid)
    }
  }, [field, index, onValidationChange])

  // Mettre à jour optionsText quand field.options change depuis l'extérieur
  useEffect(() => {
    if (field.options) {
      setOptionsText(field.options.join(", "))
    } else {
      setOptionsText("")
    }
  }, [field.options])

  const handleOptionsChange = (value: string) => {
    setOptionsText(value)
    const options = value
      .split(",")
      .map((opt) => opt.trim())
      .filter(Boolean)
    
    // Détecter les doublons
    const uniqueOptions = Array.from(new Set(options.map(opt => opt.toLowerCase())))
    const deduplicatedOptions = options.filter((opt, idx) => {
      const lowerOpt = opt.toLowerCase()
      return uniqueOptions.indexOf(lowerOpt) === options.findIndex(o => o.toLowerCase() === lowerOpt)
    })
    
    onUpdate(index, { options: deduplicatedOptions.length > 0 ? deduplicatedOptions : undefined })
  }

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-start gap-3">
        <div className="mt-2 cursor-move text-muted-foreground">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-4">
          {/* Nom du champ */}
          <div className="space-y-2">
            <Label htmlFor={`field-name-${index}`}>
              Nom du champ <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`field-name-${index}`}
              value={field.field_name}
              onChange={(e) =>
                onUpdate(index, { field_name: e.target.value })
              }
              placeholder="Ex: poste, salaire, date_debut"
              className={errors.field_name ? "border-destructive" : ""}
            />
            {errors.field_name && (
              <p className="text-sm text-destructive">{errors.field_name}</p>
            )}
          </div>

          {/* Type et Requis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`field-type-${index}`}>Type</Label>
              <Select
                value={field.field_type}
                onValueChange={(value) =>
                  onUpdate(index, {
                    field_type: value as TemplateField["field_type"],
                    // Réinitialiser les options si ce n'est plus un select
                    options: value === "select" ? field.options : undefined,
                  })
                }
              >
                <SelectTrigger id={`field-type-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texte</SelectItem>
                  <SelectItem value="textarea">Texte long</SelectItem>
                  <SelectItem value="number">Nombre</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Liste déroulante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`field-required-${index}`}>Requis</Label>
              <Select
                value={field.required ? "yes" : "no"}
                onValueChange={(value) =>
                  onUpdate(index, { required: value === "yes" })
                }
              >
                <SelectTrigger id={`field-required-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Oui</SelectItem>
                  <SelectItem value="no">Non</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Placeholder */}
          <div className="space-y-2">
            <Label htmlFor={`field-placeholder-${index}`}>Placeholder</Label>
            <Input
              id={`field-placeholder-${index}`}
              value={field.placeholder || ""}
              onChange={(e) =>
                onUpdate(index, { placeholder: e.target.value || undefined })
              }
              placeholder="Ex: Développeur Full-Stack"
            />
          </div>

          {/* Options pour select */}
          {field.field_type === "select" && (
            <div className="space-y-2">
              <Label htmlFor={`field-options-${index}`}>
                Options <span className="text-destructive">*</span>{" "}
                <span className="text-muted-foreground text-xs">(séparées par des virgules)</span>
              </Label>
              <Textarea
                id={`field-options-${index}`}
                value={optionsText}
                onChange={(e) => handleOptionsChange(e.target.value)}
                placeholder="Ex: CDI, CDD, Stage, Freelance"
                rows={2}
                className={errors.options ? "border-destructive" : ""}
              />
              {errors.options && (
                <p className="text-sm text-destructive">{errors.options}</p>
              )}
              {field.options && field.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {field.options.map((option, optIndex) => (
                    <Badge key={optIndex} variant="secondary">
                      {option}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Badge type */}
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline" className="text-xs">
              {field.field_type}
            </Badge>
            {field.required && (
              <Badge variant="destructive" className="text-xs">
                Requis
              </Badge>
            )}
          </div>

          {/* Meta infos (placeholderRaw et businessKey) - Lecture seule pour l'instant */}
          {(field.meta?.placeholderRaw || field.meta?.businessKey) && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Informations de mapping</Label>
              <div className="flex flex-wrap gap-2">
                {field.meta.placeholderRaw && typeof field.meta.placeholderRaw === 'string' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Placeholder:</span>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {field.meta.placeholderRaw}
                    </Badge>
                  </div>
                )}
                {field.meta.businessKey && typeof field.meta.businessKey === 'string' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Business Key:</span>
                    <Badge variant="outline" className="text-xs font-mono text-primary">
                      {field.meta.businessKey}
                    </Badge>
                  </div>
                )}
              </div>
              {/* TODO: Ajouter un wizard de mapping interactif ici pour permettre de modifier ces valeurs */}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(index)}
          className="mt-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

