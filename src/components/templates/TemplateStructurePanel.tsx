"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Plus, FileText } from "lucide-react"
import { TemplateFieldEditor } from "./TemplateFieldEditor"
import type { TemplateField } from "@/lib/templates/schema"

interface TemplateStructurePanelProps {
  fields: TemplateField[]
  onFieldsChange: (fields: TemplateField[]) => void
  onValidationChange?: (isValid: boolean) => void
}

export function TemplateStructurePanel({
  fields,
  onFieldsChange,
  onValidationChange,
}: TemplateStructurePanelProps) {
  const [fieldValidations, setFieldValidations] = useState<Record<number, boolean>>({})

  // Calculer si tous les champs sont valides
  useEffect(() => {
    if (onValidationChange) {
      const allFieldsValid = fields.every((_, index) => fieldValidations[index] !== false)
      onValidationChange(allFieldsValid)
    }
  }, [fieldValidations, fields, onValidationChange])

  const handleValidationChange = (index: number, isValid: boolean) => {
    setFieldValidations((prev) => ({
      ...prev,
      [index]: isValid,
    }))
  }

  const addField = () => {
    const newField: TemplateField = {
      id: `field-${Date.now()}`,
      field_name: "",
      field_type: "text",
      required: false,
    }
    onFieldsChange([...fields, newField])
    // Le nouveau champ sera invalide (field_name vide), donc isValid = false
    handleValidationChange(fields.length, false)
  }

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field
    )
    onFieldsChange(updatedFields)
  }

  const deleteField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index)
    onFieldsChange(updatedFields)
    
    // Réindexer les validations
    const newValidations: Record<number, boolean> = {}
    updatedFields.forEach((_, i) => {
      if (i < index) {
        newValidations[i] = fieldValidations[i] ?? true
      } else {
        newValidations[i] = fieldValidations[i + 1] ?? true
      }
    })
    setFieldValidations(newValidations)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Structure du formulaire</h2>
          <p className="text-sm text-muted-foreground">
            Définissez les champs de votre template
          </p>
        </div>
        <Button onClick={addField} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un champ
        </Button>
      </div>

      {/* Liste des champs */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Aucun champ
            </h3>
            <p className="text-muted-foreground max-w-md mb-4">
              Commencez par ajouter un champ à votre template.
            </p>
            <Button onClick={addField}>Ajouter un champ</Button>
          </div>
        ) : (
          fields.map((field, index) => (
            <TemplateFieldEditor
              key={field.id ?? `field-${index}`}
              field={field}
              index={index}
              onUpdate={updateField}
              onDelete={deleteField}
              onValidationChange={handleValidationChange}
            />
          ))
        )}
      </div>
    </div>
  )
}

