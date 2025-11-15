"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreateOfferStepper } from "./CreateOfferStepper";

interface CreateOfferStepperWrapperProps {
  initialClientId: string | null;
}

/**
 * Wrapper Client Component pour CreateOfferStepper
 * 
 * Nécessaire car le wizard utilise des hooks React (useState, useEffect)
 * et pour gérer la navigation après création de l'offre.
 */
export function CreateOfferStepperWrapper({ initialClientId }: CreateOfferStepperWrapperProps) {
  const router = useRouter();

  const handleComplete = async (data: {
    client_id: string;
    template_id: string | null;
    title: string;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
  }) => {
    try {
      const response = await fetch("/api/offres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: data.client_id,
          template_id: data.template_id,
          title: data.title,
          items: data.items,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate,
          tax_amount: data.tax_amount,
          total: data.total,
          status: "draft",
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la création de l'offre");
      }

      const offer = await response.json();
      toast.success("Offre créée avec succès");
      router.push(`/offres/${offer.id}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating offer:", error);
      throw error;
    }
  };

  return <CreateOfferStepper initialClientId={initialClientId} onComplete={handleComplete} />;
}
