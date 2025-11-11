import { listClients } from '@/lib/db/queries/clients';
import { ClientsList } from '@/components/v0/ClientsList';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <PageContainer title="Clients" description="Manage your clients">
      <ClientsList clients={clients} />
    </PageContainer>
  );
}

