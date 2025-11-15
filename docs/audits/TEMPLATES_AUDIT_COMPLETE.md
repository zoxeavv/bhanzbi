# Audit complet du domaine Templates

**Date :** 2024  
**Contexte :** Audit exhaustif post-refacto du domaine Templates  
**Scope :** Pages, API, Components, Logic & Utils

---

## 1) 🔎 Vue d'ensemble du domaine /templates

### Rôle du domaine
Le domaine Templates permet de créer, gérer et utiliser des modèles d'offres commerciales. Chaque template contient une structure de champs dynamique (text, number, date, select, textarea) stockée sous forme de JSON dans le champ `content`.

### Architecture de chargement et stockage
- **Stockage :** Table `templates` avec `org_id` pour isolation multi-tenant
- **Chargement :** 
  - Listing : Server Component → `listTemplates(orgId)` → enrichissement avec `lastUsedAt`
  - Détail : Server Component → `getTemplateById(id, orgId)` → parsing du `content`
  - Création : Client Component → Server Action `createTemplateFromParsedDocx()`
- **Validation :** Schéma Zod centralisé `createTemplateSchema` dans `validations.ts`

### Structure content et parsing
- **Format :** JSON stringifié `{"fields": TemplateField[]}`
- **Parsing :** Fonction centralisée `parseTemplateContent()` dans `content.ts`
  - Validation stricte via `templateContentSchema.safeParse()`
  - Retourne `[]` si invalide (pas de fallback réparateur)
- **Sérialisation :** `serializeTemplateContent(fields)` pour convertir en JSON string

### Communication entre pages
- **Listing → Détail :** Navigation via Link Next.js
- **Détail → Création :** Redirection si `id === "nouveau"`
- **Création → Détail :** Redirection après création réussie
- **Mutations :** 
  - Création : Server Action (`createTemplateFromParsedDocx`)
  - Duplication : Server Action (`duplicateTemplate`)
  - Mise à jour : Fetch vers API PATCH (encore en fetch client)

### Composants UI/logic
**Composants clients :**
- `TemplatesPageClient` : Listing avec recherche/filtres
- `TemplateCard` : Carte de template avec duplication
- `TemplateDetailClient` : Édition complète avec panels structure/preview
- `TemplateStructurePanel` : Gestion des champs (add/update/delete)
- `TemplateFieldEditor` : Éditeur individuel de champ avec validation UX
- `TemplatePreview` : Aperçu live du formulaire généré

**Utilitaires :**
- `schema.ts` : Schémas Zod + validation
- `content.ts` : Parsing/sérialisation centralisés
- `queries/templates.ts` : Couche DB avec normalisation

---

## 2) ✅ Points forts

### Architecture RSC
✅ **Excellent :** Pages listing et détail sont des Server Components
- `/templates/page.tsx` : Server Component avec data fetching direct DB
- `/templates/[id]/page.tsx` : Server Component avec parsing côté serveur
- Pas de requêtes HTTP inutiles pour le chargement initial

### Séparation Server vs Client
✅ **Bonne séparation :**
- Server Components pour data fetching
- Client Components uniquement pour l'interactivité (édition, validation)
- Props-only data flow (pas de fetching dans les composants clients)

### Multi-tenant strict
✅ **Parfait :** Aucune fuite de `org_id`
- Toutes les queries filtrent sur `org_id`
- `orgId` récupéré uniquement côté serveur via `getCurrentOrgId()`
- Jamais passé au client ni exposé dans les réponses API
- Routes API vérifient systématiquement `orgId`

### Schémas Zod cohérents
✅ **Centralisés et cohérents :**
- `templateFieldSchema` : Validation exhaustive des champs
- `templateContentSchema` : Validation de la structure complète
- `createTemplateSchema` : Validation création avec normalisation du content
- Types TypeScript inférés automatiquement
- Une seule source de vérité pour `TemplateField` (dans `schema.ts`)

