# 🔍 AUDIT PRÉ-DÉVELOPPEMENT DASHBOARD

**Date** : 2024-12-19  
**Type de dashboard** : Analytics/Admin (statistiques sur clients, offres, templates)  
**Stack** : Next.js 15, Supabase (PostgreSQL), Drizzle ORM, Tailwind CSS + shadcn/ui

---

## 📋 PARTIE 1 : RÉSUMÉ EXÉCUTIF (5-10 lignes)

**Statut global** : 🟡 **PRÊT AVEC PRÉREQUIS**

Votre base actuelle est **globalement solide** pour démarrer le développement d'un dashboard. L'architecture multi-tenant est bien en place avec RLS activé, les API routes sont protégées, et le layout de base existe. Cependant, **3 points critiques** doivent être adressés avant de commencer : (1) Les fonctions d'agrégation manquantes (`countClients`, `countOffers`, etc.) utilisées par `/api/dashboard/summary` doivent être implémentées, (2) La connexion Drizzle bypass potentiellement RLS (même si le code filtre par `org_id`), et (3) Aucune pagination/filtrage n'existe pour les listes qui pourraient devenir volumineuses. Le schéma de données est cohérent avec des timestamps et statuts clairs, mais il manque des index pour optimiser les requêtes d'agrégation. La structure UI est prête avec `AppShell` et `Sidebar`, mais il faudra créer un design system cohérent pour les widgets du dashboard.

---

## 📊 PARTIE 2 : ANALYSE DÉTAILLÉE PAR CATÉGORIE

### 1. ARCHITECTURE & DONNÉES

#### ✅ Points positifs

1. **Schéma de données cohérent**
   - ✅ Toutes les tables ont `org_id` pour l'isolation multi-tenant
   - ✅ Timestamps `created_at` et `updated_at` présents partout
   - ✅ Statuts clairs pour les offres (`draft`, `sent`, `accepted`, `rejected`)
   - ✅ Relations FK bien définies (`offers.client_id`, `offers.template_id`)
   - ✅ Types de données appropriés (numeric pour les montants, jsonb pour les items)

2. **Queries existantes bien structurées**
   - ✅ Filtrage systématique par `org_id` dans toutes les queries
   - ✅ Normalisation des données (strings, arrays, numbers)
   - ✅ Gestion d'erreurs avec `firstOrError`
   - ✅ Pattern cohérent entre `clients.ts`, `templates.ts`, `offers.ts`

3. **API routes organisées**
   - ✅ Routes RESTful (`/api/clients`, `/api/offres`, `/api/templates`)
   - ✅ Protection avec `getCurrentOrgId()` partout
   - ✅ Validation avec Zod schemas
   - ✅ Gestion d'erreurs HTTP appropriée (401, 404, 500)

#### ⚠️ Problèmes identifiés

1. **🚨 CRITIQUE : Fonctions d'agrégation manquantes**
   - **Fichier** : `src/app/api/dashboard/summary/route.ts`
   - **Problème** : L'API route importe et utilise des fonctions qui n'existent pas :
     - `countClients(orgId)` depuis `@/lib/db/queries/clients`
     - `countTemplates(orgId)` depuis `@/lib/db/queries/templates`
     - `countOffers(orgId)` depuis `@/lib/db/queries/offers`
     - `getRecentOffers(orgId, limit)` depuis `@/lib/db/queries/offers`
   - **Impact** : Le dashboard ne peut pas démarrer sans ces fonctions
   - **Solution** : Implémenter ces 4 fonctions dans les fichiers de queries respectifs

2. **⚠️ Pas de pagination sur les listes**
   - **Fichiers** : `listClients()`, `listOffers()`, `listTemplates()`
   - **Problème** : Toutes les fonctions retournent toutes les entités sans limite
   - **Impact** : Performance dégradée si une organisation a beaucoup de données
   - **Solution** : Ajouter des paramètres `limit` et `offset` (optionnel pour MVP)

3. **⚠️ Pas d'index sur les colonnes fréquemment filtrées**
   - **Schéma** : `src/lib/db/schema.ts`
   - **Problème** : Pas d'index explicite sur `org_id`, `created_at`, `status` (offers)
   - **Impact** : Requêtes d'agrégation lentes sur de gros volumes
   - **Solution** : Ajouter des index dans une migration Drizzle

