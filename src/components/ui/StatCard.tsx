import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  change?: {
    value: number;
    label: string;
    trend: 'up' | 'down' | 'neutral';
  };
  href?: string;
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
 * 
 * Avec navigation :
 * ```tsx
 * <StatCard
 *   title="Total des offres"
 *   value={42}
 *   href="/offres"
 *   change={{ value: 12, label: "vs mois dernier", trend: "up" }}
 * />
 * ```
 */
export function StatCard({
  title,
  value,
  icon,
  trend,
  change,
  href,
  onClick,
  className,
}: StatCardProps) {
  const isClickable = href || onClick;
  
  // Support pour le format "change" (compatibilité KpiCard)
  const displayTrend = change
    ? {
        value: change.value,
        label: change.label,
        isPositive: change.trend === 'up' ? true : change.trend === 'down' ? false : undefined,
        trend: change.trend,
      }
    : trend;

  const content = (
    <Card
      className={cn(
        'transition-all duration-200',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        !href && onClick && 'hover:bg-accent',
        className
      )}
      onClick={!href && onClick ? onClick : undefined}
    >
      <CardContent className={cn('p-6', href ? 'flex items-start justify-between' : 'flex items-center gap-4')}>
        {icon && (
          <div className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted',
            href && 'order-2'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </p>
          <p className={cn('font-bold text-foreground', href ? 'text-3xl' : 'text-2xl')}>{value}</p>
          {displayTrend && (
            <div className={cn(
              'flex items-center gap-1.5',
              href ? 'text-sm' : 'text-xs'
            )}>
              {change && (
                <>
                  {change.trend === 'up' && (
                    <ArrowUpRight className="h-4 w-4 text-success" />
                  )}
                  {change.trend === 'down' && (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  {change.trend === 'neutral' && (
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  )}
                </>
              )}
              <span
                className={cn(
                  'font-medium',
                  displayTrend.isPositive === true
                    ? 'text-success'
                    : displayTrend.isPositive === false
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                )}
              >
                {displayTrend.value > 0 ? '+' : ''}
                {displayTrend.value}%
              </span>
              <span className="text-muted-foreground">{displayTrend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Si href est fourni, wrapper dans un Link
  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}