### Parsing robuste
✅ **Strict et centralisé :**
- `parseTemplateContent()` : Validation stricte, pas de fallback réparateur
- `serializeTemplateContent()` : Sérialisation centralisée
- Détection d'erreurs de parsing avec `hasInvalidContent`
- Logs détaillés pour debugging

### Design system
✅ **Bien utilisé :**
- `PageHeader` et `Toolbar` dans `TemplatesPageClient`
- Composants shadcn/ui cohérents (Card, Button, Badge, Input, Select, etc.)
- Empty states avec `EmptyState` component
- Loading states gérés (spinners, progress bars)

### UX complète
✅ **États bien gérés :**
- Loading : Spinners, progress bars, états `isPending`
- Empty : EmptyState pour listing vide et filtres sans résultats
- Error : Messages d'erreur clairs, toasts, alertes visibles
- Validation UX : Validation en temps réel dans `TemplateFieldEditor`
- Feedback : Toasts pour succès/erreur, badges pour état

### Validation UX
✅ **Excellente :**
- Validation en temps réel avec `useEffect` dans `TemplateFieldEditor`
- Affichage des erreurs sous les champs
- Validation des options pour `select` (non vide, pas de doublons)
- Remontée de l'état de validation au parent
- Bouton "Enregistrer" désactivé si champs invalides
- Message d'erreur visible juste au-dessus du bouton

### Performance
✅ **Optimisée :**
- `lastUsedAt` calculé avec une requête SQL optimisée (GROUP BY + MAX)
- Pas de requête N+1
- Calcul côté serveur avant le rendu
- Normalisation des données dans les queries (évite les valeurs null)

---

## 3) ⚠️ Problèmes / risques

### TPL-AUD-010 : Mise à jour template encore en fetch client
**Fichier(s) :** `src/components/templates/TemplateDetailClient.tsx` (lignes 44-69, 72-98)

**Gravité :** Medium

**Problème :** 
Les fonctions `handleSave()` et `handleResetStructure()` utilisent encore `fetch()` vers `/api/templates/[id]` au lieu d'une Server Action.

**Conséquence potentielle :**
- Requête HTTP supplémentaire inutile
- Pas de progressive enhancement
- Incohérence avec le pattern Server Actions utilisé pour création/duplication

**Suggestion de correction :**
- Créer une Server Action `updateTemplateContent(templateId, content)` dans `actions.ts`
- Remplacer les `fetch()` par des appels à cette Server Action
- Utiliser `useTransition` pour gérer l'état de chargement

---

### TPL-AUD-011 : Route API GET /api/templates/[id] potentiellement inutilisée
**Fichier(s) :** `src/app/api/templates/[id]/route.ts` (lignes 8-28)

**Gravité :** Low

**Problème :**
La route GET `/api/templates/[id]` existe mais n'est plus utilisée depuis la migration vers Server Component. Le template est chargé directement via `getTemplateById()` dans la page.

**Conséquence potentielle :**
- Code mort non supprimé
- Maintenance inutile
- Confusion pour les développeurs

**Suggestion de correction :**
- Vérifier si cette route est utilisée ailleurs (recherche dans le codebase)
- Si non utilisée, la supprimer ou la documenter comme "legacy"
- Si utilisée, la garder mais documenter son usage

---

### TPL-AUD-012 : Route API POST /api/templates encore présente mais remplacée
**Fichier(s) :** `src/app/api/templates/route.ts` (lignes 41-78)

**Gravité :** Low

**Problème :**
La route POST `/api/templates` existe toujours mais la création se fait maintenant via Server Action `createTemplateFromParsedDocx()`. La route pourrait être utilisée par `TemplateCard` pour la duplication, mais celle-ci utilise aussi une Server Action.

**Conséquence potentielle :**
- Code dupliqué (même logique dans route API et Server Action)
- Maintenance double
- Confusion sur quelle méthode utiliser