4. **⚠️ Pas de requêtes d'agrégation pour statistiques**
   - **Problème** : Aucune fonction pour calculer :
     - Total des offres par statut
     - Montant total des offres acceptées
     - Évolution temporelle (offres créées par mois)
     - Top clients par nombre d'offres
   - **Impact** : Le dashboard sera limité aux compteurs basiques
   - **Solution** : Créer des fonctions d'agrégation dans `offers.ts`

5. **⚠️ Connexion Drizzle pourrait bypasser RLS**
   - **Fichier** : `src/lib/db/index.ts`
   - **Problème** : Utilise `DATABASE_URL` qui est probablement une connexion PostgreSQL directe (superuser)
   - **Impact** : RLS n'est pas efficace si la connexion utilise un superuser
   - **Note** : Le code filtre déjà par `org_id`, donc le risque est mitigé mais pas éliminé
   - **Solution** : Documenter ce comportement et ajouter des assertions dans les queries

#### ❓ Informations manquantes

1. **Volume de données attendu**
   - Combien d'organisations ?
   - Combien de clients/offres/templates par organisation en moyenne ?
   - Besoin de pagination immédiat ou plus tard ?

2. **Type de dashboard souhaité**
   - Dashboard analytics (graphiques, tendances) ?
   - Dashboard admin (gestion, actions) ?
   - Dashboard utilisateur (vue d'ensemble personnalisée) ?

---

### 2. SÉCURITÉ & RÔLES

#### ✅ Points positifs

1. **Authentification robuste**
   - ✅ Utilise Supabase Auth avec `@supabase/ssr`
   - ✅ JWT validation avec `getUser()` (pas `getSession()` qui peut être obsolète)
   - ✅ Gestion des cookies correcte (`createBrowserClient` + `createServerClient`)
   - ✅ Middleware protège les routes `/dashboard`, `/clients`, `/offers`, `/templates`

2. **Autorisations multi-tenant**
   - ✅ RLS activé sur toutes les tables métier (`clients`, `templates`, `offers`)
   - ✅ Politiques RLS complètes (SELECT, INSERT, UPDATE, DELETE)
   - ✅ Fonction helper `public.org_id()` pour extraire `org_id` du JWT
   - ✅ Filtrage systématique par `org_id` dans toutes les queries applicatives

3. **Protection IDOR**
   - ✅ Toutes les routes avec `[id]` vérifient `org_id` :
     - `getClientById(id, orgId)`
     - `getOfferById(id, orgId)`
     - `getTemplateById(id, orgId)`
   - ✅ Retourne 404 si l'entité n'appartient pas à l'org (pas de leak d'information)

4. **API routes sécurisées**
   - ✅ Toutes les routes utilisent `getCurrentOrgId()` qui vérifie la session
   - ✅ Validation des inputs avec Zod
   - ✅ Gestion d'erreurs appropriée (401 pour non authentifié, 404 pour not found)

#### ⚠️ Problèmes identifiés

1. **🚨 CRITIQUE : Connexion Drizzle bypass RLS**
   - **Fichier** : `src/lib/db/index.ts`
   - **Problème** : La connexion utilise probablement un superuser PostgreSQL
   - **Impact** : Si une query oublie le filtre `org_id`, elle expose toutes les données
   - **Mitigation actuelle** : Toutes les queries filtrent déjà par `org_id`
   - **Solution recommandée** :
     - Court terme : Ajouter des assertions `if (!orgId) throw new Error(...)` dans toutes les queries
     - Moyen terme : Ajouter des tests E2E pour vérifier l'isolation multi-tenant
     - Long terme : Migrer vers une connexion qui respecte RLS nativement

2. **⚠️ Pas de vérification de rôles/permissions**
   - **Problème** : Tous les utilisateurs authentifiés ont les mêmes droits
   - **Impact** : Pas de distinction admin/utilisateur pour le dashboard
   - **Solution** : Si besoin, ajouter un système de rôles (ex: `user_metadata.role`)

