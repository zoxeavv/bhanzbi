'use client';

import { useState } from 'react';
import { z } from 'zod';
import type { OfferItem } from '@/types/domain';

const offerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  items: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit_price: z.number().min(0, 'Unit price must be positive'),
    total: z.number().min(0),
  })).min(1, 'At least one item is required'),
  taxRate: z.number().min(0, 'Tax rate must be non-negative').max(100, 'Tax rate cannot exceed 100%'),
});

interface OffersWizardProps {
  clientId: string;
  templateId?: string | null;
  onSubmit: (data: {
    title: string;
    items: OfferItem[];
    taxRate: number;
    requestId?: string;
  }) => Promise<void>;
}

export function OffersWizard({ clientId, templateId, onSubmit }: OffersWizardProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<OfferItem[]>([]);
  const [taxRate, setTaxRate] = useState(0);
  const [requestId] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit_price: 0,
      total: 0,
    }]);
  };

  const updateItem = (index: number, field: keyof OfferItem, value: string | number) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'quantity' || field === 'unit_price') {
      item[field] = value as number;
      item.total = item.quantity * item.unit_price;
    } else {
      (item as any)[field] = value;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!title.trim()) {
        newErrors.title = 'Title is required';
      }
    } else if (step === 2) {
      if (items.length === 0) {
        newErrors.items = 'At least one item is required';
      }
      items.forEach((item, index) => {
        if (!item.description.trim()) {
          newErrors[`item_${index}_description`] = 'Description is required';
        }
        if (item.quantity < 1) {
          newErrors[`item_${index}_quantity`] = 'Quantity must be at least 1';
        }
        if (item.unit_price < 0) {
          newErrors[`item_${index}_unit_price`] = 'Unit price must be positive';
        }
      });
    } else if (step === 3) {
      if (taxRate < 0 || taxRate > 100) {
        newErrors.taxRate = 'Tax rate must be between 0 and 100';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({ title, items, taxRate, requestId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">Step {step} of 4</div>
      
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Offer title"
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title}</p>}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Items</h3>
            <button
              onClick={addItem}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Add Item
            </button>
          </div>
          {items.map((item, index) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-2">
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                placeholder="Description"
                className="w-full px-3 py-2 border rounded-md"
              />
              {errors[`item_${index}_description`] && (
                <p className="text-sm text-destructive">{errors[`item_${index}_description`]}</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Quantity"
                  className="px-3 py-2 border rounded-md"
                  min="1"
                />
                <input
                  type="number"
                  value={item.unit_price / 100}
                  onChange={(e) => updateItem(index, 'unit_price', Math.round((parseFloat(e.target.value) || 0) * 100))}
                  placeholder="Unit Price (€)"
                  className="px-3 py-2 border rounded-md"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors[`item_${index}_quantity`] && (
                <p className="text-sm text-destructive">{errors[`item_${index}_quantity`]}</p>
              )}
              {errors[`item_${index}_unit_price`] && (
                <p className="text-sm text-destructive">{errors[`item_${index}_unit_price`]}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm">Total: €{(item.total / 100).toFixed(2)}</span>
                <button
                  onClick={() => removeItem(index)}
                  className="text-sm text-destructive"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tax Rate (%)</label>
            <input
              type="number"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md"
              min="0"
              max="100"
              step="0.01"
            />
            {errors.taxRate && <p className="text-sm text-destructive mt-1">{errors.taxRate}</p>}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>€{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxRate}%):</span>
              <span>€{(taxAmount / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total:</span>
              <span>€{(total / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-4 py-2 border rounded-md disabled:opacity-50"
        >
          Back
        </button>
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}
