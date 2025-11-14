"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarNav } from "./SidebarNav"
import { useState, useEffect } from "react"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-card shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          className
        )}
        role="navigation"
        aria-label="Navigation principale"
      >
        <div className="flex h-full flex-col">
          {/* Zone Top - Logo */}
          <div className="flex h-16 items-center border-b border-sidebar-border px-6 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-sidebar-foreground">
                <span className="text-primary">MGRH</span> Offres
              </h1>
            </Link>
          </div>

          {/* Zone Nav Principale */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav />
          </div>

          {/* Zone Nav Future - Réservée pour extensions futures */}
          <div className="px-3 py-2 shrink-0">
            {/* Slot pour navigation future (ex: favoris, raccourcis) */}
          </div>

          {/* Zone Bottom - Actions */}
          <div className="border-t border-sidebar-border p-4 flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">v1.0.0</p>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}

