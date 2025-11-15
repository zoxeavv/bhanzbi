import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Send, CheckCircle2, XCircle } from 'lucide-react';
import { getCurrentOrgId } from '@/lib/auth/session';
import { getOfferById } from '@/lib/db/queries/offers';
import { getClientById } from '@/lib/db/queries/clients';
import { getTemplateById } from '@/lib/db/queries/templates';
import { OfferEditFormWrapper } from '@/components/offres/OfferEditFormWrapper';
import { PdfPreview } from '@/components/offres/PdfPreview';
import { OfferHistoryTimelineWrapper } from '@/components/offres/OfferHistoryTimelineWrapper';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  sent: 'default',
  accepted: 'default',
  rejected: 'destructive',
};

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orgId = await getCurrentOrgId();

  let offer;
  let client;
  let template = null;

  try {
    offer = await getOfferById(id, orgId);
  } catch (error) {
    notFound();
  }

  try {
    client = await getClientById(offer.client_id, orgId);
  } catch (error) {
    notFound();
  }

  if (offer.template_id) {
    try {
      template = await getTemplateById(offer.template_id, orgId);
    } catch (error) {
      // Template peut ne pas exister, on continue sans
    }
  }

  const canEdit = offer.status === 'draft';
  const canSend = offer.status === 'draft';

  return (
    <div className="space-y-6">
      {/* Header Sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
        <div className="flex items-center gap-4">
          <Link href="/offres">
            <Button variant="ghost" size="icon" aria-label="Retour aux offres">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{offer.title}</h1>
              <Badge variant={statusVariants[offer.status] || 'secondary'}>
                {statusLabels[offer.status] || offer.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-2">
              {client.company || client.name} • Créée le{' '}
              {new Date(offer.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {canSend && (
              <Button variant="outline" className="gap-2">
                <Send className="h-4 w-4" />
                Envoyer
              </Button>
            )}
            {offer.status === 'sent' && (
              <>
                <Button variant="outline" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Accepter
                </Button>
                <Button variant="outline" className="gap-2">
                  <XCircle className="h-4 w-4" />
                  Refuser
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit">Édition</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-6">
          <OfferEditFormWrapper offerId={id} offer={offer} disabled={!canEdit} />
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <PdfPreview offerId={id} />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <OfferHistoryTimelineWrapper offerId={id} offer={offer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
