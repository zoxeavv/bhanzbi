/**
 * Codes d'erreur standardisés pour les opérations sur les templates
 */
export type TemplateErrorCode =
  | "TEMPLATE_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "SLUG_ALREADY_EXISTS"
  | "SLUG_TAKEN"
  | "INVALID_CONTENT_STRUCTURE"
  | "UNKNOWN_ERROR"

/**
 * Structure standardisée pour les erreurs de templates
 */
export type TemplateError = {
  code: TemplateErrorCode
  message: string
}

/**
 * Crée une erreur de template standardisée
 */
export function createTemplateError(
  code: TemplateErrorCode,
  message: string
): TemplateError {
  return { code, message }
}

/**
 * Messages d'erreur utilisateur par code
 */
export const ERROR_MESSAGES: Record<TemplateErrorCode, string> = {
  TEMPLATE_NOT_FOUND: "Le template demandé est introuvable.",
  VALIDATION_ERROR: "Les données fournies sont invalides.",
  UNAUTHORIZED: "Vous n'êtes pas autorisé à effectuer cette action.",
  SLUG_ALREADY_EXISTS: "Un template avec ce nom existe déjà.",
  SLUG_TAKEN: "Un template avec ce nom existe déjà dans votre organisation.",
  INVALID_CONTENT_STRUCTURE: "La structure du contenu est invalide.",
  UNKNOWN_ERROR: "Une erreur inattendue s'est produite.",
}

/**
 * Retourne un message utilisateur pour un code d'erreur
 */
export function getUserMessage(code: TemplateErrorCode, customMessage?: string): string {
  return customMessage || ERROR_MESSAGES[code]
}

