import React from "react"
import { Sidebar } from "@/components/sidebar/Sidebar"
import { Topbar } from "@/components/topbar/Topbar"
import { BreadcrumbItem } from "@/components/topbar/Breadcrumb"
import { cn } from "@/lib/utils"
import type { Role } from "@/types/domain"

interface AppShellProps {
  children: React.ReactNode
  breadcrumbItems?: BreadcrumbItem[]
  title?: string
  description?: string
  actions?: React.ReactNode
  userEmail?: string
  userName?: string
  userAvatar?: string
  orgName?: string
  orgId?: string
  userRole?: Role
  className?: string
}

export function AppShell({
  children,
  breadcrumbItems,
  title,
  description,
  actions,
  userEmail,
  userName,
  userAvatar,
  orgName,
  orgId,
  userRole,
  className,
}: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen w-full", className)}>
      {/* Sidebar fixe */}
      <Sidebar userRole={userRole} />

      {/* Zone principale avec topbar et contenu */}
      <div className="flex flex-1 flex-col md:ml-64">
        {/* Topbar sticky */}
        <Topbar
          breadcrumbItems={breadcrumbItems}
          title={title}
          description={description}
          actions={actions}
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
          orgName={orgName}
          orgId={orgId}
        />

        {/* Contenu scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Slot pour modals globales - à ajouter ici si nécessaire */}
      {/* Exemple: <GlobalDialog /> */}
    </div>
  )
}

