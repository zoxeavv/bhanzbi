import type React from "react"
import { Sidebar } from "@/components/sidebar"
import { PageTransition } from "@/components/page-transition"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:ml-64">
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  )
}
