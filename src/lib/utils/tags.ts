/**
 * Parse une chaîne de tags séparés par virgules ou pipes en tableau de strings
 * @param input - Chaîne de tags (ex: "Technologie, Finance|Commerce")
 * @returns Tableau de tags nettoyés et filtrés
 */
export function parseTags(input: string): string[] {
  if (!input || input.trim() === "") return [];
  // Séparer par virgule ou pipe et nettoyer
  return input
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/**
 * Retourne le secteur principal (premier tag) ou "Non renseigné" si aucun tag
 * @param tags - Tableau de tags
 * @returns Le premier tag ou "Non renseigné"
 */
export function getPrimarySector(tags: string[]): string {
  return tags.length > 0 ? tags[0] : "Non renseigné";
}