**Suggestion de correction :**
- Vérifier si la route POST est encore utilisée
- Si non utilisée, la supprimer ou la documenter comme "legacy API"
- Si utilisée (ex: intégrations externes), la garder mais documenter

---

### TPL-AUD-013 : Validation du slug non vérifiée pour unicité
**Fichier(s) :** 
- `src/lib/validations.ts` (ligne 58)
- `src/app/(dashboard)/templates/nouveau/actions.ts` (ligne 33)
- `src/app/(dashboard)/templates/actions.ts` (ligne 33)

**Gravité :** Medium

**Problème :**
Le schéma `createTemplateSchema` valide que le slug est non vide (`min(1)`) mais ne vérifie pas l'unicité au sein de l'organisation. Les Server Actions génèrent des slugs avec timestamp pour éviter les collisions, mais pas de vérification explicite.

**Conséquence potentielle :**
- Risque de collision si deux templates sont créés simultanément avec le même slug
- Erreur DB non gérée proprement (contrainte unique si elle existe)

**Suggestion de correction :**
- Ajouter une vérification d'unicité dans les Server Actions avant création
- Utiliser `getTemplateBySlug()` pour vérifier l'existence
- Générer un slug alternatif si collision détectée
- Ou ajouter une contrainte unique en DB et gérer l'erreur proprement

---

### TPL-AUD-014 : Mock parsing .docx non documenté comme temporaire
**Fichier(s) :** `src/app/(dashboard)/templates/nouveau/page.tsx` (lignes 17-59)

**Gravité :** Low

**Problème :**
La fonction `mockParseDocx()` simule le parsing d'un fichier .docx avec des champs hardcodés. Aucune indication claire que c'est temporaire en attendant une vraie implémentation.

**Conséquence potentielle :**
- Risque que cette fonction reste en production sans vraie implémentation
- Confusion pour les développeurs sur l'état réel du parsing

**Suggestion de correction :**
- Ajouter un commentaire TODO clair indiquant que c'est un mock temporaire
- Documenter l'intention de remplacer par un vrai parser .docx
- Peut-être ajouter un warning en console en mode dev

---

### TPL-AUD-015 : Gestion d'erreur générique dans les Server Actions
**Fichier(s) :** 
- `src/app/(dashboard)/templates/nouveau/actions.ts` (lignes 50-75)
- `src/app/(dashboard)/templates/actions.ts` (lignes 55-85)

**Gravité :** Low

**Problème :**
Les Server Actions retournent des messages d'erreur génériques ("Erreur inconnue", "Données invalides") qui ne donnent pas beaucoup de contexte pour le debugging côté client.

**Conséquence potentielle :**
- Debugging plus difficile côté client
- Messages d'erreur peu utiles pour l'utilisateur

**Suggestion de correction :**
- Logger les erreurs détaillées côté serveur (déjà fait)
- Retourner des messages d'erreur plus spécifiques quand possible
- Peut-être ajouter un code d'erreur dans le résultat pour permettre un traitement différencié côté client

---

### TPL-AUD-016 : Pas de validation de l'unicité du slug côté client avant création
**Fichier(s) :** `src/app/(dashboard)/templates/nouveau/page.tsx` (lignes 29-33)

**Gravité :** Low

**Problème :**
Le slug est généré côté client à partir du nom de fichier sans vérification d'unicité. La validation se fait uniquement côté serveur lors de la création.

**Conséquence potentielle :**
- L'utilisateur pourrait créer un template avec un slug qui existe déjà
- Erreur retournée seulement après le parsing du fichier

**Suggestion de correction :**
- Optionnel : Vérifier l'unicité du slug avant de commencer le parsing
- Ou améliorer le message d'erreur si collision détectée côté serveur

---

### TPL-AUD-017 : Pas de gestion de la contrainte unique sur slug en DB
**Fichier(s) :** `src/lib/db/queries/templates.ts` (ligne 93)

**Gravité :** Medium

