import { listOffers } from '@/lib/db/queries/offers';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';

export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const offers = await listOffers();

  return (
    <PageContainer title="Offers" description="Manage your offers">
      <div className="space-y-4">
        {offers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No offers found
          </div>
        ) : (
          offers.map((offer) => (
            <div key={offer.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{offer.title}</h3>
              <p className="text-sm text-muted-foreground">
                Total: €{(offer.total / 100).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}

