"use client"

import { Building2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OrgSelectorProps {
  orgName?: string
  orgId?: string
  className?: string
}

export function OrgSelector({ orgName, orgId, className }: OrgSelectorProps) {
  // Pour l'instant, lecture seule - le changement d'org sera implémenté plus tard
  const displayName = orgName || orgId || "Organisation"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={className}
                aria-label="Sélecteur d'organisation"
              >
                <Building2 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline-block max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Organisation actuelle</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Building2 className="h-4 w-4 mr-2" />
                <span className="truncate">{displayName}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                Changement d'organisation bientôt disponible
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent>
          <p>Organisation actuelle</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

