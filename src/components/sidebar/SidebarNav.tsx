"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, FileCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Offres", href: "/offres", icon: FileCheck },
]

interface SidebarNavProps {
  items?: NavItem[]
  className?: string
}

export function SidebarNav({ items = mainNavigation, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}

