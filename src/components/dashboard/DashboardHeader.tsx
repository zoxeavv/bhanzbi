"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { DateRangePicker } from "@/components/date-range-picker"
import { useState } from "react"
import type { DateRange } from "react-day-picker"

export function DashboardHeader() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble de votre activité
        </p>
      </div>

      <div className="flex items-center gap-3">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Button asChild>
          <Link href="/create-offre">
            <Plus className="mr-2 h-4 w-4" />
            Créer une offre
          </Link>
        </Button>
      </div>
    </div>
  )
}

