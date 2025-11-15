# Audit du domaine Templates - Post-refacto

**Date :** 2024  
**Contexte :** Audit après refacto incluant schémas Zod, centralisation du parsing, optimisation lastUsedAt, migration RSC, et améliorations UX.

---

## Résumé exécutif

Le domaine Templates présente une architecture globalement cohérente avec une bonne séparation Server/Client Components et un bon respect des contraintes multi-tenant. Quelques incohérences de types et opportunités d'optimisation ont été identifiées.

**Statistiques :**
- ✅ Points validés : 8
- ⚠️ Points à améliorer : 9

---

## 1. Types & Schémas

### ✅ OK : Schéma TemplateField/TemplateContent centralisé

**Fichier :** `src/lib/templates/schema.ts`

- Schéma Zod bien défini avec validation exhaustive
- Types TypeScript inférés correctement
- Validation des champs `select` avec options non vides
- Fonction `validateTemplateContent()` pour valider les chaînes JSON

**Validation :**
- `templateFieldSchema` couvre tous les types supportés : `text`, `number`, `date`, `select`, `textarea`
- Validation conditionnelle pour `select` avec `refine()`
- Types optionnels correctement gérés (`placeholder`, `options`, `required`)

---

### ⚠️ TPL-AUD-001 : Duplication du type TemplateField

**Fichiers concernés :**
- `src/lib/templates/schema.ts` (ligne 38) : `export type TemplateField`
- `src/components/templates/TemplateFieldEditor.tsx` (lignes 18-25) : `export type TemplateField`

**Problème :**
Le type `TemplateField` est défini à deux endroits :
1. Dans `schema.ts` (source de vérité, inféré de Zod)
2. Dans `TemplateFieldEditor.tsx` (définition manuelle)

Bien que les deux définitions soient similaires, cette duplication peut mener à des incohérences si l'une est modifiée sans l'autre.

**Impact :**
- Risque d'incohérence si les types divergent
- Maintenance plus difficile
- Confusion pour les développeurs

**Suggestion de correction :**
- Supprimer la définition dans `TemplateFieldEditor.tsx`
- Importer le type depuis `@/lib/templates/schema` :
  ```ts
  import type { TemplateField } from "@/lib/templates/schema"
  ```
- Vérifier que tous les usages de `TemplateField` dans les composants importent depuis `schema.ts`

---

### ⚠️ TPL-AUD-002 : Commentaire obsolète sur le type Template

**Fichier :** `src/types/domain.ts` (ligne 45)

**Problème :**
```ts
export type Template = {
  // ...
  content: string; // markdown
}
```

Le commentaire indique "markdown" alors que `content` est en réalité un JSON stringifié (`{"fields": [...]}`).

**Impact :**
- Documentation trompeuse pour les développeurs
- Risque de confusion lors de la maintenance

**Suggestion de correction :**
```ts
content: string; // JSON stringifié : {"fields": TemplateField[]}
```

---

### ✅ OK : Validation du content dans createTemplateSchema

**Fichier :** `src/lib/validations.ts` (lignes 56-90)

- Utilise `validateTemplateContent()` pour valider le JSON
- Normalise le contenu vide vers `{"fields":[]}`
- Transforme et normalise le JSON après validation

**Validation :**
- Le schéma utilise bien `templateContentSchema` via `validateTemplateContent()`
- Les transformations sont cohérentes

---

### ⚠️ TPL-AUD-003 : Validation partielle du content dans PATCH

**Fichier :** `src/app/api/templates/[id]/route.ts` (ligne 38)

**Problème :**
```ts
const validatedData = createTemplateSchema.partial().parse(body);
```

L'utilisation de `.partial()` permet de mettre à jour seulement certains champs, mais si `content` est fourni, il devrait être validé avec la même rigueur que lors de la création.

**Impact :**
- Risque d'injection de contenu invalide si `content` est partiellement modifié
- Incohérence avec la validation stricte lors de la création

**Suggestion de correction :**
- Valider explicitement `content` s'il est présent dans le body :
  ```ts
  if (body.content !== undefined) {
    const validatedContent = validateTemplateContent(body.content);
    if (!validatedContent) {
      return NextResponse.json(
        { error: 'Invalid content structure' },
        { status: 400 }
      );
    }
    validatedData.content = JSON.stringify(validatedContent);
  }
  ```

