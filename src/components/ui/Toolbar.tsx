import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Toolbar - Composant standardisé pour les barres d'outils (recherche, filtres, etc.)
 * 
 * Utilisation :
 * ```tsx
 * <Toolbar>
 *   <Input placeholder="Rechercher..." />
 *   <Select>...</Select>
 * </Toolbar>
 * ```
 */
export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center',
        className
      )}
    >
      {children}
    </div>
  );
}


