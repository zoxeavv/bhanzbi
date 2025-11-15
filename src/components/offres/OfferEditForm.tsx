'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { Offer, OfferItem } from '@/types/domain';
import { toast } from 'sonner';

const offerFormSchema = z.object({
  title: z.string().min(1, 'Le titre est requis'),
  items: z.array(
    z.object({
      id: z.string(),
      description: z.string().min(1, 'La description est requise'),
      quantity: z.number().min(1, 'La quantité doit être au moins 1'),
      unit_price: z.number().min(0, 'Le prix unitaire doit être positif'),
      total: z.number().min(0),
    })
  ).min(1, 'Au moins un article est requis'),
  tax_rate: z.number().min(0, 'Le taux de TVA doit être positif').max(100, 'Le taux de TVA ne peut pas dépasser 100%'),
});

type OfferFormData = z.infer<typeof offerFormSchema>;

interface OfferEditFormProps {
  offer: Offer;
  onSave: (data: {
    title: string;
    items: OfferItem[];
    tax_rate: number;
    subtotal: number;
    tax_amount: number;
    total: number;
  }) => Promise<void>;
  disabled?: boolean;
}

export function OfferEditForm({ offer, onSave, disabled = false }: OfferEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      title: offer.title,
      items: offer.items.length > 0 ? offer.items : [
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
        },
      ],
      tax_rate: offer.tax_rate,
    },
  });

  const items = watch('items');
  const taxRate = watch('tax_rate');

  const addItem = () => {
    const newItems = [
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
      },
    ];
    setValue('items', newItems);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setValue('items', newItems);
  };

  const updateItem = (index: number, field: keyof OfferItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };

    if (field === 'quantity' || field === 'unit_price') {
      item[field] = value as number;
      item.total = item.quantity * item.unit_price;
    } else if (field === 'description') {
      item.description = value as string;
    }

    newItems[index] = item;
    setValue('items', newItems, { shouldValidate: true });
  };

  const onSubmit = async (data: OfferFormData) => {
    setIsSaving(true);
    try {
      const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = Math.round(subtotal * (data.tax_rate / 100));
      const total = subtotal + taxAmount;

      await onSave({
        title: data.title,
        items: data.items,
        tax_rate: data.tax_rate,
        subtotal,
        tax_amount: taxAmount,
        total,
      });
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Titre */}
      <div className="space-y-2">
        <Label htmlFor="title">Titre de l'offre</Label>
        <Input
          id="title"
          {...register('title')}
          disabled={disabled || isSaving}
          placeholder="Ex: Devis pour développement web"
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Articles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Articles</Label>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter un article
            </Button>
          )}
        </div>

        {items.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun article. Cliquez sur "Ajouter un article" pour commencer.
              </p>
            </CardContent>
          </Card>
        )}

        {items.map((item, index) => (
          <Card key={item.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`item-${index}-description`}>
                        Description
                      </Label>
                      <Input
                        id={`item-${index}-description`}
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, 'description', e.target.value)
                        }
                        disabled={disabled || isSaving}
                        placeholder="Ex: Développement frontend React"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`item-${index}-quantity`}>
                          Quantité
                        </Label>
                        <Input
                          id={`item-${index}-quantity`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'quantity',
                              parseInt(e.target.value) || 0
                            )
                          }
                          disabled={disabled || isSaving}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`item-${index}-unit_price`}>
                          Prix unitaire (€)
                        </Label>
                        <Input
                          id={`item-${index}-unit_price`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={(item.unit_price / 100).toFixed(2)}
                          onChange={(e) =>
                            updateItem(
                              index,
                              'unit_price',
                              Math.round(
                                (parseFloat(e.target.value) || 0) * 100
                              )
                            )
                          }
                          disabled={disabled || isSaving}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Total:</span>
                      <span className="text-sm font-semibold">
                        {(item.total / 100).toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={isSaving || items.length === 1}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {errors.items && (
          <p className="text-sm text-destructive">{errors.items.message}</p>
        )}
      </div>

      {/* Taux de TVA */}
      <div className="space-y-2">
        <Label htmlFor="tax_rate">Taux de TVA (%)</Label>
        <Input
          id="tax_rate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          {...register('tax_rate', { valueAsNumber: true })}
          disabled={disabled || isSaving}
        />
        {errors.tax_rate && (
          <p className="text-sm text-destructive">{errors.tax_rate.message}</p>
        )}
      </div>

      {/* Récapitulatif */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sous-total:</span>
            <span className="text-sm font-medium">
              {(subtotal / 100).toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              TVA ({taxRate}%):
            </span>
            <span className="text-sm font-medium">
              {(taxAmount / 100).toFixed(2)} €
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-base font-semibold">Total:</span>
            <span className="text-lg font-bold">
              {(total / 100).toFixed(2)} €
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!disabled && (
        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      )}
    </form>
  );
}

