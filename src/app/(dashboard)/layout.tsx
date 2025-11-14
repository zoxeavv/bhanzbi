import type React from "react"
import { AppShell } from "@/components/AppShell"
import { getSession } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <AppShell
      userEmail={session?.user.email}
      userName={session?.user.email?.split("@")[0]}
      orgId={session?.orgId}
      orgName={session?.orgId}
    >
      {children}
    </AppShell>
  )
}
