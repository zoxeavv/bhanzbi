"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Trash2, Mail, UserPlus } from "lucide-react";
import type { AdminAllowedEmail } from "@/lib/db/queries/adminAllowedEmails";

interface AdminAllowedEmailsClientProps {
  initialItems: AdminAllowedEmail[];
}

/**
 * Composant client pour gérer les emails autorisés à devenir admin
 * 
 * Gère :
 * - Le formulaire d'ajout d'email
 * - L'affichage de la liste des emails autorisés
 * - Les actions de suppression
 */
export function AdminAllowedEmailsClient({ initialItems }: AdminAllowedEmailsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminAllowedEmail[]>(initialItems);

  // Validation du format email
  const validateEmail = (emailValue: string): string | null => {
    if (!emailValue.trim()) {
      return "Veuillez saisir un email";
    }
    
    // Regex simple pour validation email (RFC 5322 simplifié)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      return "Format d'email invalide";
    }
    
    return null;
  };

  // Synchroniser les items avec initialItems quand les props changent (après router.refresh())
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Handler pour l'ajout d'un email
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    
    setEmailError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/admin-allowed-emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de l'ajout de l'email");
        }

        toast.success("Email ajouté avec succès");
        setEmail("");
        
        // Rafraîchir les données côté serveur
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'ajout de l'email";
        toast.error(errorMessage);
      }
    });
  };

  // Handler pour la suppression
  const handleDelete = async (id: string, emailToDelete: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'email autorisé "${emailToDelete}" ?`)) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/admin-allowed-emails", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors de la suppression");
        }

        toast.success("Email supprimé avec succès");
        
        // Rafraîchir les données côté serveur
        router.refresh();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erreur lors de la suppression";
        toast.error(errorMessage);
      }
    });
  };

  // Formater une date pour l'affichage
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("fr-FR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulaire d'ajout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un email autorisé
          </CardTitle>
          <CardDescription>
            Les emails ajoutés ici pourront obtenir le rôle ADMIN lors de leur inscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  // Valider en temps réel et effacer l'erreur si le format devient valide
                  if (emailError) {
                    const error = validateEmail(e.target.value);
                    setEmailError(error);
                  }
                }}
                onBlur={() => {
                  // Valider au blur pour donner un feedback immédiat
                  const error = validateEmail(email);
                  setEmailError(error);
                }}
                disabled={isPending}
                required
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-sm text-destructive mt-1">{emailError}</p>
              )}
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isPending || !email.trim() || !!emailError}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ajout...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Liste des emails autorisés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails autorisés ({items.length})
          </CardTitle>
          <CardDescription>
            Liste des emails autorisés à obtenir le rôle ADMIN pour cette organisation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucun email autorisé</p>
              <p className="text-sm mt-1">
                Ajoutez un email ci-dessus pour commencer.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Créé par</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Utilisé le</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.created_by || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.used_at ? (
                        <span className="text-green-600 dark:text-green-400">
                          {formatDate(item.used_at)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Non utilisé</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id, item.email)}
                        disabled={isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

