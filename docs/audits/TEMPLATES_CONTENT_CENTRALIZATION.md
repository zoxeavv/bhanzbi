# Centralisation de la logique de parsing/sérialisation du content des templates

## Résumé

Extraction des fonctions de parsing/sérialisation du champ `content` des templates dans un utilitaire centralisé (`src/lib/templates/content.ts`). Tous les usages dupliqués ont été remplacés par les fonctions centralisées.

---

## Fichiers modifiés

### 1. Nouveau fichier : `src/lib/templates/content.ts`

**Créé** : Fichier utilitaire centralisé pour le parsing/sérialisation du content.

```typescript
import type { TemplateField } from "./schema"
import { templateContentSchema } from "./schema"

/**
 * Parse le champ content d'un template (JSON string) en tableau de TemplateField
 */
export function parseTemplateContent(raw: string | null | undefined): TemplateField[] {
  if (!raw || raw.trim() === "") {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    
    // Valider avec le schéma Zod si possible
    const result = templateContentSchema.safeParse(parsed)
    
    if (result.success) {
      return result.data.fields
    }

    // Fallback : si structure incorrecte mais fields existe, essayer de mapper manuellement
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.fields)) {
      console.error("[parseTemplateContent] Structure invalide, tentative de mapping manuel:", result.error)
      
      // Mapper les champs avec valeurs par défaut pour compatibilité
      return parsed.fields.map((field: any) => ({
        id: field.id || `field-${Date.now()}-${Math.random()}`,
        field_name: field.field_name || "",
        field_type: field.field_type || "text",
        placeholder: field.placeholder,
        required: field.required || false,
        options: field.options,
      }))
    }

    console.error("[parseTemplateContent] Structure JSON invalide, aucun champ 'fields' trouvé")
    return []
  } catch (error) {
    console.error("[parseTemplateContent] Erreur lors du parsing JSON:", error)
    return []
  }
}

/**
 * Sérialise un tableau de TemplateField en JSON string pour le champ content
 */
export function serializeTemplateContent(fields: TemplateField[]): string {
  return JSON.stringify({ fields })
}
```

**Caractéristiques** :
- Utilise le schéma Zod `templateContentSchema` pour la validation
- Fallback gracieux pour les données legacy (mapping manuel si structure invalide)
- Logging des erreurs avec `console.error` pour le debugging
- Retourne tableau vide en cas d'erreur (pas d'exception)

---

### 2. Modifié : `src/app/(dashboard)/templates/[id]/page.tsx`

**Changements** :
- Suppression des fonctions locales `parseTemplateContent` et `serializeTemplateContent`
- Import des fonctions centralisées depuis `@/lib/templates/content`

**Diff** :

```diff
  import { TemplateStructurePanel } from "@/components/templates/TemplateStructurePanel"
  import { TemplatePreview } from "@/components/templates/TemplatePreview"
  import { TemplateField } from "@/components/templates/TemplateFieldEditor"
  import type { Template } from "@/types/domain"
  import { Skeleton } from "@/components/ui/skeleton"
+ import { parseTemplateContent, serializeTemplateContent } from "@/lib/templates/content"

  interface TemplateWithFields extends Template {
    fields?: TemplateField[]
  }

- function parseTemplateContent(content: string): TemplateField[] {
-   try {
-     // Essayer de parser le content comme JSON avec structure { fields: [...] }
-     const parsed = JSON.parse(content)
-     if (parsed.fields && Array.isArray(parsed.fields)) {
-       return parsed.fields.map((field: any) => ({
-         id: field.id || `field-${Date.now()}-${Math.random()}`,
-         field_name: field.field_name || "",
-         field_type: field.field_type || "text",
-         placeholder: field.placeholder,
-         required: field.required || false,
-         options: field.options,
-       }))
-     }
-   } catch {
-     // Si le parsing échoue, retourner un array vide
-   }
-   return []
- }
-
- function serializeTemplateContent(fields: TemplateField[]): string {
-   return JSON.stringify({ fields })
- }

  export default function TemplateDetailPage({
```

**Usages remplacés** :
- ✅ Ligne 71 : `parseTemplateContent(data.content)` → utilise la fonction centralisée
- ✅ Ligne 89 : `serializeTemplateContent(fields)` → utilise la fonction centralisée
- ✅ Ligne 90 : `parseTemplateContent(template.content)` → utilise la fonction centralisée
- ✅ Ligne 91 : `serializeTemplateContent(originalFields)` → utilise la fonction centralisée
- ✅ Ligne 101 : `serializeTemplateContent(fields)` → utilise la fonction centralisée

---

### 3. Modifié : `src/app/(dashboard)/templates/nouveau/page.tsx`

**Changements** :
- Remplacement de `JSON.stringify({ fields: parsed.fields })` par `serializeTemplateContent(parsed.fields)`
- Import de la fonction centralisée

**Diff** :

```diff
  import { FileDropzone } from "@/components/file-dropzone"
  import { toast } from "sonner"
  import { Progress } from "@/components/ui/progress"
+ import { serializeTemplateContent } from "@/lib/templates/content"

  // ... reste du code ...

        body: JSON.stringify({
          title: parsed.title,
          slug: parsed.slug,
-         content: JSON.stringify({ fields: parsed.fields }),
+         content: serializeTemplateContent(parsed.fields),
          category: "",
          tags: [],
        }),
```

**Usage remplacé** :
- ✅ Ligne 96 : `JSON.stringify({ fields: parsed.fields })` → `serializeTemplateContent(parsed.fields)`

---

### 4. Modifié : `src/components/offres/CreateOfferStepper.tsx`

