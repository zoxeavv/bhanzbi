'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PdfPreviewProps {
  offerId: string;
  onDownload?: () => void;
}

export function PdfPreview({ offerId, onDownload }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePreview() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, preview: true }),
      });

      if (!response.ok) {
        throw new Error('Erreur génération PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      setError("Impossible de générer l'aperçu");
      toast.error("Erreur lors de la génération de l'aperçu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generatePreview();
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [offerId]);

  async function handleDownload() {
    try {
      const response = await fetch(`/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId }),
      });

      if (!response.ok) {
        throw new Error('Erreur téléchargement');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offre-${offerId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('PDF téléchargé avec succès');
      onDownload?.();
    } catch (err) {
      toast.error("Erreur lors du téléchargement");
    }
  }

  if (loading) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Génération de l'aperçu...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={generatePreview} variant="outline">
          Réessayer
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Aperçu PDF</h3>
        <Button onClick={handleDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
      </div>
      {pdfUrl && (
        <Card className="overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-[600px] border-0"
            title="Aperçu PDF"
          />
        </Card>
      )}
    </div>
  );
}


