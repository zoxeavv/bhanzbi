# Audit détaillé des composants UI - Dashboard

**Date** : 2024-12-15  
**Scope** : Pages dashboard (`/dashboard`, `/clients`, `/offres`, `/templates`, `/settings`)

---

## 📋 Table des matières

1. [Méthodologie](#méthodologie)
2. [Audit par page](#audit-par-page)
3. [Synthèse globale](#synthèse-globale)
4. [Risques et recommandations](#risques-et-recommandations)

---

## Méthodologie

### Scope analysé
- ✅ `src/app/(dashboard)/dashboard/page.tsx`
- ✅ `src/app/(dashboard)/clients/page.tsx` + `[id]/page.tsx`
- ✅ `src/app/(dashboard)/offres/page.tsx` + `[id]/page.tsx`
- ✅ `src/app/(dashboard)/templates/page.tsx` + `[id]/page.tsx`
- ✅ `src/app/(dashboard)/settings/admins/page.tsx`

### Composants analysés
- Composants directs utilisés dans les pages
- Composants enfants (1 niveau de profondeur)
- Composants UI primitifs (shadcn/ui)
- Composants métier/feature-specific

### Critères d'analyse
- Type de composant (UI générique, métier, layout)
- Dépendances (MUI, shadcn, custom)
- Props principales utilisées
- Patterns shadcn respectés
- Duplications et incohérences
- Risques de modification

---

## Audit par page

### 1. Dashboard (`/dashboard`)

#### Structure hiérarchique
```
DashboardPage (RSC)
├── div.space-y-6
    ├── DashboardHeader (Client Component)
    │   ├── DateRangePicker
    │   └── Button + Link
    ├── div.grid (KPIs)
    │   └── KpiCard × 4
    ├── div.grid (Offres + Timeline)
    │   ├── RecentOffersTable
    │   └── Timeline
    └── RecentClients
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `DashboardHeader` | `@/components/dashboard/DashboardHeader` | Métier | - | shadcn/ui |
| `KpiCard` | `@/components/dashboard/KpiCard` | Métier | `title`, `value`, `change`, `icon`, `href` | shadcn/ui (Card) |
| `RecentOffersTable` | `@/components/dashboard/RecentOffersTable` | Métier | `offers[]`, `maxItems` | shadcn/ui (Card, Table) |
| `Timeline` | `@/components/dashboard/Timeline` | Métier | `items[]`, `maxItems` | shadcn/ui (Card) |
| `RecentClients` | `@/components/dashboard/RecentClients` | Métier | `clients[]`, `maxItems` | shadcn/ui (Card, Avatar) |
| `DateRangePicker` | `@/components/date-range-picker` | UI générique | `value`, `onChange` | shadcn/ui (Popover, Calendar) |
| `Button` | `@/components/ui/button` | UI primitif | `asChild`, `variant`, `size` | shadcn/ui |
| `Card` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `Table` | `@/components/ui/table` | UI primitif | - | shadcn/ui |
| `Badge` | `@/components/ui/badge` | UI primitif | `variant` | shadcn/ui |
| `Avatar` | `@/components/ui/avatar` | UI primitif | - | shadcn/ui |

#### Observations

**✅ Points positifs**
- Utilisation correcte de `Button asChild` avec `Link`
- Structure claire avec composants métier bien séparés
- Pas de dépendances MUI détectées

**⚠️ Incohérences**
- `DashboardHeader` : header inline au lieu d'utiliser `PageHeader`
- KPIs utilisent `KpiCard` au lieu de `StatCard` (doublon potentiel)
- Mock data dans le composant (à remplacer par Server Actions)

**🔴 Risques**
- `DashboardHeader` : logique client (`useState` pour dateRange) dans un composant qui pourrait être RSC
- `KpiCard` : navigation via `router.push()` au lieu de `Link` (perte de préfetch Next.js)
- `RecentOffersTable` : navigation via `Link` dans les cellules mais `window.location.href` dans `OffersTable` (incohérence)

---

### 2. Clients (`/clients`)

#### Structure hiérarchique
```
ClientsPage (RSC)
├── div.space-y-6
    ├── PageHeader
    │   └── Button + Link (asChild)
    ├── div.space-y-4
        ├── StatCard
        └── ClientsTableSection (Client Component)
            ├── ClientsSearchBar
            │   └── Toolbar
            └── ClientsTable | EmptyState
                └── ClientsTableRow
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `PageHeader` | `@/components/ui/PageHeader` | UI générique | `title`, `description`, `actions` | shadcn/ui |
| `StatCard` | `@/components/ui/StatCard` | UI générique | `title`, `value`, `icon` | shadcn/ui (Card) |
| `ClientsTableSection` | `@/components/clients/ClientsTableSection` | Métier | `initialClients[]` | shadcn/ui, toast |
| `ClientsSearchBar` | `@/components/clients/ClientsSearchBar` | Métier | `onSearchChange`, `isLoading` | shadcn/ui (Input, Toolbar) |
| `ClientsTable` | `@/components/clients/ClientsTable` | Métier | `clients[]`, `onDelete` | shadcn/ui (Table) |
| `ClientsTableRow` | `@/components/clients/ClientsTableRow` | Métier | `client`, `onDelete` | shadcn/ui (Table) |
| `EmptyState` | `@/components/empty-state` | UI générique | `icon`, `title`, `description`, `actionLabel`, `actionHref` | shadcn/ui (Card, Button) |
| `Toolbar` | `@/components/ui/Toolbar` | UI générique | `children` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `asChild` | shadcn/ui |
| `Input` | `@/components/ui/input` | UI primitif | `placeholder`, `value`, `onChange` | shadcn/ui |

#### Observations

**✅ Points positifs**
- Utilisation correcte de `PageHeader` (pattern standardisé)
- `Button asChild` avec `Link` correctement utilisé
- Recherche avec debounce bien implémentée
- Empty state géré proprement

**⚠️ Incohérences**
- `EmptyState` : utilise `@/components/empty-state` au lieu de `@/components/ui/EmptyState` (doublon)
- `StatCard` : utilisé ici mais `KpiCard` dans dashboard (2 patterns différents pour stats)

**🔴 Risques**
- `ClientsTableSection` : logique de fetch API côté client (pourrait être optimisée avec Server Actions)
- `ClientsSearchBar` : debounce custom au lieu d'utiliser une lib standardisée
- `EmptyState` : doublon avec `@/components/ui/EmptyState` (risque de divergence)

---

### 3. Client Detail (`/clients/[id]`)

#### Structure hiérarchique
```
ClientDetailPage (RSC)
├── div.space-y-6
    ├── PageHeader
    │   └── Button + Link (asChild)
    ├── div.grid (2 colonnes)
        ├── Card (Infos client)
        ├── Card (Notes) [conditionnel]
        ├── StatCard × 3
        └── Card (Offres) | EmptyState
            └── ClientOffersTable
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `PageHeader` | `@/components/ui/PageHeader` | UI générique | `title`, `description`, `actions` | shadcn/ui |
| `Card` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardHeader` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardTitle` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardContent` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `StatCard` | `@/components/ui/StatCard` | UI générique | `title`, `value`, `icon` | shadcn/ui |
| `ClientOffersTable` | `@/components/clients/ClientOffersTable` | Métier | `offers[]` | shadcn/ui (Table, Badge) |
| `EmptyState` | `@/components/empty-state` | UI générique | `icon`, `title`, `description`, `actionLabel`, `actionHref` | shadcn/ui |

#### Observations

**✅ Points positifs**
- Layout 2 colonnes bien structuré
- Utilisation cohérente de `PageHeader` et `Card`
- Empty state géré pour les offres

**⚠️ Incohérences**
- `EmptyState` : encore le doublon `@/components/empty-state`
- `StatCard` : utilisé ici mais `KpiCard` dans dashboard

**🔴 Risques**
- Logique métier dans le JSX : calcul des stats (`totalOffers`, `acceptedOffers`) dans le composant page
- Type étendu `ClientWithExtendedFields` pour champs optionnels non dans le schéma DB (fragile)

---

### 4. Offres (`/offres`)

#### Structure hiérarchique
```
OffresPage (Client Component)
├── div.space-y-6
    ├── div (Header inline)
    │   ├── h1 + p
    │   └── Button + Link (asChild)
    ├── div (Search + Filtres) [conditionnel]
    │   ├── Input (recherche)
    │   └── Select × 2 (statut, client)
    └── OffersTable | EmptyState | Loading skeleton
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `OffersTable` | `@/components/offres/OffersTable` | Métier | `offers[]` | shadcn/ui (Table, Badge) |
| `EmptyState` | `@/components/empty-state` | UI générique | `icon`, `title`, `description`, `actionLabel`, `actionHref` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `asChild` | shadcn/ui |
| `Input` | `@/components/ui/input` | UI primitif | `placeholder`, `value`, `onChange` | shadcn/ui |
| `Select` | `@/components/ui/select` | UI primitif | `value`, `onValueChange` | shadcn/ui |
| `Badge` | `@/components/ui/badge` | UI primitif | `variant` | shadcn/ui |

#### Observations

**✅ Points positifs**
- `Button asChild` correctement utilisé
- Filtres multiples bien gérés
- Loading state avec skeleton

**⚠️ Incohérences**
- **Header inline** : pas de `PageHeader`, structure différente des autres pages
- `EmptyState` : doublon `@/components/empty-state`
- `OffersTable` : navigation via `window.location.href` au lieu de `Link` (incohérence avec `RecentOffersTable`)

**🔴 Risques**
- **Client Component complet** : toute la page est client-side (perte des avantages RSC)
- Fetch API dans `useEffect` : pourrait être optimisé avec Server Actions
- Logique de filtrage côté client : pourrait être déplacée côté serveur pour performance
- `window.location.href` : perte de préfetch Next.js et navigation SPA

---

### 5. Offre Detail (`/offres/[id]`)

#### Structure hiérarchique
```
OfferDetailPage (RSC)
├── div.space-y-6
    ├── div.sticky (Header)
    │   ├── Button (retour)
    │   ├── h1 + Badge
    │   └── Button × 3 (actions)
    └── Tabs
        ├── TabsContent (Édition)
        │   └── OfferEditFormWrapper
        ├── TabsContent (Aperçu)
        │   └── PdfPreview
        └── TabsContent (Historique)
            └── OfferHistoryTimelineWrapper
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `Tabs` | `@/components/ui/tabs` | UI primitif | `defaultValue` | shadcn/ui |
| `TabsList` | `@/components/ui/tabs` | UI primitif | - | shadcn/ui |
| `TabsTrigger` | `@/components/ui/tabs` | UI primitif | `value` | shadcn/ui |
| `TabsContent` | `@/components/ui/tabs` | UI primitif | `value` | shadcn/ui |
| `Badge` | `@/components/ui/badge` | UI primitif | `variant` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `variant`, `size` | shadcn/ui |
| `OfferEditFormWrapper` | `@/components/offres/OfferEditFormWrapper` | Métier | `offerId`, `offer`, `disabled` | shadcn/ui, toast |
| `PdfPreview` | `@/components/offres/PdfPreview` | Métier | `offerId` | - |
| `OfferHistoryTimelineWrapper` | `@/components/offres/OfferHistoryTimelineWrapper` | Métier | `offerId`, `offer` | - |

#### Observations

**✅ Points positifs**
- Structure avec tabs bien organisée
- Header sticky avec actions contextuelles
- Logique métier séparée dans des wrappers

**⚠️ Incohérences**
- **Header inline** : pas de `PageHeader`, structure custom avec sticky
- Navigation retour : `Button` avec `Link` mais pas `asChild` (pattern différent)

**🔴 Risques**
- Header sticky custom : pourrait être standardisé avec `PageHeader` + `sticky`
- Actions (Envoyer, Accepter, Refuser) : pas d'implémentation visible (boutons sans handlers)
- `OfferEditFormWrapper` : wrapper client qui pourrait être simplifié

---

### 6. Templates (`/templates`)

#### Structure hiérarchique
```
TemplatesPage (RSC)
└── Suspense
    └── TemplatesPageClient (Client Component)
        ├── PageHeader
        │   └── Button + Link
        ├── Toolbar (Search + Filtres) [conditionnel]
        │   ├── Input
        │   └── Select
        └── TemplateCard × N | EmptyState
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `TemplatesPageClient` | `@/components/templates/TemplatesPageClient` | Métier | `templates[]` | shadcn/ui, toast |
| `PageHeader` | `@/components/ui/PageHeader` | UI générique | `title`, `description`, `actions` | shadcn/ui |
| `Toolbar` | `@/components/ui/Toolbar` | UI générique | `children` | shadcn/ui |
| `TemplateCard` | `@/components/templates/TemplateCard` | Métier | `template` | shadcn/ui (Card, Badge, Button) |
| `EmptyState` | `@/components/empty-state` | UI générique | `icon`, `title`, `description`, `actionLabel`, `actionHref` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `asChild` | shadcn/ui |
| `Input` | `@/components/ui/input` | UI primitif | `placeholder`, `value`, `onChange` | shadcn/ui |
| `Select` | `@/components/ui/select` | UI primitif | `value`, `onValueChange` | shadcn/ui |

#### Observations

**✅ Points positifs**
- Utilisation correcte de `PageHeader` et `Toolbar`
- Pattern RSC → Client Component bien appliqué
- `Suspense` pour `useSearchParams`
- Grid responsive pour les cartes

**⚠️ Incohérences**
- `EmptyState` : doublon `@/components/empty-state`
- `Button` dans `PageHeader` : `Link` sans `asChild` (pattern incorrect)
- Filtrage côté client : pourrait être optimisé côté serveur

**🔴 Risques**
- `TemplatesPageClient` : logique de filtrage côté client (performance si beaucoup de templates)
- `TemplateCard` : logique de duplication avec Server Actions (complexité)

---

### 7. Template Detail (`/templates/[id]`)

#### Structure hiérarchique
```
TemplateDetailPage (RSC)
└── TemplateDetailClient (Client Component)
    ├── div (Header)
    │   ├── Button (retour)
    │   ├── h1 + Badge
    │   └── Button (Save)
    ├── Card (Erreur) [conditionnel]
    └── div.grid (2 colonnes)
        ├── TemplateStructurePanel
        └── TemplatePreview
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `TemplateDetailClient` | `@/components/templates/TemplateDetailClient` | Métier | `template`, `initialFields[]`, `hasInvalidContent` | shadcn/ui, toast |
| `TemplateStructurePanel` | `@/components/templates/TemplateStructurePanel` | Métier | `fields[]`, `onFieldsChange`, `onValidationChange` | shadcn/ui |
| `TemplatePreview` | `@/components/templates/TemplatePreview` | Métier | `fields[]` | shadcn/ui |
| `Card` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `Badge` | `@/components/ui/badge` | UI primitif | `variant` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `variant`, `size` | shadcn/ui |

#### Observations

**✅ Points positifs**
- Layout split-panel bien structuré
- Gestion d'erreur avec card dédiée
- Validation en temps réel

**⚠️ Incohérences**
- Header inline : pas de `PageHeader`
- Navigation retour : `Button` avec `Link` mais pas `asChild`

**🔴 Risques**
- Composant très complexe : beaucoup de logique métier (parsing, validation, debounce)
- `hasInvalidContent` : gestion d'erreur de parsing (fragile)
- Server Actions : `updateTemplateAction`, `resetTemplateStructure` (dépendances externes)

---

### 8. Settings Admins (`/settings/admins`)

#### Structure hiérarchique
```
AdminsSettingsPage (RSC)
├── div.space-y-6
    ├── PageHeader
    └── AdminAllowedEmailsClient (Client Component)
        ├── Card (Formulaire)
        │   ├── CardHeader
        │   └── CardContent
        │       └── form (Input + Button)
        └── Card (Liste)
            ├── CardHeader
            └── CardContent
                └── Table | Empty state inline
```

#### Composants utilisés

| Composant | Chemin | Type | Props principales | Dépendances |
|-----------|--------|------|-------------------|-------------|
| `PageHeader` | `@/components/ui/PageHeader` | UI générique | `title`, `description` | shadcn/ui |
| `AdminAllowedEmailsClient` | `@/app/(dashboard)/settings/admins/AdminAllowedEmailsClient` | Métier | `initialItems[]` | shadcn/ui, toast |
| `Card` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardHeader` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardTitle` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardDescription` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `CardContent` | `@/components/ui/card` | UI primitif | - | shadcn/ui |
| `Table` | `@/components/ui/table` | UI primitif | - | shadcn/ui |
| `Input` | `@/components/ui/input` | UI primitif | `type`, `placeholder`, `value`, `onChange` | shadcn/ui |
| `Label` | `@/components/ui/label` | UI primitif | `htmlFor` | shadcn/ui |
| `Button` | `@/components/ui/button` | UI primitif | `variant`, `size`, `disabled` | shadcn/ui |

#### Observations

**✅ Points positifs**
- Utilisation correcte de `PageHeader`
- Structure Card bien organisée
- Validation email côté client
- Empty state inline dans la Card (pattern cohérent)

**⚠️ Incohérences**
- Empty state : inline au lieu d'utiliser `EmptyState` (mais cohérent avec le design)

**🔴 Risques**
- `AdminAllowedEmailsClient` : logique métier complexe (validation, fetch, router.refresh)
- `useTransition` : gestion d'état de pending (bon pattern mais à vérifier)
- Fetch API : pourrait être remplacé par Server Actions

---

## Synthèse globale

### Tableau des composants réutilisés

| Composant | Utilisé dans | Type | Doublons | Risques |
|-----------|--------------|------|----------|---------|
| `PageHeader` | clients, templates, settings | UI générique | ❌ | ✅ Aucun |
| `StatCard` | clients, clients/[id] | UI générique | ⚠️ Avec `KpiCard` | ⚠️ Doublon avec `KpiCard` |
| `KpiCard` | dashboard | UI générique | ⚠️ Avec `StatCard` | ⚠️ Doublon avec `StatCard` |
| `EmptyState` | clients, offres, templates | UI générique | ⚠️ 2 versions | 🔴 Doublon critique |
| `Toolbar` | clients, templates | UI générique | ❌ | ✅ Aucun |
| `Button` | Toutes pages | UI primitif | ❌ | ✅ Aucun |
| `Card` | Toutes pages | UI primitif | ❌ | ✅ Aucun |
| `Table` | dashboard, clients, offres, settings | UI primitif | ❌ | ✅ Aucun |
| `Input` | clients, offres, templates, settings | UI primitif | ❌ | ✅ Aucun |
| `Select` | offres, templates | UI primitif | ❌ | ✅ Aucun |
| `Badge` | dashboard, offres, templates | UI primitif | ❌ | ✅ Aucun |
| `Tabs` | offres/[id] | UI primitif | ❌ | ✅ Aucun |

### Patterns identifiés

#### ✅ Patterns bien appliqués
1. **RSC → Client Component** : Templates, Settings (bon pattern)
2. **Button asChild** : Utilisé correctement dans la plupart des cas
3. **PageHeader** : Standardisé dans clients, templates, settings
4. **Card structure** : Utilisation cohérente de CardHeader, CardTitle, CardContent

#### ⚠️ Patterns incohérents
1. **Header inline** : Offres, Offre Detail, Template Detail (pas de `PageHeader`)
2. **EmptyState** : 2 versions (`@/components/empty-state` vs `@/components/ui/EmptyState`)
3. **StatCard vs KpiCard** : 2 composants pour le même besoin
4. **Navigation** : Mix de `Link`, `router.push()`, `window.location.href`

#### 🔴 Patterns problématiques
1. **Client Component complet** : Offres page (perte des avantages RSC)
2. **Fetch API dans useEffect** : Offres, Clients (pourrait être Server Actions)
3. **Logique métier dans JSX** : Client Detail (calculs dans le composant)

---

## Risques et recommandations

### 🔴 Risques critiques

#### 1. Doublon `EmptyState`
- **Fichiers** : `@/components/empty-state.tsx` vs `@/components/ui/EmptyState.tsx`
- **Impact** : Divergence de comportement, maintenance difficile
- **Recommandation** : Consolider vers `@/components/ui/EmptyState.tsx` (plus complet)

#### 2. Doublon `StatCard` / `KpiCard`
- **Fichiers** : `@/components/ui/StatCard.tsx` vs `@/components/dashboard/KpiCard.tsx`
- **Impact** : Incohérence visuelle, duplication de code
- **Recommandation** : Analyser les différences et fusionner ou renommer clairement

#### 3. Navigation incohérente
- **Patterns** : `Link`, `router.push()`, `window.location.href`
- **Impact** : Perte de préfetch Next.js, navigation SPA cassée
- **Recommandation** : Standardiser sur `Link` ou `Button asChild + Link`

#### 4. Client Component complet (`OffresPage`)
- **Impact** : Perte des avantages RSC (SEO, performance, hydration)
- **Recommandation** : Refactorer en RSC avec Client Components pour les parties interactives

### ⚠️ Risques modérés

#### 5. Header inline vs `PageHeader`
- **Pages concernées** : Offres, Offre Detail, Template Detail
- **Impact** : Incohérence visuelle et structurelle
- **Recommandation** : Standardiser sur `PageHeader` partout

#### 6. Fetch API dans `useEffect`
- **Pages concernées** : Offres, Clients (partiellement)
- **Impact** : Performance, SEO, hydration
- **Recommandation** : Migrer vers Server Actions ou RSC

#### 7. Logique métier dans JSX
- **Pages concernées** : Client Detail (calculs de stats)
- **Impact** : Maintenabilité, testabilité
- **Recommandation** : Extraire dans des fonctions utilitaires ou Server Actions

### ✅ Points de vigilance

#### 8. Dépendances externes
- **Aucune dépendance MUI détectée** ✅
- **shadcn/ui bien utilisé** ✅
- **Pas de CSS custom problématique** ✅

#### 9. Props et types
- **Types bien définis** ✅
- **Props documentées** (partiellement) ⚠️
- **Interfaces cohérentes** ✅

#### 10. Accessibilité
- **Labels présents** ✅
- **ARIA attributes** (partiellement) ⚠️
- **Navigation clavier** (à vérifier) ⚠️

---

## Recommandations prioritaires

### Phase 1 : Consolidation (Impact élevé, Risque faible)
1. ✅ Consolider `EmptyState` → `@/components/ui/EmptyState.tsx`
2. ✅ Analyser et fusionner `StatCard` / `KpiCard`
3. ✅ Standardiser navigation sur `Link` / `Button asChild`

### Phase 2 : Standardisation (Impact moyen, Risque faible)
4. ✅ Standardiser headers sur `PageHeader`
5. ✅ Uniformiser les patterns de recherche/filtres
6. ✅ Documenter les composants transverses

### Phase 3 : Optimisation (Impact élevé, Risque modéré)
7. ✅ Refactorer `OffresPage` en RSC
8. ✅ Migrer fetch API vers Server Actions
9. ✅ Extraire logique métier des composants UI

---

## Conclusion

### Points forts
- ✅ Architecture claire avec séparation UI / Métier
- ✅ Utilisation cohérente de shadcn/ui
- ✅ Pas de dépendances MUI
- ✅ Patterns RSC bien appliqués (sauf Offres)

### Points à améliorer
- ⚠️ Doublons de composants (`EmptyState`, `StatCard`/`KpiCard`)
- ⚠️ Incohérences de navigation
- ⚠️ Headers non standardisés
- ⚠️ Client Component complet pour Offres

### Risques de modification
- 🔴 **Faible risque** : Composants UI primitifs (shadcn/ui)
- ⚠️ **Risque modéré** : Composants métier (dépendances logiques)
- 🔴 **Risque élevé** : Pages avec logique métier complexe (Offres, Templates Detail)

### Prêt pour redesign
- ✅ **Oui** : Structure solide, patterns identifiés
- ⚠️ **Attention** : Consolider les doublons avant redesign
- ✅ **Recommandation** : Suivre les phases 1-2 avant refacto majeur

---

**Fin de l'audit**