3. **⚠️ `org_id` optionnel dans le type `User`**
   - **Fichier** : `src/types/domain.ts` ligne 51
   - **Problème** : `org_id?: string` permet un utilisateur sans organisation
   - **Impact** : `getCurrentOrgId()` peut throw si `org_id` manque
   - **Solution** : Vérifier que tous les utilisateurs ont un `org_id` à la création

4. **⚠️ Pas de rate limiting sur les API routes**
   - **Problème** : Aucune protection contre les abus (DDoS, scraping)
   - **Impact** : Risque de surcharge serveur si le dashboard fait beaucoup de requêtes
   - **Solution** : Ajouter un middleware de rate limiting (ex: `@upstash/ratelimit`)

#### ✅ Points de sécurité solides

- ✅ RLS activé et bien configuré
- ✅ Protection IDOR en place
- ✅ Validation des inputs avec Zod
- ✅ Gestion d'erreurs sécurisée (pas de leak d'information)

---

### 3. UI/UX & STRUCTURE

#### ✅ Points positifs

1. **Layout existant**
   - ✅ `AppShell` avec sidebar et header (`src/components/layout/app-shell.tsx`)
   - ✅ `Sidebar` avec navigation (`src/components/sidebar.tsx`)
   - ✅ Layout dashboard (`src/app/dashboard/layout.tsx`) qui utilise `AppShell`
   - ✅ Structure responsive (mobile avec menu hamburger)

2. **Design system partiel**
   - ✅ Utilise shadcn/ui (composants dans `src/components/ui/`)
   - ✅ Tailwind CSS configuré
   - ✅ Thème dark/light avec `next-themes`
   - ✅ Composants de base : `Button`, `Input`, etc.

3. **Navigation structurée**
   - ✅ Routes principales définies : Dashboard, Clients, Templates, Offers
   - ✅ Active state sur les liens de navigation
   - ✅ Redirections appropriées (login → dashboard si auth)

#### ⚠️ Problèmes identifiés

1. **🚨 CRITIQUE : Page dashboard vide**
   - **Fichier** : `src/app/dashboard/page.tsx`
   - **Problème** : La page ne contient qu'un titre et un paragraphe
   - **Impact** : Aucun contenu à afficher pour le dashboard
   - **Solution** : Créer les widgets du dashboard (stats, graphiques, liste récente)

2. **⚠️ Composants dashboard de démo non utilisés**
   - **Fichiers** : `src/app/(DashboardLayout)/components/dashboard/*.tsx`
   - **Problème** : Composants MUI (Material-UI) avec données mockées
   - **Impact** : Incompatibles avec shadcn/ui + Tailwind actuel
   - **Solution** : Soit migrer vers shadcn/ui, soit créer de nouveaux composants

3. **⚠️ Pas de design system cohérent pour les widgets**
   - **Problème** : Aucun composant réutilisable pour :
     - Cards de statistiques (compteurs avec icônes)
     - Graphiques (charts)
     - Tableaux de données récentes
     - Filtres de période (date range picker)
   - **Impact** : Chaque widget devra être créé from scratch
   - **Solution** : Créer une bibliothèque de composants dashboard

4. **⚠️ Pas de gestion d'état pour les données du dashboard**
   - **Problème** : Aucun système de cache/refetch pour les données du dashboard
   - **Impact** : Rechargement complet à chaque navigation
   - **Solution** : Utiliser React Query ou SWR pour le cache

5. **⚠️ Pas de loading states**
   - **Problème** : Aucun skeleton loader ou spinner pour les données en chargement
   - **Impact** : UX dégradée pendant les requêtes
   - **Solution** : Ajouter des composants de loading (skeleton, spinner)

6. **⚠️ Pas de gestion d'erreurs UI**
   - **Problème** : Aucun composant d'erreur pour afficher les erreurs API
   - **Impact** : Erreurs silencieuses ou pages blanches
   - **Solution** : Créer des composants d'erreur avec retry

#### ❓ Informations manquantes

1. **Type de widgets souhaités**
   - Graphiques (bar, line, pie) ?
   - Tableaux de données ?
   - Cards de statistiques ?
   - Filtres temporels ?

2. **Bibliothèque de graphiques**
   - Recharts (déjà dans `package.json`) ?
   - ApexCharts (utilisé dans les composants MUI) ?
   - Chart.js ?
   - Autre ?

