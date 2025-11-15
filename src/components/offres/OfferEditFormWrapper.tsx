'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OfferEditForm } from './OfferEditForm';
import type { Offer, OfferItem } from '@/types/domain';

interface OfferEditFormWrapperProps {
  offerId: string;
  offer: Offer;
  disabled?: boolean;
}

export function OfferEditFormWrapper({
  offerId,
  offer,
  disabled = false,
}: OfferEditFormWrapperProps) {
  const router = useRouter();

  const handleSave = async (data: {
    title: string;
    items: OfferItem[];
    tax_rate: number;
    subtotal: number;
    tax_amount: number;
    total: number;
  }) => {
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement');
      }

      toast.success('Offre enregistrée avec succès');
      router.refresh();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      throw error;
    }
  };

  return <OfferEditForm offer={offer} onSave={handleSave} disabled={disabled} />;
}


