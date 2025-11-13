import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="p-12 max-w-md text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">404</h1>
            <h2 className="text-xl font-semibold text-foreground">Page non trouvée</h2>
            <p className="text-muted-foreground">La page que vous recherchez n'existe pas ou a été déplacée.</p>
          </div>
          <Link href="/">
            <Button className="mt-4">Retour au dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