---

## ✅ PARTIE 3 : CHECKLIST "GO / NO GO" DASHBOARD

### 🟢 CE QUI EST OK POUR COMMENCER

1. ✅ **Architecture multi-tenant** : RLS activé, filtrage par `org_id` partout
2. ✅ **Authentification** : Supabase Auth bien configuré, middleware protège les routes
3. ✅ **Schéma de données** : Cohérent avec timestamps, statuts, relations FK
4. ✅ **API routes** : Protégées, validées, gestion d'erreurs appropriée
5. ✅ **Layout de base** : `AppShell` et `Sidebar` fonctionnels
6. ✅ **Design system partiel** : shadcn/ui + Tailwind CSS configurés
7. ✅ **Types TypeScript** : Domain types bien définis

### 🟡 ACCEPTABLE MAIS À SURVEILLER

1. ⚠️ **Connexion Drizzle** : Bypass RLS mais code filtre par `org_id` (à documenter)
2. ⚠️ **Pas de pagination** : OK pour MVP, à ajouter si volume important
3. ⚠️ **Pas d'index** : Performance acceptable pour petits volumes, à optimiser plus tard
4. ⚠️ **Composants dashboard** : Existent mais incompatibles (MUI vs shadcn/ui)
5. ⚠️ **Pas de rate limiting** : OK pour MVP, à ajouter en production

### 🔴 BLOQUANT AVANT DE DÉMARRER

1. 🚨 **Fonctions d'agrégation manquantes** : `countClients`, `countTemplates`, `countOffers`, `getRecentOffers`
2. 🚨 **Page dashboard vide** : Aucun contenu à afficher
3. 🚨 **API `/api/dashboard/summary` cassée** : Imports de fonctions inexistantes

---

## 🎯 PARTIE 4 : PLAN D'ACTION CONCRET

### 🔴 NIVEAU 1 : À FAIRE ABSOLUMENT AVANT DE CODER LE DASHBOARD

#### 1.1 Implémenter les fonctions d'agrégation manquantes

**Fichiers à modifier** :

- `src/lib/db/queries/clients.ts`
  ```typescript
  export async function countClients(orgId: string): Promise<number> {
    if (!orgId) throw new Error('orgId is required');
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(clients)
      .where(eq(clients.org_id, orgId));
    return Number(result[0]?.count ?? 0);
  }
  ```

- `src/lib/db/queries/templates.ts`
  ```typescript
  export async function countTemplates(orgId: string): Promise<number> {
    if (!orgId) throw new Error('orgId is required');
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(templates)
      .where(eq(templates.org_id, orgId));
    return Number(result[0]?.count ?? 0);
  }
  ```

- `src/lib/db/queries/offers.ts`
  ```typescript
  import { sql } from 'drizzle-orm';
  
  export async function countOffers(orgId: string): Promise<number> {
    if (!orgId) throw new Error('orgId is required');
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(offers)
      .where(eq(offers.org_id, orgId));
    return Number(result[0]?.count ?? 0);
  }
  
  export async function getRecentOffers(orgId: string, limit: number = 10): Promise<Offer[]> {
    if (!orgId) throw new Error('orgId is required');
    const results = await db.select()
      .from(offers)
      .where(eq(offers.org_id, orgId))
      .orderBy(desc(offers.created_at))
      .limit(limit);
    
    return results.map((row) => ({
      id: row.id,
      client_id: row.client_id,
      template_id: row.template_id ?? null,
      title: normalizeString(row.title),
      items: normalizeArray(row.items),
      subtotal: Math.round(normalizeNumber(row.subtotal)),
      tax_rate: normalizeNumber(row.tax_rate),
      tax_amount: Math.round(normalizeNumber(row.tax_amount)),
      total: Math.round(normalizeNumber(row.total)),
      status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    }));
  }
  ```

**Action** : Implémenter ces 4 fonctions avec assertions `orgId` obligatoire.

#### 1.2 Ajouter des assertions `orgId` dans toutes les queries existantes

**Fichiers à modifier** :
- `src/lib/db/queries/clients.ts` : Ajouter `if (!orgId) throw new Error('orgId is required')` au début de chaque fonction
- `src/lib/db/queries/templates.ts` : Idem
- `src/lib/db/queries/offers.ts` : Idem