**Problème :**
La fonction `createTemplate()` insère directement sans vérifier l'unicité du slug. Si une contrainte unique existe en DB, l'erreur ne sera pas gérée proprement.

**Conséquence potentielle :**
- Erreur DB brute si slug dupliqué
- Pas de message d'erreur utilisateur clair

**Suggestion de correction :**
- Vérifier l'unicité avant insertion avec `getTemplateBySlug()`
- Ou capturer l'erreur de contrainte unique et retourner un message clair
- Documenter le comportement attendu

---

### TPL-AUD-018 : Redirection générique en cas d'erreur dans les pages
**Fichier(s) :** 
- `src/app/(dashboard)/templates/page.tsx` (lignes 30-38)
- `src/app/(dashboard)/templates/[id]/page.tsx` (lignes 50-61)

**Gravité :** Low

**Problème :**
En cas d'erreur non gérée, les pages redirigent vers `/` ou `/templates` sans afficher de message d'erreur à l'utilisateur.

**Conséquence potentielle :**
- L'utilisateur ne comprend pas pourquoi il est redirigé
- Pas de feedback sur l'erreur

**Suggestion de correction :**
- Utiliser un mécanisme de message d'erreur (ex: query param, toast via middleware)
- Ou afficher une page d'erreur dédiée avant redirection
- Logger l'erreur pour le debugging

---

### TPL-AUD-019 : Pas de vérification de l'existence du template avant duplication
**Fichier(s) :** `src/app/(dashboard)/templates/actions.ts` (ligne 25)

**Gravité :** Low

**Problème :**
La fonction `duplicateTemplate()` appelle `getTemplateById()` qui lève une erreur si le template n'existe pas, mais cette erreur est gérée de manière générique.

**Conséquence potentielle :**
- Message d'erreur peu clair si template introuvable
- Pas de distinction entre "template introuvable" et "non autorisé"

**Suggestion de correction :**
- Gérer explicitement le cas "not found" avec un message spécifique
- Vérifier l'existence avant de continuer

---

### TPL-AUD-020 : Pas de limite sur le nombre de champs dans un template
**Fichier(s) :** `src/lib/templates/schema.ts` (ligne 46)

**Gravité :** Low

**Problème :**
Le schéma `templateContentSchema` accepte un tableau de champs sans limite de taille. Un utilisateur pourrait créer un template avec des centaines de champs.

**Conséquence potentielle :**
- Performance dégradée lors du rendu
- UX dégradée (scroll infini)
- Risque de timeout lors de la sérialisation

**Suggestion de correction :**
- Ajouter une validation `.max()` sur le tableau de champs
- Limiter à un nombre raisonnable (ex: 50 champs max)
- Documenter la limite

---

### TPL-AUD-021 : Pas de validation de la longueur des noms de champs
**Fichier(s) :** `src/lib/templates/schema.ts` (ligne 14)

**Gravité :** Low

**Problème :**
Le schéma `templateFieldSchema` valide que `field_name` est non vide (`min(1)`) mais ne limite pas la longueur maximale.

**Conséquence potentielle :**
- Noms de champs très longs qui cassent l'UI
- Problèmes d'affichage dans les cartes et previews

**Suggestion de correction :**
- Ajouter une validation `.max(100)` ou similaire
- Ou tronquer côté affichage avec `line-clamp`

---

### TPL-AUD-022 : Pas de validation de la longueur des options dans select
**Fichier(s) :** `src/lib/templates/schema.ts` (ligne 20)

**Gravité :** Low

**Problème :**
Le tableau `options` pour les champs `select` n'a pas de limite sur le nombre d'options ni sur la longueur de chaque option.

**Conséquence potentielle :**
- Select avec des centaines d'options (UX dégradée)
- Options très longues qui cassent l'UI

**Suggestion de correction :**
- Limiter le nombre d'options (ex: 50 max)
- Limiter la longueur de chaque option (ex: 100 caractères)

---

