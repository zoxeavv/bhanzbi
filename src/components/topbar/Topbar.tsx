"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem } from "./Breadcrumb"
import { UserMenu } from "./UserMenu"
import { OrgSelector } from "./OrgSelector"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TopbarProps {
  breadcrumbItems?: BreadcrumbItem[]
  title?: string
  description?: string
  actions?: React.ReactNode
  userEmail?: string
  userName?: string
  userAvatar?: string
  orgName?: string
  orgId?: string
  className?: string
}

export function Topbar({
  breadcrumbItems = [],
  title,
  description,
  actions,
  userEmail,
  userName,
  userAvatar,
  orgName,
  orgId,
  className,
}: TopbarProps) {
  return (
    <TooltipProvider>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6",
          className
        )}
      >
        {/* Zone gauche - Breadcrumb et titre */}
        <div className="flex-1 flex items-center gap-4 min-w-0">
          {breadcrumbItems.length > 0 && (
            <div className="hidden md:block">
              <Breadcrumb items={breadcrumbItems} />
            </div>
          )}
          {title && (
            <div className="flex flex-col min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground truncate">{description}</p>
              )}
            </div>
          )}
        </div>

        {/* Zone droite - Actions, notifications, org selector, user menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Actions personnalisées */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}

          {/* Notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notifications</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>

          {/* Organisation selector */}
          <OrgSelector orgName={orgName} orgId={orgId} />

          {/* User menu */}
          <UserMenu userEmail={userEmail} userName={userName} userAvatar={userAvatar} />
        </div>
      </header>
    </TooltipProvider>
  )
}