**Action** : Garantir que `orgId` n'est jamais `null` ou `undefined`.

#### 1.3 Tester l'API `/api/dashboard/summary`

**Action** : Vérifier que l'endpoint retourne bien les données attendues après l'implémentation des fonctions.

---

### 🟡 NIVEAU 2 : À FAIRE PENDANT LE DÉVELOPPEMENT DU DASHBOARD

#### 2.1 Créer les composants de base du dashboard

**Composants à créer** :

- `src/components/dashboard/StatsCard.tsx` : Card avec icône, titre, valeur, variation
- `src/components/dashboard/RecentOffersList.tsx` : Liste des offres récentes
- `src/components/dashboard/ChartWrapper.tsx` : Wrapper pour graphiques (Recharts)
- `src/components/dashboard/LoadingSkeleton.tsx` : Skeleton loader pour les données

**Action** : Créer ces composants réutilisables avec shadcn/ui + Tailwind.

#### 2.2 Implémenter la page dashboard

**Fichier** : `src/app/dashboard/page.tsx`

**Structure suggérée** :
```typescript
export default async function DashboardPage() {
  const data = await fetch('/api/dashboard/summary').then(r => r.json());
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Clients" value={data.clientsCount} icon={Users} />
        <StatsCard title="Templates" value={data.templatesCount} icon={FileText} />
        <StatsCard title="Offres" value={data.offersCount} icon={FileCheck} />
      </div>
      
      {/* Recent Offers */}
      <RecentOffersList offers={data.recentOffers} />
    </div>
  );
}
```

**Action** : Créer la page avec les widgets de base.

#### 2.3 Ajouter la gestion d'erreurs et loading states

**Action** : Ajouter des composants d'erreur avec retry et des skeletons pendant le chargement.

#### 2.4 Créer des fonctions d'agrégation avancées (optionnel)

**Fichier** : `src/lib/db/queries/offers.ts`

**Fonctions à ajouter** :
- `getOffersByStatus(orgId, status)` : Compter les offres par statut
- `getTotalRevenue(orgId)` : Montant total des offres acceptées
- `getOffersByMonth(orgId, year)` : Offres créées par mois

**Action** : Implémenter selon les besoins du dashboard.

---

### 🔵 NIVEAU 3 : À FAIRE PLUS TARD (MAIS À NOTER)

#### 3.1 Optimiser les performances

- Ajouter des index sur `org_id`, `created_at`, `status` (offers)
- Implémenter la pagination sur les listes
- Ajouter du cache (React Query ou SWR)

#### 3.2 Améliorer la sécurité

- Migrer la connexion Drizzle pour respecter RLS nativement
- Ajouter du rate limiting sur les API routes
- Ajouter des tests E2E d'isolation multi-tenant

#### 3.3 Enrichir le dashboard

- Ajouter des graphiques (évolution temporelle, répartition par statut)
- Ajouter des filtres de période (date range picker)
- Ajouter des exports (CSV, PDF)

#### 3.4 Système de rôles (si besoin)

- Ajouter `user_metadata.role` (admin, user)
- Créer des permissions différenciées
- Adapter le dashboard selon le rôle

---

## 📝 CONCLUSION

**Verdict final** : 🟡 **PRÊT AVEC PRÉREQUIS**

Vous pouvez démarrer le développement du dashboard **après avoir implémenté les 3 points bloquants du Niveau 1** :
1. Fonctions d'agrégation manquantes
2. Assertions `orgId` dans les queries
3. Test de l'API `/api/dashboard/summary`

Une fois ces prérequis en place, vous aurez une base solide pour développer un dashboard fonctionnel et sécurisé.

**Risques majeurs identifiés** :
- 🚨 Connexion Drizzle bypass RLS (mitigé par filtrage code)
- 🚨 Fonctions manquantes (bloquant)
- ⚠️ Pas de pagination (acceptable pour MVP)

**Recommandation** : Commencer par le Niveau 1, puis développer le dashboard de base (Niveau 2), et optimiser plus tard (Niveau 3).

---

**Fin du rapport d'audit**

