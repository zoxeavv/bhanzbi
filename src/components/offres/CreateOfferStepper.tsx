"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, CheckCircle2, Circle } from "lucide-react"
import { ClientForm } from "@/components/clients/ClientForm"
import { toast } from "sonner"
import type { Client } from "@/types/domain"
import type { Template } from "@/types/domain"
import type { TemplateField } from "@/lib/templates/schema"
import { cn } from "@/lib/utils"
import { parseTemplateContent } from "@/lib/templates/content"
import { createOfferSchema, type CreateOfferInput } from "@/lib/validations"
import { fetchJsonOrThrow } from "@/lib/api/fetchJson"

interface CreateOfferStepperProps {
  onComplete: (data: {
    client_id: string
    template_id: string | null
    title: string
    items: Array<{
      id: string
      description: string
      quantity: number
      unit_price: number
      total: number
    }>
    subtotal: number
    tax_rate: number
    tax_amount: number
    total: number
  }) => Promise<void>
  initialClientId?: string | null
}

const steps = [
  { id: 1, label: "Client" },
  { id: 2, label: "Template" },
  { id: 3, label: "Champs" },
  { id: 4, label: "Récapitulatif" },
]

export function CreateOfferStepper({ onComplete, initialClientId = null }: CreateOfferStepperProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [templateFields, setTemplateFields] = useState<TemplateField[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [clientSearch, setClientSearch] = useState("")
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Formulaire avec react-hook-form et validation Zod
  const {
    register,
    handleSubmit: submitForm,
    formState: { errors },
    trigger,
    setValue,
    watch,
  } = useForm<CreateOfferInput>({
    resolver: zodResolver(createOfferSchema),
    mode: "onChange",
    defaultValues: {
      client_id: "",
      template_id: null,
      title: "",
      items: [],
      subtotal: 0,
      tax_rate: 20,
      tax_amount: 0,
      total: 0,
      status: "draft",
    },
  })

  // Charger les données
  useEffect(() => {
    async function loadData() {
      try {
        const [clientsResult, templatesData] = await Promise.all([
          fetchJsonOrThrow<{ data: Client[]; page: number; pageSize: number; totalCount: number }>("/api/clients"),
          fetchJsonOrThrow<Template[]>("/api/templates"),
        ])

        // L'API /api/clients retourne toujours { data, page, pageSize, totalCount }
        const clientsData: Client[] = clientsResult.data ?? []

        setClients(clientsData)
        setTemplates(templatesData)
      } catch (error) {
        console.error("Error loading data:", error)
        const errorMessage = error instanceof Error ? error.message : "Erreur lors du chargement des données"
        toast.error(errorMessage)
      }
    }
    loadData()
  }, [])

  // Pré-sélectionner le client si initialClientId est fourni
  useEffect(() => {
    if (initialClientId && clients.length > 0 && !selectedClient) {
      const clientToSelect = clients.find((client) => client.id === initialClientId)
      if (clientToSelect) {
        setSelectedClient(clientToSelect)
        setValue("client_id", clientToSelect.id)
      } else {
        // Le clientId fourni n'existe pas dans la liste des clients
        toast("Le client sélectionné n'existe plus. Merci de choisir un client.", {
          icon: "⚠️",
        })
      }
    }
  }, [initialClientId, clients, selectedClient, setValue])

  // Charger les champs du template sélectionné
  useEffect(() => {
    if (selectedTemplate) {
      const fields = parseTemplateContent(selectedTemplate.content)
      if (fields.length > 0) {
        setTemplateFields(fields)
        // Initialiser les valeurs des champs
        const initialValues: Record<string, string> = {}
        fields.forEach((field: TemplateField) => {
          initialValues[field.id || ""] = ""
        })
        setFieldValues(initialValues)
      } else {
        setTemplateFields([])
      }
    } else {
      setTemplateFields([])
    }
  }, [selectedTemplate])

  // Filtrer les clients
  const filteredClients = clients.filter((client) =>
    (client.company || client.name)
      .toLowerCase()
      .includes(clientSearch.toLowerCase())
  )

  // Créer un nouveau client
  const handleCreateClient = async (data: {
    name: string
    company: string
    email?: string
    phone?: string
    tags?: string[]
  }) => {
    try {
      const newClient = await fetchJsonOrThrow<Client>("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      setClients([...clients, newClient])
      setSelectedClient(newClient)
      setValue("client_id", newClient.id)
      setIsCreatingClient(false)
      toast.success("Client créé avec succès")
    } catch (error) {
      console.error("Error creating client:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la création du client"
      toast.error(errorMessage)
      throw error
    }
  }

  // Calculer les totaux depuis les champs et mettre à jour le formulaire
  const calculateTotals = () => {
    // Pour l'instant, on génère des items depuis les champs numériques
    const items: Array<{
      id: string
      description: string
      quantity: number
      unit_price: number
      total: number
    }> = []

    templateFields.forEach((field) => {
      if (field.field_type === "number" && fieldValues[field.id]) {
        const value = parseFloat(fieldValues[field.id]) || 0
        items.push({
          id: field.id,
          description: field.field_name,
          quantity: 1,
          unit_price: Math.round(value * 100), // Convertir en centimes
          total: Math.round(value * 100),
        })
      }
    })

    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax_rate = watch("tax_rate") || 20 // Utiliser la valeur du formulaire ou défaut
    const tax_amount = Math.round(subtotal * (tax_rate / 100))
    const total = subtotal + tax_amount

    // Mettre à jour les valeurs du formulaire
    setValue("items", items)
    setValue("subtotal", subtotal)
    setValue("tax_amount", tax_amount)
    setValue("total", total)

    return { items, subtotal, tax_rate, tax_amount, total }
  }

  // Recalculer les totaux quand les champs changent
  useEffect(() => {
    if (currentStep >= 3 && templateFields.length > 0) {
      calculateTotals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldValues, templateFields.length, currentStep])

  // Valider l'étape actuelle avec react-hook-form
  const validateStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      const isValid = await trigger("client_id")
      if (!isValid && !selectedClient) {
        toast.error("Veuillez sélectionner un client")
      }
      return isValid && selectedClient !== null
    }
    if (currentStep === 2) {
      // Template est optionnel, donc on peut toujours passer
      if (selectedTemplate) {
        setValue("template_id", selectedTemplate.id)
      }
      return true
    }
    if (currentStep === 3) {
      // Vérifier que tous les champs requis sont remplis
      const allRequiredFieldsFilled = templateFields.every(
        (field) => !field.required || fieldValues[field.id]?.trim()
      )
      if (!allRequiredFieldsFilled) {
        toast.error("Veuillez remplir tous les champs requis")
        return false
      }
      // Valider les champs du formulaire
      const isValid = await trigger(["title", "items"])
      return isValid
    }
    return true
  }

  const handleNext = async () => {
    const isValid = await validateStep()
    if (isValid) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  const onSubmitForm = async (data: CreateOfferInput) => {
    if (!selectedClient) return

    setIsSubmitting(true)
    try {
      await onComplete({
        client_id: data.client_id,
        template_id: data.template_id,
        title: data.title || `Offre ${selectedClient.company || selectedClient.name}`,
        items: data.items,
        subtotal: data.subtotal,
        tax_rate: data.tax_rate,
        tax_amount: data.tax_amount,
        total: data.total,
      })
    } catch (error) {
      console.error("Error creating offer:", error)
      toast.error("Erreur lors de la création de l'offre")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    const isValid = await validateStep()
    if (isValid && selectedClient) {
      // Mettre à jour les valeurs finales avant la soumission
      setValue("client_id", selectedClient.id)
      setValue("template_id", selectedTemplate?.id || null)
      setValue("title", fieldValues["title"] || `Offre ${selectedClient.company || selectedClient.name}`)
      calculateTotals()
      
      // Déclencher la soumission du formulaire react-hook-form
      submitForm(onSubmitForm)()
    }
  }

  const formatAmount = (amountInCentimes: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amountInCentimes / 100)
  }

  return (
    <div className="space-y-6">
      {/* Stepper horizontal */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 transition-colors",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Sélection Client */}
      {currentStep === 1 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Sélectionnez un client</h2>
              <p className="text-sm text-muted-foreground">
                Choisissez le client pour cette offre ou créez-en un nouveau
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun client trouvé
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client)
                        setValue("client_id", client.id)
                      }}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-colors",
                        selectedClient?.id === client.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "hover:bg-muted border-2 border-transparent"
                      )}
                    >
                      <div className="font-medium">
                        {client.company || client.name}
                      </div>
                      {client.name && (
                        <div className="text-sm text-muted-foreground">
                          {client.name}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <Dialog open={isCreatingClient} onOpenChange={setIsCreatingClient}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />
                    Créer un nouveau client
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nouveau client</DialogTitle>
                  </DialogHeader>
                  <ClientForm
                    onSubmit={handleCreateClient}
                    onCancel={() => setIsCreatingClient(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!selectedClient} 
                className="flex-1"
              >
                Suivant
              </Button>
              {errors.client_id && (
                <p className="text-sm text-destructive mt-1">{errors.client_id.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Sélection Template */}
      {currentStep === 2 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Sélectionnez un template</h2>
              <p className="text-sm text-muted-foreground">
                Choisissez le modèle à utiliser pour cette offre
              </p>
            </div>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={selectedTemplate?.id || ""}
                onValueChange={(value) => {
                  const template = templates.find((t) => t.id === value)
                  setSelectedTemplate(template || null)
                  setValue("template_id", template?.id || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Retour
              </Button>
              <Button onClick={handleNext} disabled={!selectedTemplate} className="flex-1">
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Champs dynamiques */}
      {currentStep === 3 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Remplissez les champs</h2>
              <p className="text-sm text-muted-foreground">
                Complétez les informations de l&apos;offre
              </p>
            </div>

            <div className="space-y-4">
              {templateFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Ce template n&apos;a pas de champs configurés
                </div>
              ) : (
                templateFields.map((field) => {
                  const value = fieldValues[field.id] || ""
                  const fieldId = `field-${field.id}`

                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={fieldId}>
                        {field.field_name}
                        {field.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </Label>
                      {field.field_type === "textarea" ? (
                        <Textarea
                          id={fieldId}
                          value={value}
                          onChange={(e) =>
                            setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                          }
                          placeholder={field.placeholder || ""}
                          required={field.required}
                        />
                      ) : field.field_type === "select" ? (
                        <Select
                          value={value}
                          onValueChange={(val) =>
                            setFieldValues({ ...fieldValues, [field.id]: val })
                          }
                        >
                          <SelectTrigger id={fieldId}>
                            <SelectValue placeholder={field.placeholder || "Sélectionnez..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option, index) => (
                              <SelectItem key={index} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.field_type === "date" ? (
                        <Input
                          id={fieldId}
                          type="date"
                          value={value}
                          onChange={(e) =>
                            setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                          }
                          required={field.required}
                        />
                      ) : field.field_type === "number" ? (
                        <Input
                          id={fieldId}
                          type="number"
                          value={value}
                          onChange={(e) =>
                            setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                          }
                          placeholder={field.placeholder || ""}
                          required={field.required}
                        />
                      ) : field.field_type === "text" && field.id === "title" ? (
                        <>
                          <Input
                            id={fieldId}
                            type="text"
                            value={value}
                            onChange={(e) => {
                              setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                              setValue("title", e.target.value)
                            }}
                            placeholder={field.placeholder || ""}
                            required={field.required}
                            {...register("title")}
                          />
                          {errors.title && (
                            <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                          )}
                        </>
                      ) : (
                        <Input
                          id={fieldId}
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                          }
                          placeholder={field.placeholder || ""}
                          required={field.required}
                        />
                      )}
                      {field.required && !fieldValues[field.id]?.trim() && (
                        <p className="text-sm text-destructive mt-1">Ce champ est requis</p>
                      )}
                    </div>
                  )
                })
              )}
              {errors.items && (
                <p className="text-sm text-destructive mt-1">{errors.items.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Retour
              </Button>
              <Button onClick={handleNext} className="flex-1">
                Suivant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Récapitulatif */}
      {currentStep === 4 && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Récapitulatif</h2>
              <p className="text-sm text-muted-foreground">
                Vérifiez les informations avant de créer l&apos;offre
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Client</Label>
                  <p className="font-medium">
                    {selectedClient?.company || selectedClient?.name}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Template</Label>
                  <p className="font-medium">
                    {selectedTemplate?.title || "Aucun"}
                  </p>
                </div>
              </div>

              {templateFields.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Champs remplis</Label>
                  <div className="space-y-2">
                    {templateFields.map((field) => (
                      <div key={field.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{field.field_name}:</span>
                        <span className="font-medium">
                          {fieldValues[field.id] || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                {(() => {
                  const { subtotal, tax_rate, tax_amount, total } = calculateTotals()
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Sous-total:</span>
                        <span>{formatAmount(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TVA ({tax_rate}%):</span>
                        <span>{formatAmount(tax_amount)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                        <span>Total:</span>
                        <span>{formatAmount(total)}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Retour
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Création..." : "Créer en brouillon"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

