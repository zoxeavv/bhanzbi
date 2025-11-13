'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { importClientsFromCSV } from '@/app/(DashboardLayout)/clients/import/actions';

interface ClientsImportProps {
  onImport?: (file: File) => Promise<void>;
}

export function ClientsImport({ onImport }: ClientsImportProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      if (onImport) {
        await onImport(file);
      } else {
        const result = await importClientsFromCSV(file);
        if (result.success) {
          toast.success(`Imported ${result.imported} clients successfully`);
          if (result.errors > 0) {
            toast.warning(`${result.errors} rows had errors`);
          }
        } else {
          toast.error(result.message || 'Failed to import clients');
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import clients');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="sr-only">Choose CSV file</span>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
      </label>
      {isUploading && <p className="text-sm text-muted-foreground">Importing...</p>}
    </div>
  );
}