---

## 2. Multi-tenant & Sécurité

### ✅ OK : Filtrage systématique sur org_id dans les queries

**Fichier :** `src/lib/db/queries/templates.ts`

**Validation :**
- `listTemplates(orgId)` : filtre sur `eq(templates.org_id, orgId)` ✅
- `getTemplateById(id, orgId)` : filtre sur `and(eq(templates.id, id), eq(templates.org_id, orgId))` ✅
- `getTemplateBySlug(slug, orgId)` : filtre sur `and(eq(templates.slug, slug), eq(templates.org_id, orgId))` ✅
- `updateTemplate(id, orgId, data)` : filtre sur `and(eq(templates.id, id), eq(templates.org_id, orgId))` ✅
- `createTemplate(data)` : utilise `data.orgId` directement ✅
- Toutes les fonctions vérifient `if (!orgId) throw new Error('orgId is required')` ✅

**Conclusion :** Aucun risque d'accès cross-tenant au niveau des queries.

---

### ✅ OK : Routes API protégées par org_id

**Fichiers :**
- `src/app/api/templates/route.ts`
- `src/app/api/templates/[id]/route.ts`

**Validation :**
- Toutes les routes utilisent `getCurrentOrgId()` ✅
- Les queries passent systématiquement `orgId` ✅
- Gestion d'erreur pour `Unauthorized` ✅

**Conclusion :** Pas de risque d'IDOR (Insecure Direct Object Reference) au niveau API.

---

### ✅ OK : orgId jamais exposé au client

**Validation :**
- `/templates/page.tsx` : `orgId` récupéré côté serveur, jamais passé au client ✅
- Les composants clients ne reçoivent que les données templates (sans `org_id`) ✅
- Les routes API ne retournent pas `org_id` dans les réponses ✅

**Conclusion :** Respect de la confidentialité multi-tenant.

---

## 3. Architecture RSC / Client Components

### ✅ OK : /templates en Server Component

**Fichier :** `src/app/(dashboard)/templates/page.tsx`

**Validation :**
- Page principale est un Server Component (pas de `"use client"`) ✅
- Data fetching côté serveur avec `listTemplates(orgId)` ✅
- Calcul de `lastUsedAt` côté serveur ✅
- Passage des données au composant client `TemplatesPageClient` ✅

**Conclusion :** Architecture RSC correctement implémentée.

---

### ⚠️ TPL-AUD-004 : /templates/[id] entièrement en Client Component

**Fichier :** `src/app/(dashboard)/templates/[id]/page.tsx`

**Problème :**
La page est entièrement un Client Component (`"use client"` en ligne 1) et fait un `fetch` vers `/api/templates/${id}` dans un `useEffect`.

**Impact :**
- Perte des avantages du Server Component (SEO, performance initiale)
- Requête HTTP supplémentaire inutile
- Pas de gestion d'erreur serveur avant le rendu

**Suggestion de correction :**
- Convertir en Server Component qui charge le template côté serveur
- Passer le template parsé au composant client pour l'édition :
  ```ts
  // page.tsx (Server Component)
  export default async function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const orgId = await getCurrentOrgId();
    const { id } = await params;
    const template = await getTemplateById(id, orgId);
    const fields = parseTemplateContent(template.content);
    
    return <TemplateDetailClient template={template} initialFields={fields} />;
  }
  ```
- Le composant client gère uniquement l'état d'édition et les sauvegardes

---

### ⚠️ TPL-AUD-005 : /templates/nouveau utilise fetch client au lieu de Server Action

**Fichier :** `src/app/(dashboard)/templates/nouveau/page.tsx` (lignes 116-126)

**Problème :**
La création du template se fait via `fetch("/api/templates", { method: "POST" })` depuis le client.

**Impact :**
- Requête HTTP supplémentaire
- Pas de progressive enhancement
- Gestion d'erreur moins robuste côté serveur

**Suggestion de correction :**
- Créer une Server Action dans `src/app/(dashboard)/templates/nouveau/actions.ts` :
  ```ts
  "use server"
  export async function createTemplateFromDocx(data: { title, slug, content, category, tags }) {
    const orgId = await getCurrentOrgId();
    // validation + création
    return template;
  }
  ```
