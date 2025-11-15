import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

/**
 * StatCard - Composant standardisé pour les cartes de statistiques
 * 
 * Utilisation :
 * ```tsx
 * <StatCard
 *   title="Total des offres"
 *   value={42}
 *   icon={<FileText className="h-5 w-5" />}
 *   trend={{ value: 12, label: "+12% vs mois dernier", isPositive: true }}
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon,
  trend,
  onClick,
  className,
}: StatCardProps) {
  const content = (
    <Card
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-accent',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-4 p-6">
        {icon && (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <div
              className={cn(
                'text-xs font-medium',
                trend.isPositive === true
                  ? 'text-success'
                  : trend.isPositive === false
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return content;
}


