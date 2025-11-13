import { ClientsImport } from '@/components/v0/ClientsImport';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';

export default function ClientsImportPage() {
  return (
    <PageContainer title="Import Clients" description="Import clients from CSV">
      <ClientsImport />
    </PageContainer>
  );
}