- Utiliser cette action dans le composant client avec `useActionState` ou `useTransition`

---

## 4. Content JSON

### ✅ OK : Utilisation systématique des helpers

**Validation :**
- `parseTemplateContent()` utilisé dans :
  - `/templates/[id]/page.tsx` (ligne 51) ✅
  - `CreateOfferStepper.tsx` (ligne 31) ✅
- `serializeTemplateContent()` utilisé dans :
  - `/templates/[id]/page.tsx` (lignes 85, 97, 127) ✅
  - `/templates/nouveau/page.tsx` (ligne 122) ✅

**Conclusion :** Pas de manipulation directe du JSON, tout passe par les helpers centralisés.

---

### ⚠️ TPL-AUD-006 : Fallback de parsing masque potentiellement des erreurs

**Fichier :** `src/lib/templates/content.ts` (lignes 30-42)

**Problème :**
Le fallback dans `parseTemplateContent()` fait un mapping manuel avec des valeurs par défaut si la validation Zod échoue :

```ts
if (parsed && typeof parsed === "object" && Array.isArray(parsed.fields)) {
  console.error("[parseTemplateContent] Structure invalide, tentative de mapping manuel:", result.error)
  return parsed.fields.map((field: any) => ({
    id: field.id || `field-${Date.now()}-${Math.random()}`,
    field_name: field.field_name || "",
    field_type: field.field_type || "text",
    // ...
  }))
}
```

**Impact :**
- Masque des erreurs de validation réelles
- Peut créer des champs invalides avec des valeurs par défaut
- Logique de fallback non testée

**Suggestion de correction :**
- Supprimer le fallback et retourner un tableau vide si la validation échoue
- Ou, si le fallback est nécessaire pour la migration, le documenter clairement et ajouter un warning visible à l'utilisateur
- Considérer une migration des anciens templates vers le nouveau format

---

### ✅ OK : Gestion des erreurs de parsing dans /templates/[id]

**Fichier :** `src/app/(dashboard)/templates/[id]/page.tsx` (lignes 53-67)

**Validation :**
- Détection de parsing échoué ✅
- Affichage d'un message d'erreur clair avec `hasInvalidContent` ✅
- Bouton pour réinitialiser la structure ✅
- Pas de crash, l'utilisateur peut continuer à éditer ✅

**Conclusion :** UX de gestion d'erreur bien pensée.

---

### ⚠️ TPL-AUD-007 : TemplateCard compte les champs incorrectement

**Fichier :** `src/components/templates/TemplateCard.tsx` (lignes 25-29)

**Problème :**
```ts
function countFields(content: string): number {
  const lines = content.split("\n").filter((line) => line.trim().length > 0)
  return lines.length
}
```

Cette fonction compte les lignes non vides du contenu, ce qui n'est pas correct puisque `content` est un JSON (`{"fields": [...]}`), pas du markdown.

**Impact :**
- Affichage incorrect du nombre de champs dans les cartes
- Confusion pour l'utilisateur

**Suggestion de correction :**
- Utiliser `parseTemplateContent()` pour compter les champs :
  ```ts
  import { parseTemplateContent } from "@/lib/templates/content"
  
  function countFields(content: string): number {
    const fields = parseTemplateContent(content);
    return fields.length;
  }
  ```

---

## 5. Design System & UX

### ✅ OK : Utilisation de PageHeader et Toolbar

**Fichier :** `src/components/templates/TemplatesPageClient.tsx`

**Validation :**
- `PageHeader` utilisé avec `title`, `description`, et `actions` ✅
- `Toolbar` utilisé pour la recherche et les filtres ✅
- Structure cohérente avec le reste de l'application ✅

---

### ✅ OK : Gestion des états loading / empty / error

**Validation :**
- `/templates/page.tsx` : Gestion d'erreur avec redirection ✅
- `/templates/TemplatesPageClient.tsx` : États empty (ligne 107) et filtered empty (ligne 115) ✅
- `/templates/[id]/page.tsx` : État loading avec Skeleton (lignes 153-165) ✅
- `/templates/nouveau/page.tsx` : États idle/parsing/redirecting/error bien gérés ✅

**Conclusion :** Tous les états sont couverts.

---

### ✅ OK : Validation UX dans TemplateFieldEditor

