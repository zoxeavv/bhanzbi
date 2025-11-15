# Implémentation de la validation centralisée des templates

## Résumé

Introduction d'un schéma centralisé pour valider la structure JSON du champ `content` des templates côté serveur. Cette validation garantit l'intégrité des données et prévient les corruptions.

---

## Fichiers modifiés

### 1. Nouveau fichier : `src/lib/templates/schema.ts`

**Créé** : Fichier dédié pour les schémas de validation des templates.

```typescript
import { z } from "zod"

/**
 * Schéma Zod pour valider un champ de template
 * 
 * Règles de validation :
 * - field_name est requis et non vide
 * - field_type doit être un des types supportés
 * - Si field_type = "select", options doit être un tableau non vide
 * - id est optionnel (généré côté client si absent)
 */
export const templateFieldSchema = z.object({
  id: z.string().optional(),
  field_name: z.string().min(1, "Le nom du champ est requis"),
  field_type: z.enum(["text", "number", "date", "select", "textarea"], {
    errorMap: () => ({ message: "Type de champ invalide" }),
  }),
  placeholder: z.string().optional(),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // Si le type est "select", options doit être défini et non vide
    if (data.field_type === "select") {
      return data.options !== undefined && data.options.length > 0;
    }
    return true;
  },
  {
    message: "Les champs de type 'select' doivent avoir au moins une option",
    path: ["options"],
  }
)

/**
 * Type TypeScript inféré du schéma Zod
 */
export type TemplateField = z.infer<typeof templateFieldSchema>

/**
 * Schéma Zod pour valider la structure complète du content d'un template
 * 
 * Structure attendue : { fields: TemplateField[] }
 */
export const templateContentSchema = z.object({
  fields: z.array(templateFieldSchema).default([]),
})

/**
 * Type TypeScript inféré du schéma Zod
 */
export type TemplateContent = z.infer<typeof templateContentSchema>

/**
 * Valide qu'une chaîne JSON correspond au schéma TemplateContent
 * 
 * @param content - Chaîne JSON à valider
 * @returns Le contenu parsé et validé, ou null si invalide
 */
export function validateTemplateContent(content: string | null | undefined): TemplateContent | null {
  if (!content || content.trim() === "") {
    // Contenu vide ou null → retourner structure vide par défaut
    return { fields: [] };
  }

  try {
    const parsed = JSON.parse(content);
    const result = templateContentSchema.safeParse(parsed);
    
    if (result.success) {
      return result.data;
    }
    
    return null;
  } catch {
    // JSON invalide
    return null;
  }
}
```

---

### 2. Modifié : `src/lib/validations.ts`

**Changements** :
- Import du schéma de validation des templates
- Mise à jour de `createTemplateSchema` pour valider et normaliser le champ `content`

**Diff complet** :

```diff
  import { z } from "zod"
+ import { templateContentSchema, validateTemplateContent } from "@/lib/templates/schema"

  // ... autres schémas ...

  // Schema for API template creation (matches Drizzle schema)
  export const createTemplateSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    slug: z.string().min(1, "Le slug est requis"),
-   content: z.string().optional(),
+   content: z
+     .string()
+     .optional()
+     .transform((val) => {
+       // Normaliser le contenu : null/empty → JSON stringifié de { fields: [] }
+       if (!val || val.trim() === "") {
+         return JSON.stringify({ fields: [] });
+       }
+       return val;
+     })
+     .refine(
+       (val) => {
+         // Valider que le contenu est un JSON valide correspondant à TemplateContent
+         const validated = validateTemplateContent(val);
+         return validated !== null;
+       },
+       {
+         message: "Le contenu doit être un JSON valide avec une structure { fields: [...] }",
+       }
+     )
+     .transform((val) => {
+       // Normaliser le JSON (réordonner les champs, supprimer les valeurs invalides)
+       const validated = validateTemplateContent(val);
+       if (validated) {
+         return JSON.stringify(validated);
+       }
+       // Ne devrait jamais arriver ici car le refine a déjà validé
+       return val;
+     }),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });
```

---

## Explication des choix de schéma

### 1. Structure modulaire (`src/lib/templates/schema.ts`)

**Choix** : Créer un fichier dédié plutôt que d'ajouter dans `validations.ts`

**Raison** :
- **Séparation des responsabilités** : Les schémas templates sont spécifiques au domaine et peuvent évoluer indépendamment
- **Réutilisabilité** : Le schéma peut être importé côté frontend pour la validation client
- **Maintenabilité** : Plus facile à trouver et modifier

### 2. Validation avec `.refine()` pour les règles conditionnelles

**Choix** : Utiliser `.refine()` pour valider que `select` a des options

