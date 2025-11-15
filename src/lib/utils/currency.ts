/**
 * Formate un montant en centimes en format monétaire EUR
 * @param amountInCentimes - Montant en centimes
 * @returns Montant formaté (ex: "1 234,56 €")
 */
export function formatCurrency(amountInCentimes: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amountInCentimes / 100);
}



