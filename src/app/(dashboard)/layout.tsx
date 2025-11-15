import type React from "react"
import { AppShell } from "@/components/AppShell"
import { getSession } from "@/lib/auth/session"
import type { Role } from "@/types/domain"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  // Pas de fallback "ADMIN" : si le rôle n'est pas défini, userRole sera undefined
  // L'UI gérera undefined comme "non-admin" (ex: pas d'accès à Settings Admin)
  const userRole = session?.user.role

  return (
    <AppShell
      userEmail={session?.user.email}
      userName={session?.user.email?.split("@")[0]}
      orgId={session?.orgId}
      orgName={session?.orgId}
      userRole={userRole}
    >
      {children}
    </AppShell>
  )
}