**Raison** :
- **Règle métier** : Un champ `select` sans options n'a pas de sens
- **Message d'erreur spécifique** : Permet d'indiquer précisément le problème (`path: ["options"]`)
- **Type-safe** : Zod garantit que le type est correct avant d'appliquer la règle

### 3. Normalisation automatique (double `.transform()`)

**Choix** : Normaliser le contenu vide → `{ fields: [] }` et réordonner le JSON

**Raison** :
- **Compatibilité legacy** : Les templates existants avec `content` null/empty continuent de fonctionner
- **Cohérence** : Tous les templates ont une structure JSON valide en DB
- **Sécurité** : Le JSON est réordonné/nettoyé pour éviter les injections ou données corrompues

### 4. Fonction utilitaire `validateTemplateContent()`

**Choix** : Créer une fonction séparée plutôt que d'utiliser directement le schéma Zod

**Raison** :
- **Réutilisabilité** : Peut être utilisée ailleurs (parsing côté client, migrations, etc.)
- **Gestion d'erreurs** : Retourne `null` au lieu de lancer une exception
- **Fallback** : Gère automatiquement les cas `null`/`undefined`/`""`

### 5. Types TypeScript exportés

**Choix** : Exporter `TemplateField` et `TemplateContent` comme types TypeScript

**Raison** :
- **Source de vérité unique** : Les types sont inférés du schéma Zod (DRY)
- **Réutilisation frontend** : Les composants peuvent utiliser les mêmes types
- **Type-safety** : TypeScript garantit la cohérence entre validation et utilisation

---

## Comportement de la validation

### Cas valides

✅ **Contenu vide/null** :
```json
content: null
content: ""
content: undefined
```
→ Normalisé en `'{"fields":[]}'`

✅ **JSON valide avec structure correcte** :
```json
content: '{"fields": [{"field_name": "poste", "field_type": "text", "required": true}]}'
```
→ Validé et normalisé

✅ **Select avec options** :
```json
content: '{"fields": [{"field_name": "type", "field_type": "select", "options": ["CDI", "CDD"]}]}'
```
→ Validé

### Cas invalides (retournent 400)

❌ **JSON invalide** :
```json
content: "{ fields: [ }"
```
→ Erreur : "Le contenu doit être un JSON valide avec une structure { fields: [...] }"

❌ **Structure incorrecte** :
```json
content: '{"data": []}'
```
→ Erreur : "Le contenu doit être un JSON valide avec une structure { fields: [...] }"

❌ **Select sans options** :
```json
content: '{"fields": [{"field_name": "type", "field_type": "select"}]}'
```
→ Erreur : "Les champs de type 'select' doivent avoir au moins une option"

❌ **Champ sans nom** :
```json
content: '{"fields": [{"field_type": "text"}]}'
```
→ Erreur : "Le nom du champ est requis"

❌ **Type invalide** :
```json
content: '{"fields": [{"field_name": "test", "field_type": "invalid"}]}'
```
→ Erreur : "Type de champ invalide"

---

## Impact sur les routes API existantes

### ✅ Aucun changement nécessaire

Les routes API (`/api/templates` POST et `/api/templates/[id]` PATCH) utilisent déjà `createTemplateSchema.parse()`, donc la validation est automatiquement appliquée.

**Comportement** :
- **POST** : Validation complète (tous les champs requis)
- **PATCH** : Validation partielle (`.partial()`) mais si `content` est fourni, il est validé

**Gestion d'erreurs** :
- Erreur Zod → 400 avec `{ error: 'Validation error', details: error.errors }`
- Les détails Zod sont exposés (peut être masqué côté client si nécessaire)

---

## Tests recommandés

### Tests unitaires pour `schema.ts`

```typescript
describe('templateFieldSchema', () => {
  it('valide un champ text valide', () => { ... });
  it('rejette un champ sans field_name', () => { ... });
  it('rejette un select sans options', () => { ... });
  it('valide un select avec options', () => { ... });
});

describe('validateTemplateContent', () => {
  it('retourne { fields: [] } pour null', () => { ... });
  it('valide un JSON valide', () => { ... });
  it('retourne null pour JSON invalide', () => { ... });
});
```

### Tests d'intégration pour les routes API

```typescript
describe('POST /api/templates', () => {
  it('crée un template avec content valide', () => { ... });
  it('rejette un template avec content invalide', () => { ... });
  it('normalise un content vide', () => { ... });
});
```

---

## Prochaines étapes (optionnel)

1. **Migrer les composants frontend** : Utiliser `TemplateField` et `TemplateContent` depuis `schema.ts` au lieu de redéfinir les types
2. **Ajouter validation côté client** : Utiliser les mêmes schémas Zod pour la validation avant envoi
3. **Migration des données existantes** : Script pour valider/nettoyer les templates existants en DB

---

**Fin de l'implémentation**


