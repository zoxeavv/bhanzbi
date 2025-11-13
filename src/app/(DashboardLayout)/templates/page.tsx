import { listTemplates } from '@/lib/db/queries/templates';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <PageContainer title="Templates" description="Manage your templates">
      <div className="space-y-4">
        {templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No templates found
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4">
              <h3 className="font-semibold">{template.title}</h3>
              <p className="text-sm text-muted-foreground">{template.slug}</p>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}