### TPL-AUD-023 : Gestion d'erreur dans handleSave/handleResetStructure peu informative
**Fichier(s) :** `src/components/templates/TemplateDetailClient.tsx` (lignes 54-55, 82-83)

**Gravité :** Low

**Problème :**
Les erreurs de fetch sont capturées avec un message générique "Erreur lors de l'enregistrement" sans distinction entre les types d'erreurs (400, 401, 500, etc.).

**Conséquence potentielle :**
- L'utilisateur ne sait pas pourquoi l'enregistrement a échoué
- Debugging plus difficile

**Suggestion de correction :**
- Parser le `response.json()` pour récupérer le message d'erreur de l'API
- Afficher des messages différenciés selon le status code
- Logger l'erreur complète pour le debugging

---

### TPL-AUD-024 : Pas de debounce sur la détection des changements
**Fichier(s) :** `src/components/templates/TemplateDetailClient.tsx` (lignes 36-42)

**Gravité :** Low

**Problème :**
Le `useEffect` qui détecte les changements (`hasChanges`) s'exécute à chaque modification de `fields` ou `template`, ce qui peut être fréquent lors de l'édition.

**Conséquence potentielle :**
- Calculs inutiles à chaque frappe
- Performance légèrement dégradée avec beaucoup de champs

**Suggestion de correction :**
- Ajouter un debounce sur la détection des changements
- Ou optimiser la comparaison (memoization)

---

### TPL-AUD-025 : Clé React basée sur field.id qui peut être undefined
**Fichier(s) :** `src/components/templates/TemplateStructurePanel.tsx` (ligne 106)

**Gravité :** Low

**Problème :**
La clé React `key={field.id}` utilise `field.id` qui est optionnel dans le schéma Zod. Si `id` est `undefined`, React utilisera `undefined` comme clé.

**Conséquence potentielle :**
- Warning React si plusieurs champs sans `id`
- Problèmes de réconciliation React

**Suggestion de correction :**
- Utiliser `key={field.id || index}` comme fallback
- Ou s'assurer que tous les champs ont un `id` avant le rendu

---

## 4) 💡 Améliorations proposées

### Court terme (quick wins)

1. **Migrer handleSave/handleResetStructure vers Server Action**
   - Créer `updateTemplateContent()` dans `actions.ts`
   - Remplacer les `fetch()` par la Server Action
   - Utiliser `useTransition` pour le loading

2. **Vérifier et nettoyer les routes API inutilisées**
   - Rechercher les usages de GET/POST `/api/templates`
   - Supprimer ou documenter comme legacy si non utilisées

3. **Améliorer les messages d'erreur**
   - Parser les réponses d'erreur de l'API pour afficher des messages spécifiques
   - Différencier les types d'erreurs (validation, auth, not found, etc.)

4. **Ajouter des limites de validation**
   - Limiter le nombre de champs (ex: 50 max)
   - Limiter la longueur des `field_name` (ex: 100 caractères)
   - Limiter le nombre d'options dans select (ex: 50 max)

5. **Vérifier l'unicité du slug avant création**
   - Ajouter une vérification dans les Server Actions
   - Générer un slug alternatif si collision

### Moyen terme (refacto structurante)

1. **Unifier les patterns de mutation**
   - Toutes les mutations via Server Actions (création, duplication, mise à jour)
   - Supprimer les routes API POST/PATCH si non nécessaires
   - Créer un fichier `actions.ts` centralisé pour toutes les actions templates

2. **Améliorer la gestion d'erreurs**
   - Créer un type d'erreur structuré pour les Server Actions
   - Système de codes d'erreur pour traitement différencié côté client
   - Logger structuré avec contexte (templateId, orgId, etc.)

3. **Optimiser la détection des changements**
   - Ajouter un debounce sur `hasChanges`
   - Utiliser `useMemo` pour la comparaison de contenu
   - Éviter les recalculs inutiles