**Fichier :** `src/components/templates/TemplateFieldEditor.tsx`

**Validation :**
- Validation en temps réel avec `useEffect` (lignes 78-87) ✅
- Affichage des erreurs sous les champs (lignes 136-138, 214-216) ✅
- Validation des options pour `select` (lignes 62-72) ✅
- Détection des doublons dans les options (lignes 66-70) ✅
- Remontée de l'état de validation au parent via `onValidationChange` ✅
- Bouton "Enregistrer" désactivé si champs invalides (ligne 193 dans `[id]/page.tsx`) ✅

**Conclusion :** Validation UX complète et efficace.

---

### ⚠️ TPL-AUD-008 : Duplication de template via fetch client

**Fichier :** `src/components/templates/TemplateCard.tsx` (lignes 54-82)

**Problème :**
La duplication de template se fait via `fetch("/api/templates", { method: "POST" })` depuis le client.

**Impact :**
- Cohérence avec le reste de l'application (même pattern que `/templates/nouveau`)
- Mais pourrait être optimisé avec une Server Action

**Suggestion de correction :**
- Créer une Server Action `duplicateTemplate(templateId)` si souhaité pour plus de cohérence
- Sinon, laisser tel quel (moins prioritaire que les autres points)

---

### ⚠️ TPL-AUD-009 : Message d'erreur de validation mal positionné

**Fichier :** `src/app/(dashboard)/templates/[id]/page.tsx` (lignes 199-203)

**Problème :**
Le message d'erreur de validation est affiché dans le header, mais il est conditionné par `!areFieldsValid` et placé après le bouton "Enregistrer", ce qui peut le rendre peu visible.

**Impact :**
- UX : L'utilisateur peut ne pas voir le message d'erreur immédiatement

**Suggestion de correction :**
- Déplacer le message d'erreur juste au-dessus ou à côté du bouton "Enregistrer"
- Ou l'afficher dans une alerte plus visible (Toast ou Alert component)
- Ou l'intégrer dans le badge "Modifications non enregistrées"

---

## 6. Autres observations

### ✅ OK : Optimisation du calcul de lastUsedAt

**Fichier :** `src/app/(dashboard)/templates/page.tsx` (lignes 15-25)

**Validation :**
- Utilisation de `getLastUsedAtByTemplateIds()` avec une requête SQL optimisée ✅
- Calcul côté serveur avant le rendu ✅
- Pas de requête N+1 ✅

---

### ✅ OK : Normalisation des données dans les queries

**Fichier :** `src/lib/db/queries/templates.ts`

**Validation :**
- Fonctions `normalizeString()` et `normalizeArray()` utilisées ✅
- Gestion des valeurs `null`/`undefined` ✅
- Retour de types cohérents ✅

---

## Résumé des actions recommandées

### Priorité haute
1. **TPL-AUD-001** : Supprimer la duplication du type `TemplateField`
2. **TPL-AUD-007** : Corriger le comptage des champs dans `TemplateCard`
3. **TPL-AUD-003** : Valider strictement `content` dans PATCH même avec `.partial()`

### Priorité moyenne
4. **TPL-AUD-004** : Convertir `/templates/[id]` en Server Component
5. **TPL-AUD-005** : Utiliser Server Action pour créer un template
6. **TPL-AUD-006** : Revoir le fallback de parsing dans `parseTemplateContent`

### Priorité basse
7. **TPL-AUD-002** : Corriger le commentaire sur le type `Template`
8. **TPL-AUD-008** : Considérer Server Action pour la duplication (optionnel)
9. **TPL-AUD-009** : Améliorer la visibilité du message d'erreur de validation

---

## Conclusion

Le domaine Templates présente une architecture solide avec une bonne séparation des responsabilités et un respect strict des contraintes multi-tenant. Les principales améliorations à apporter concernent :

1. **Cohérence des types** : Éliminer la duplication de `TemplateField`
2. **Architecture RSC** : Migrer `/templates/[id]` vers Server Component
3. **Validation** : Renforcer la validation du `content` dans PATCH
4. **Corrections mineures** : Comptage des champs, commentaires, UX

Aucun problème de sécurité critique n'a été identifié. Les risques sont principalement liés à la maintenabilité et à la cohérence du code.
