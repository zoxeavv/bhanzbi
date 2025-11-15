import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CreateOfferStepperWrapper } from "@/components/offres/CreateOfferStepperWrapper";

interface CreateOffrePageProps {
  searchParams: Promise<{ clientId?: string }>;
}

/**
 * Page Server Component pour créer une nouvelle offre
 * 
 * Récupère le paramètre `clientId` depuis l'URL et le passe au wizard
 * pour pré-sélectionner le client.
 */
export default async function CreateOffrePage({ searchParams }: CreateOffrePageProps) {
  const params = await searchParams;
  
  // Récupérer le clientId depuis les searchParams
  const clientId = params.clientId || null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/offres">
          <Button variant="ghost" size="icon" aria-label="Retour aux offres">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouvelle offre</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Créez une nouvelle offre commerciale en quelques étapes
          </p>
        </div>
      </div>

      {/* Wizard avec pré-sélection du client si clientId présent */}
      <CreateOfferStepperWrapper initialClientId={clientId} />
    </div>
  );
}