4. **Valider l'unicité du slug en DB**
   - Ajouter une contrainte unique sur `(org_id, slug)` en DB
   - Gérer proprement les erreurs de contrainte
   - Documenter le comportement

5. **Améliorer la robustesse des clés React**
   - S'assurer que tous les champs ont un `id` avant le rendu
   - Utiliser un fallback `index` si `id` manquant
   - Générer les IDs côté serveur si nécessaire

### Long terme (vision)

1. **Parser .docx réel**
   - Implémenter un vrai parser .docx (ex: `mammoth`, `docx`)
   - Extraire automatiquement les champs depuis le document
   - Gérer les erreurs de parsing

2. **Versioning de templates**
   - Historique des modifications
   - Possibilité de restaurer une version précédente
   - Comparaison entre versions

3. **Templates partagés entre organisations**
   - Système de templates publics/privés
   - Marketplace de templates
   - Import/export de templates

4. **Optimisations UX avancées**
   - Drag & drop pour réordonner les champs
   - Prévisualisation en temps réel avec données de test
   - Templates avec conditions (champs conditionnels)
   - Validation avancée (regex, min/max, etc.)

5. **Patterns library réutilisables**
   - Extraire la logique de templates en library réutilisable
   - Composants génériques pour d'autres domaines
   - Documentation et exemples

6. **Tests automatisés**
   - Tests unitaires pour les schémas Zod
   - Tests d'intégration pour les Server Actions
   - Tests E2E pour les flux utilisateur

---

## 5) 🧱 Checklist finale

| Critère | État | Notes |
|---------|------|-------|
| **Multi-tenant (aucune fuite org_id)** | ✅ OK | Toutes les queries filtrent sur `org_id`, jamais exposé au client |
| **RSC par défaut** | ✅ OK | Pages listing et détail sont Server Components |
| **Pas de fetch client inutile** | ⚠️ À améliorer | `handleSave` et `handleResetStructure` utilisent encore `fetch()` |
| **Server Actions pour mutations critiques** | ⚠️ Partiel | Création et duplication OK, mise à jour encore en fetch |
| **Validation Zod centralisée et stricte** | ✅ OK | Schémas centralisés, validation stricte, types inférés |
| **content parsé exclusivement via util dédié** | ✅ OK | `parseTemplateContent()` utilisé partout, pas de parsing manuel |
| **API sans risque IDOR** | ✅ OK | Toutes les routes vérifient `orgId`, filtrent sur `org_id` |
| **Performance (pas de N+1, lastUsedAt optimisé)** | ✅ OK | Requête SQL optimisée, pas de N+1 |
| **Design system respecté** | ✅ OK | PageHeader, Toolbar, EmptyState, composants shadcn/ui |
| **UX complète (loading/error/empty)** | ✅ OK | Tous les états gérés, validation UX excellente |
| **Types unifiés, pas de duplication** | ✅ OK | Une seule source de vérité pour `TemplateField` |
| **Maintenance & lisibilité** | ✅ OK | Code bien structuré, commentaires présents, séparation claire |

---

## Résumé exécutif

Le domaine Templates présente une **architecture solide** avec une bonne séparation Server/Client Components, un respect strict du multi-tenant, et une validation robuste. Les principales améliorations à apporter concernent :

1. **Migration complète vers Server Actions** : Remplacer les derniers `fetch()` par des Server Actions
2. **Nettoyage des routes API** : Vérifier et supprimer les routes inutilisées
3. **Amélioration de la gestion d'erreurs** : Messages plus spécifiques et structurés
4. **Ajout de limites de validation** : Protéger contre les cas limites (nombre de champs, longueurs, etc.)

**Score global : 8.5/10**

- ✅ Architecture RSC : Excellent
- ✅ Multi-tenant : Parfait
- ✅ Validation : Très bonne
- ⚠️ Patterns de mutation : À unifier
- ✅ UX : Excellente
- ✅ Performance : Optimisée


