'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { OfferHistoryTimeline } from './OfferHistoryTimeline';
import type { Offer } from '@/types/domain';

interface OfferHistoryTimelineWrapperProps {
  offerId: string;
  offer: Offer;
}

export function OfferHistoryTimelineWrapper({
  offerId,
  offer,
}: OfferHistoryTimelineWrapperProps) {
  const router = useRouter();

  const handleRestore = async (restoredOffer: Offer) => {
    try {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: restoredOffer.title,
          items: restoredOffer.items,
          tax_rate: restoredOffer.tax_rate,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la restauration');
      }

      toast.success('Offre restaurée avec succès');
      router.refresh();
    } catch (error) {
      toast.error('Erreur lors de la restauration');
      throw error;
    }
  };

  return <OfferHistoryTimeline offer={offer} onRestore={handleRestore} />;
}