**Changements** :
- Remplacement de `JSON.parse(selectedTemplate.content || "{}")` par `parseTemplateContent(selectedTemplate.content)`
- Simplification de la logique (plus besoin de vérifier manuellement `parsed.fields`)
- Import de la fonction centralisée

**Diff** :

```diff
  import type { Client } from "@/types/domain"
  import type { Template } from "@/types/domain"
  import type { TemplateField } from "@/components/templates/TemplateFieldEditor"
  import { cn } from "@/lib/utils"
+ import { parseTemplateContent } from "@/lib/templates/content"

  // ... reste du code ...

  // Charger les champs du template sélectionné
  useEffect(() => {
    if (selectedTemplate) {
-     try {
-       const parsed = JSON.parse(selectedTemplate.content || "{}")
-       if (parsed.fields && Array.isArray(parsed.fields)) {
-         setTemplateFields(parsed.fields)
-         // Initialiser les valeurs des champs
-         const initialValues: Record<string, string> = {}
-         parsed.fields.forEach((field: TemplateField) => {
-           initialValues[field.id] = ""
-         })
-         setFieldValues(initialValues)
-       } else {
-         setTemplateFields([])
-       }
-     } catch {
-       setTemplateFields([])
-     }
+     const fields = parseTemplateContent(selectedTemplate.content)
+     if (fields.length > 0) {
+       setTemplateFields(fields)
+       // Initialiser les valeurs des champs
+       const initialValues: Record<string, string> = {}
+       fields.forEach((field: TemplateField) => {
+         initialValues[field.id || ""] = ""
+       })
+       setFieldValues(initialValues)
+     } else {
+       setTemplateFields([])
+     }
    } else {
      setTemplateFields([])
    }
  }, [selectedTemplate])
```

**Usage remplacé** :
- ✅ Ligne 100 : `JSON.parse(selectedTemplate.content || "{}")` → `parseTemplateContent(selectedTemplate.content)`
- ✅ Simplification : Plus besoin de try/catch ni de vérification manuelle de `parsed.fields`

---

## Confirmation des endroits où la logique a été remplacée

### ✅ Fichiers modifiés (3 fichiers)

1. **`src/app/(dashboard)/templates/[id]/page.tsx`**
   - ❌ Supprimé : Fonctions locales `parseTemplateContent()` et `serializeTemplateContent()`
   - ✅ Ajouté : Import depuis `@/lib/templates/content`
   - ✅ Remplacement : 5 usages des fonctions locales → fonctions centralisées

2. **`src/app/(dashboard)/templates/nouveau/page.tsx`**
   - ❌ Supprimé : `JSON.stringify({ fields: parsed.fields })`
   - ✅ Ajouté : Import de `serializeTemplateContent`
   - ✅ Remplacement : 1 usage direct de `JSON.stringify` → fonction centralisée

3. **`src/components/offres/CreateOfferStepper.tsx`**
   - ❌ Supprimé : `JSON.parse(selectedTemplate.content || "{}")` avec logique manuelle
   - ✅ Ajouté : Import de `parseTemplateContent`
   - ✅ Remplacement : 1 usage direct de `JSON.parse` → fonction centralisée
   - ✅ Bonus : Simplification du code (suppression try/catch et vérifications manuelles)

### ✅ Fichier créé

1. **`src/lib/templates/content.ts`**
   - ✅ Fonction `parseTemplateContent()` : Parse JSON avec validation Zod + fallback gracieux
   - ✅ Fonction `serializeTemplateContent()` : Sérialise tableau de champs en JSON
   - ✅ Utilise le schéma `templateContentSchema` pour la validation
   - ✅ Logging des erreurs avec `console.error`

---

## Avantages de la centralisation

### 1. **DRY (Don't Repeat Yourself)**
- Plus de duplication de code
- Une seule source de vérité pour le parsing/sérialisation

### 2. **Maintenabilité**
- Modifications futures en un seul endroit
- Correction de bugs centralisée

### 3. **Cohérence**
- Même comportement partout (validation, fallback, gestion d'erreurs)
- Utilisation du schéma Zod pour validation

### 4. **Debugging**
- Logging centralisé avec préfixe `[parseTemplateContent]`
- Plus facile de tracer les problèmes

### 5. **Type-safety**
- Utilise le type `TemplateField` du schéma Zod
- TypeScript garantit la cohérence

---

## Comportement préservé

### ✅ Aucun changement de comportement métier

- **Parsing** : Retourne toujours un tableau (vide si erreur)
- **Sérialisation** : Format JSON identique `{"fields": [...]}`
- **Gestion d'erreurs** : Silencieuse (pas d'exception, retourne tableau vide)
- **Compatibilité legacy** : Fallback pour données invalides mais avec structure `fields`

### ✅ Améliorations apportées

- **Validation Zod** : Utilise le schéma pour valider la structure
- **Logging** : Erreurs loggées avec `console.error` pour debugging
- **Code plus propre** : Simplification dans `CreateOfferStepper.tsx` (suppression try/catch)

---

## Vérifications effectuées

### ✅ Linting
- Aucune erreur de lint détectée

### ✅ Recherche d'usages restants
- Aucun usage direct de `JSON.parse`/`JSON.stringify` pour le content trouvé (sauf dans l'implémentation centralisée)
- Tous les usages pointent vers les fonctions centralisées

### ✅ Imports
- Tous les imports sont corrects
- Types TypeScript cohérents

---

## Prochaines étapes (optionnel)

1. **Tests unitaires** : Ajouter des tests pour `parseTemplateContent` et `serializeTemplateContent`
2. **Migration des types** : Utiliser `TemplateField` depuis `schema.ts` au lieu de `TemplateFieldEditor.tsx` dans les composants
3. **Amélioration du logging** : Utiliser un logger structuré au lieu de `console.error`

---

**Fin de la centralisation**


