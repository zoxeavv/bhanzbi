import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function ClientsTableEmpty() {
  return (
    <div className="rounded-md border p-12">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Aucun client trouvé
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Commencez par ajouter votre premier client pour générer des offres commerciales.
        </p>
        <Link href="/clients/nouveau">
          <Button>Ajouter un client</Button>
        </Link>
      </div>
    </div>
  )
}


