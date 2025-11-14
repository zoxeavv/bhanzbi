"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"

interface KpiCardProps {
  title: string
  value: number | string
  change?: {
    value: number
    label: string
    trend: "up" | "down" | "neutral"
  }
  icon?: ReactNode
  href?: string
  onClick?: () => void
  className?: string
}

export function KpiCard({
  title,
  value,
  change,
  icon,
  href,
  onClick,
  className,
}: KpiCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else if (onClick) {
      onClick()
    }
  }

  const isClickable = href || onClick

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isClickable && "cursor-pointer hover:shadow-md hover:border-primary/50",
        className
      )}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change && (
              <div className="flex items-center gap-1.5 text-sm">
                {change.trend === "up" && (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                )}
                {change.trend === "down" && (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                {change.trend === "neutral" && (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    change.trend === "up" && "text-success",
                    change.trend === "down" && "text-destructive",
                    change.trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change.value > 0 ? "+" : ""}
                  {change.value}%
                </span>
                <span className="text-muted-foreground">{change.label}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

