# Audit : Contrainte (org_id, slug) et Routes LEGACY

**Date** : 2024-12-19  
**Scope** : Vérification de la contrainte unique composite et du marquage/logging des routes LEGACY

---

## 1. Contrainte `(org_id, slug)` : ✅ OK

### Schéma (`src/lib/db/schema.ts`)
- ✅ Pas de `.unique()` sur `slug` seul
- ✅ Contrainte composite définie : `uniqueIndex('templates_org_id_slug_unique').on(table.org_id, table.slug)` (ligne 32)

### Migration (`drizzle/0005_add_templates_org_id_slug_unique.sql`)
- ✅ Supprime l'ancienne contrainte unique sur `slug` seul
- ✅ Crée la contrainte composite `(org_id, slug)`

### Queries (`src/lib/db/queries/templates.ts`)
- ✅ `getTemplateBySlug()` utilise `and(eq(templates.slug, slug), eq(templates.org_id, orgId))` (ligne 76)
- ✅ `createTemplate()` et `updateTemplate()` utilisent `orgId` et gèrent les erreurs de contrainte unique

### Server Actions
- ✅ `ensureUniqueSlug()` dans `actions.ts` et `nouveau/actions.ts` utilise `getTemplateBySlug(slug, orgId)` (lignes 22, 64, 93)
- ✅ Cohérence totale avec la contrainte composite

---

## 2. Routes LEGACY : ✅ OK

### POST `/api/templates`
- ✅ Marquée LEGACY (commentaires lignes 62-69 dans `src/app/api/templates/route.ts`)
- ✅ Loggée via `logLegacyApiCall()` (ligne 76)

### GET `/api/templates/[id]`
- ✅ Marquée LEGACY (commentaires lignes 25-32 dans `src/app/api/templates/[id]/route.ts`)
- ✅ Loggée via `logLegacyApiCall()` (ligne 43)

### PATCH `/api/templates/[id]`
- ✅ Marquée LEGACY (commentaires lignes 59-68 dans `src/app/api/templates/[id]/route.ts`)
- ✅ Loggée via `logLegacyApiCall()` (ligne 79)

### Impact
- ✅ `GET /api/templates` (sans `[id]`) reste active et utilisée par le frontend (`CreateOfferStepper.tsx`, `offres/page.tsx`)
- ✅ Les routes LEGACY sont isolées et n'impactent pas le reste

---

## Conclusion

- **Contrainte `(org_id, slug)`** : ✅ OK — Parfaitement alignée avec le code
- **Routes LEGACY** : ✅ OK — Correctement marquées et loggées

**Aucune correction nécessaire.**


