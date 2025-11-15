import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
}

/**
 * EmptyState - Composant standardisé pour les états vides
 * 
 * Utilisation :
 * ```tsx
 * <EmptyState
 *   icon={Building2}
 *   title="Aucun client"
 *   description="Commencez par ajouter votre premier client"
 *   actionLabel="Ajouter un client"
 *   actionHref="/clients/nouveau"
 * />
 * ```
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className,
}: EmptyStateProps) {
  const hasAction = actionLabel && (actionHref || actionOnClick);

  return (
    <Card className={cn('p-12 text-center', className)}>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-md">{description}</p>
        </div>
        {hasAction && (
          <div className="mt-4">
            {actionHref ? (
              <Button asChild>
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            ) : (
              <Button onClick={actionOnClick}>{actionLabel}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}



