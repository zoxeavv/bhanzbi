import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Formate une date selon le format spécifié (par défaut "dd MMM yyyy")
 * @param dateString - Date au format ISO string
 * @param formatStr - Format de date (par défaut "dd MMM yyyy")
 * @returns Date formatée ou "Date invalide" si la date est invalide
 */
export function formatDate(dateString: string, formatStr: string = "dd MMM yyyy"): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Date invalide";
    return format(date, formatStr, { locale: fr });
  } catch {
    return "Date invalide";
  }
}

/**
 * Formate une date en format relatif (ex: "il y a 2 jours")
 * @param dateString - Date au format ISO string
 * @returns Date formatée en relatif ou "Date invalide" si la date est invalide
 */
export function formatRelativeDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Date invalide";
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  } catch {
    return "Date invalide";
  }
}



