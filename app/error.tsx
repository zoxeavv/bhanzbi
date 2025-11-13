"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] Error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-12 max-w-md text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">500</h1>
            <h2 className="text-xl font-semibold text-foreground">Une erreur est survenue</h2>
            <p className="text-muted-foreground">Nous sommes désolés, une erreur inattendue s'est produite.</p>
          </div>
          <Button onClick={reset} className="mt-4">
            Réessayer
          </Button>
        </div>
      </Card>
    </div>
  )
}
