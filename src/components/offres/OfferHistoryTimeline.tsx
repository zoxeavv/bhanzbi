'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, RotateCcw, FileText, Send, CheckCircle2, XCircle } from 'lucide-react';
import { formatRelativeDate, formatDate } from '@/lib/utils/date';
import type { Offer } from '@/types/domain';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HistoryItem {
  id: string;
  type: 'created' | 'updated' | 'status_changed';
  title: string;
  description: string;
  timestamp: string;
  status?: Offer['status'];
  previousStatus?: Offer['status'];
}

interface OfferHistoryTimelineProps {
  offer: Offer;
  onRestore?: (offer: Offer) => Promise<void>;
}

const statusLabels: Record<Offer['status'], string> = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  accepted: 'Acceptée',
  rejected: 'Refusée',
};

const statusIcons: Record<Offer['status'], typeof FileText> = {
  draft: FileText,
  sent: Send,
  accepted: CheckCircle2,
  rejected: XCircle,
};

const statusColors: Record<Offer['status'], string> = {
  draft: 'text-muted-foreground',
  sent: 'text-primary',
  accepted: 'text-success',
  rejected: 'text-destructive',
};

const statusBgColors: Record<Offer['status'], string> = {
  draft: 'bg-muted',
  sent: 'bg-primary/10',
  accepted: 'bg-success/10',
  rejected: 'bg-destructive/10',
};

export function OfferHistoryTimeline({
  offer,
  onRestore,
}: OfferHistoryTimelineProps) {
  // Générer l'historique depuis les dates et statut
  const historyItems: HistoryItem[] = [
    {
      id: `${offer.id}-created`,
      type: 'created',
      title: 'Offre créée',
      description: offer.title,
      timestamp: offer.created_at,
      status: 'draft',
    },
  ];

  // Si l'offre a été modifiée après création
  if (offer.updated_at !== offer.created_at) {
    // Si le statut a changé
    if (offer.status !== 'draft') {
      historyItems.push({
        id: `${offer.id}-status-${offer.status}`,
        type: 'status_changed',
        title: `Statut changé: ${statusLabels[offer.status]}`,
        description: `L'offre est passée au statut "${statusLabels[offer.status]}"`,
        timestamp: offer.updated_at,
        status: offer.status,
        previousStatus: 'draft',
      });
    } else {
      historyItems.push({
        id: `${offer.id}-updated`,
        type: 'updated',
        title: 'Offre modifiée',
        description: 'Les informations de l\'offre ont été mises à jour',
        timestamp: offer.updated_at,
        status: offer.status,
      });
    }
  }

  // Trier par date décroissante
  const sortedHistory = historyItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sortedHistory.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-muted-foreground">
              Aucun historique disponible
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleRestore = async () => {
    if (!onRestore) return;
    try {
      await onRestore(offer);
      toast.success('Offre restaurée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la restauration');
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sortedHistory.map((item, index) => {
              const Icon =
                item.status && statusIcons[item.status]
                  ? statusIcons[item.status]
                  : Clock;
              const iconColor =
                item.status && statusColors[item.status]
                  ? statusColors[item.status]
                  : 'text-muted-foreground';
              const iconBg =
                item.status && statusBgColors[item.status]
                  ? statusBgColors[item.status]
                  : 'bg-muted';

              return (
                <div key={item.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-background',
                      iconBg
                    )}
                  >
                    <Icon className={cn('h-5 w-5', iconColor)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1 pb-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Actuel
                            </Badge>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        {item.status && (
                          <Badge
                            variant="outline"
                            className="mt-2 text-xs"
                          >
                            {statusLabels[item.status]}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatRelativeDate(item.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.timestamp, 'dd MMM yyyy HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restore button */}
        {sortedHistory.length > 1 && onRestore && (
          <div className="mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleRestore}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurer cette version
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


