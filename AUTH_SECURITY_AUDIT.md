# 🔒 AUDIT COMPLET DE SÉCURITÉ - AUTHENTIFICATION

**Date** : 2024-12-19  
**Scope** : Stack d'authentification Next.js 16 + Supabase  
**Version** : Next.js 16.0.0, Supabase v2 (@supabase/ssr 0.5.2)

---

## 📊 1. VUE D'ENSEMBLE

### Architecture actuelle

Le projet utilise **Next.js 16 avec App Router** et **Supabase v2** pour l'authentification. L'architecture suit un modèle multi-tenant basé sur `org_id` stocké dans les métadonnées utilisateur (`user_metadata.org_id`).

### Schéma textuel du flux d'authentification

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUX D'AUTHENTIFICATION                      │
└─────────────────────────────────────────────────────────────────┘

1. LOGIN (Client)
   ┌──────────────────────────────────────────────────────────┐
   │ AuthLogin.tsx (Client Component)                          │
   │  ↓                                                          │
   │ supabase.auth.signInWithPassword()                        │
   │  ↓                                                          │
   │ Reçoit: { access_token, refresh_token }                   │
   │  ↓                                                          │
   │ POST /api/auth/exchange                                    │
   └──────────────────────────────────────────────────────────┘
                          ↓
2. EXCHANGE (Server API Route)
   ┌──────────────────────────────────────────────────────────┐
   │ /api/auth/exchange/route.ts                                │
   │  ↓                                                          │
   │ createServerClient() + setSession()                        │
   │  ↓                                                          │
   │ Définit cookies: sb-<project-ref>-auth-token              │
   │  ↓                                                          │
   │ Retourne { ok: true }                                      │
   └──────────────────────────────────────────────────────────┘
                          ↓
3. REDIRECTION (Client)
   ┌──────────────────────────────────────────────────────────┐
   │ router.push("/dashboard")                                  │
   │ router.refresh()                                           │
   └──────────────────────────────────────────────────────────┘
                          ↓
4. MIDDLEWARE (Edge Runtime)
   ┌──────────────────────────────────────────────────────────┐
   │ middleware.ts                                              │
   │  ↓                                                          │
   │ getSessionFromRequest(request)                             │
   │  ↓                                                          │
   │ createServerClient() avec cookies filtrés                 │
   │  ↓                                                          │
   │ supabase.auth.getSession()                                 │
   │  ↓                                                          │
   │ Vérifie: session !== null                                  │
   │  ↓                                                          │
   │ Si /dashboard → hasValidSession ? next() : redirect(/login)│
   └──────────────────────────────────────────────────────────┘
                          ↓
5. PAGE PROTÉGÉE (Server Component)
   ┌──────────────────────────────────────────────────────────┐
   │ /dashboard/page.tsx (ou autres pages)                      │
   │  ↓                                                          │
   │ getCurrentOrgId() → requireSession() → getSession()        │
   │  ↓                                                          │
   │ getSupabaseClient() → validateSessionWithClient()         │
   │  ↓                                                          │
   │ client.auth.getSession()                                   │
   │  ↓                                                          │
   │ Retourne orgId pour requêtes DB                            │
   └──────────────────────────────────────────────────────────┘
                          ↓
6. API ROUTES (Server)
   ┌──────────────────────────────────────────────────────────┐
   │ /api/clients, /api/offres, etc.                            │
   │  ↓                                                          │
   │ getCurrentOrgId() → requireSession()                       │
   │  ↓                                                          │
   │ Requêtes DB avec filtrage org_id                           │
   └──────────────────────────────────────────────────────────┘
```

### Cartographie des fichiers clés

#### Middleware & Proxy
- **`middleware.ts`** (racine) : Protection des routes, redirections, validation de session
- ❌ **Pas de `proxy.ts`** : Utilise encore `middleware.ts` (Next.js 16 compatible mais pas optimal)

#### Clients Supabase
- **`src/lib/supabase/client.ts`** : Client browser (`createBrowserClient`)
- **`src/lib/supabase/server.ts`** : Client serveur (`createServerClient`)
- **`src/lib/auth/session.ts`** : Utilitaires de session (`getSession`, `getSessionFromRequest`, `requireSession`, `getCurrentOrgId`)

#### Pages d'authentification
- **`src/app/authentication/auth/AuthLogin.tsx`** : Formulaire de login (Client Component)
- **`src/app/authentication/login/page.tsx`** : Page wrapper pour login
- **`src/app/authentication/register/page.tsx`** : Page d'inscription

#### Routes protégées
- **`src/app/dashboard/page.tsx`** : Page dashboard simple (Server Component)
- **`src/app/(dashboard)/page.tsx`** : Page dashboard avec fetch client (Client Component)
- **`src/app/(DashboardLayout)/dashboard/page.tsx`** : Page dashboard dans layout group
- **`src/app/(dashboard)/clients/[id]/page.tsx`** : Page détail client (Server Component)
- **`src/app/(DashboardLayout)/clients/page.tsx`** : Liste clients (Server Component)

#### API Routes
- **`src/app/api/auth/exchange/route.ts`** : Échange tokens → cookies
- **`src/app/api/clients/route.ts`** : CRUD clients
- **`src/app/api/clients/[id]/route.ts`** : CRUD client par ID
- **`src/app/api/offres/route.ts`** : CRUD offres
- **`src/app/api/offres/[id]/route.ts`** : CRUD offre par ID
- **`src/app/api/templates/route.ts`** : CRUD templates

#### Database & RLS
- **`src/lib/db/schema.ts`** : Schéma Drizzle (clients, offers, templates)
- **`src/lib/db/queries/clients.ts`** : Requêtes clients avec filtrage `org_id`
- **`src/lib/db/queries/offers.ts`** : Requêtes offres avec filtrage `org_id`
- **`src/lib/db/queries/templates.ts`** : Requêtes templates avec filtrage `org_id`
- **`drizzle/0002_enable_rls.sql`** : Migration RLS avec policies

#### Layouts
- **`src/app/layout.tsx`** : Root layout (pas de protection)
- **`src/app/dashboard/layout.tsx`** : Layout dashboard (AppShell)
- **`src/app/(dashboard)/layout.tsx`** : Layout route group (Sidebar)
- **`src/app/(DashboardLayout)/layout.tsx`** : Layout route group (Sidebar)

---

## 🚨 2. PROBLÈMES DÉTECTÉS

### 🔴 CRITIQUE - Problème 1 : Utilisation de `getSession()` au lieu de `getUser()` dans `session.ts`

**Fichiers impliqués** :
- `src/lib/auth/session.ts` (lignes 37-58, 60-63)

**Description** :
La fonction `getSession()` utilise `client.auth.getSession()` qui peut retourner une session **non authentifiée** si le JWT est expiré ou invalide. Supabase recommande d'utiliser `getUser()` pour vérifier l'authentification réelle.

**Risque** :
- Un utilisateur avec un JWT expiré pourrait être considéré comme authentifié
- Les API routes pourraient accepter des requêtes non authentifiées
- Bypass potentiel de la protection RLS si le JWT est mal formé

**Exemple d'attaque** :
```typescript
// Scénario : JWT expiré mais session encore en mémoire
const session = await getSession(); // Retourne session avec user mais JWT invalide
const orgId = session.orgId; // Utilisé pour requêtes DB
// RLS pourrait rejeter mais l'app pense que l'user est auth
```

**Gravité** : 🔴 **CRITIQUE**

---

### 🔴 CRITIQUE - Problème 2 : `getSession()` dans `session.ts` ne lit pas les cookies

**Fichiers impliqués** :
- `src/lib/auth/session.ts` (lignes 60-63)

**Description** :
La fonction `getSession()` utilise `getSupabaseClient()` qui crée un client **sans gestion de cookies**. Ce client ne peut pas lire les cookies de session définis par `createBrowserClient` ou `createServerClient`.

**Code problématique** :
```typescript
export async function getSession(): Promise<Session> {
  const client = getSupabaseClient(); // ❌ createClient() sans cookies
  return validateSessionWithClient(client);
}
```

**Risque** :
- Les Server Components qui appellent `getSession()` ne peuvent pas lire la session
- `requireSession()` et `getCurrentOrgId()` échouent systématiquement
- Toutes les pages protégées qui utilisent ces fonctions retournent des erreurs

**Impact** :
- **Toutes les pages Server Components protégées sont cassées**
- Les API routes fonctionnent car elles utilisent `getCurrentOrgId()` qui appelle `requireSession()` qui appelle `getSession()` qui échoue

**Gravité** : 🔴 **CRITIQUE**

---

### 🔴 CRITIQUE - Problème 3 : Routes `/dashboard` multiples et conflits

**Fichiers impliqués** :
- `src/app/dashboard/page.tsx`
- `src/app/(dashboard)/page.tsx`
- `src/app/(DashboardLayout)/dashboard/page.tsx`
- `middleware.ts` (ligne 47)

**Description** :
Il existe **3 routes différentes** pour `/dashboard` :
1. `src/app/dashboard/page.tsx` → Route `/dashboard` (Server Component simple)
2. `src/app/(dashboard)/page.tsx` → Route `/dashboard` (Client Component avec fetch)
3. `src/app/(DashboardLayout)/dashboard/page.tsx` → Route `/dashboard` (Server Component dans layout group)

**Problème** :
Next.js résout ces routes de manière imprévisible. Le middleware protège `/dashboard` mais ne sait pas quelle route sera servie.

**Risque** :
- Comportement non déterministe selon l'ordre de résolution Next.js
- 404 possible si Next.js ne trouve pas la bonne route
- Incohérence UX selon quelle route est servie

**Gravité** : 🔴 **CRITIQUE** (bloque l'accès à `/dashboard`)

---

### 🟠 IMPORTANT - Problème 4 : Logs de debug en production

**Fichiers impliqués** :
- `middleware.ts` (lignes 8-33)
- `src/lib/auth/session.ts` (lignes 73-78, 96-101, 123, 128-140, 165)
- `src/lib/supabase/client.ts` (lignes 15-21)

**Description** :
De nombreux `console.log()` sont présents dans le code, certains avec des données sensibles (cookies, user IDs, emails).

**Risque** :
- Exposition de données sensibles dans les logs de production
- Performance dégradée (logs synchrones)
- Fuite d'informations sur l'architecture auth

**Exemple** :
```typescript
console.log('[Middleware] Session user id:', session?.user?.id ?? null);
console.log('[getSessionFromRequest] Config check:', { url: ..., keyPrefix: ... });
```

**Gravité** : 🟠 **IMPORTANT**

---

### 🟠 IMPORTANT - Problème 5 : Logout non fonctionnel

**Fichiers impliqués** :
- `src/app/(DashboardLayout)/layout/header/Profile.tsx` (lignes 85-93)

**Description** :
Le bouton "Logout" redirige simplement vers `/authentication/login` sans :
- Appeler `supabase.auth.signOut()`
- Nettoyer les cookies de session
- Invalider la session côté serveur

**Risque** :
- Les cookies de session restent valides après "logout"
- Un utilisateur peut revenir sur `/dashboard` en utilisant les cookies
- Pas de vraie déconnexion

**Gravité** : 🟠 **IMPORTANT**

---

### 🟠 IMPORTANT - Problème 6 : Pas de vérification `getUser()` dans le middleware

**Fichiers impliqués** :
- `middleware.ts` (ligne 23)
- `src/lib/auth/session.ts` (ligne 126)

**Description** :
Le middleware utilise `getSessionFromRequest()` qui appelle `supabase.auth.getSession()`. Il devrait utiliser `getUser()` pour vérifier que le JWT est valide et non expiré.

**Risque** :
- Le middleware pourrait laisser passer des sessions expirées
- Protection insuffisante des routes protégées

**Gravité** : 🟠 **IMPORTANT**

---

### 🟠 IMPORTANT - Problème 7 : `getSession()` dans `session.ts` utilise un client singleton sans cookies

**Fichiers impliqués** :
- `src/lib/auth/session.ts` (lignes 26-35, 60-63)

**Description** :
`getSupabaseClient()` crée un client singleton avec `createClient()` (pas `createServerClient`). Ce client ne peut pas lire les cookies de session.

**Risque** :
- Toutes les fonctions qui utilisent `getSession()` échouent dans les Server Components
- `requireSession()` et `getCurrentOrgId()` ne fonctionnent pas

**Gravité** : 🟠 **IMPORTANT**

---

### 🟡 AMÉLIORATION - Problème 8 : Pas de gestion d'erreur pour `org_id` manquant

**Fichiers impliqués** :
- `src/lib/auth/session.ts` (lignes 182-188)
- Toutes les API routes qui utilisent `getCurrentOrgId()`

**Description** :
Si un utilisateur n'a pas d'`org_id` dans `user_metadata`, `getCurrentOrgId()` lance une erreur générique. Il n'y a pas de mécanisme pour créer ou assigner un `org_id` à un nouvel utilisateur.

**Risque** :
- Nouveaux utilisateurs ne peuvent pas utiliser l'application
- Pas de flow d'onboarding pour créer/assigner `org_id`

**Gravité** : 🟡 **AMÉLIORATION**

---

### 🟡 AMÉLIORATION - Problème 9 : Pas de refresh automatique de session

**Fichiers impliqués** :
- `middleware.ts`
- `src/lib/auth/session.ts`

**Description** :
Le middleware ne rafraîchit pas automatiquement les sessions expirées. Si un JWT expire, l'utilisateur est déconnecté sans tentative de refresh.

**Risque** :
- Expérience utilisateur dégradée (déconnexions inattendues)
- Pas d'utilisation du `refresh_token`

**Gravité** : 🟡 **AMÉLIORATION**

---

### 🟡 AMÉLIORATION - Problème 10 : Pas de protection CSRF explicite

**Fichiers impliqués** :
- Toutes les API routes POST/PATCH/DELETE

**Description** :
Les API routes ne vérifient pas explicitement les tokens CSRF. Next.js et Supabase offrent une protection basique, mais pas de vérification explicite.

**Risque** :
- Vulnérabilité CSRF potentielle (bien que mitigée par les cookies SameSite)

**Gravité** : 🟡 **AMÉLIORATION**

---

### 🟢 BONNE PRATIQUE - Problème 11 : Duplication de code dans `session.ts`

**Fichiers impliqués** :
- `src/lib/auth/session.ts` (lignes 37-58 et 125-167)

**Description** :
`validateSessionWithClient()` et la logique dans `getSessionFromRequest()` dupliquent la validation de session.

**Gravité** : 🟢 **BONNE PRATIQUE**

---

### 🟢 BONNE PRATIQUE - Problème 12 : Pas de rate limiting sur `/api/auth/exchange`

**Fichiers impliqués** :
- `src/app/api/auth/exchange/route.ts`

**Description** :
L'endpoint `/api/auth/exchange` n'a pas de rate limiting. Un attaquant pourrait spammer cet endpoint.

**Gravité** : 🟢 **BONNE PRATIQUE**

---

## 🔍 3. DIAGNOSTIC SPÉCIFIQUE `/dashboard`

### Cheminement d'une requête vers `/dashboard`

1. **Client** : `router.push("/dashboard")` après login
2. **Middleware** (`middleware.ts:47`) :
   - Vérifie `pathname.startsWith('/dashboard')`
   - Appelle `getSessionFromRequest(request)`
   - Si `hasValidSession === false` → redirect `/authentication/login`
   - Si `hasValidSession === true` → `NextResponse.next()`
3. **Next.js Router** : Résout la route `/dashboard`
4. **Problème** : Next.js trouve **3 routes possibles** :
   - `src/app/dashboard/page.tsx` → Route `/dashboard`
   - `src/app/(dashboard)/page.tsx` → Route `/dashboard` (route group)
   - `src/app/(DashboardLayout)/dashboard/page.tsx` → Route `/dashboard` (route group)
5. **Résolution** : Next.js choisit une route de manière non déterministe
6. **Résultat** : 404 si la mauvaise route est choisie ou conflit de résolution

### Raison(s) exacte(s) du 404

1. **Conflit de routes** : 3 routes `/dashboard` existent, Next.js ne sait pas laquelle servir
2. **Route groups** : Les route groups `(dashboard)` et `(DashboardLayout)` créent des chemins ambigus
3. **Ordre de résolution** : Next.js résout les routes dans un ordre qui peut exclure certaines routes

### Scénarios propres de correction possibles

#### Option 1 : Consolider en une seule route `/dashboard` (RECOMMANDÉ)

**Actions** :
1. **SUPPRIMER** `src/app/dashboard/page.tsx`
2. **SUPPRIMER** `src/app/(dashboard)/page.tsx`
3. **GARDER** `src/app/(DashboardLayout)/dashboard/page.tsx` (ou créer une nouvelle route dans le bon layout group)
4. **VÉRIFIER** que le layout `(DashboardLayout)` est le bon choix

**Avantages** :
- Une seule route claire
- Pas de conflit
- Comportement déterministe

#### Option 2 : Utiliser des chemins différents

**Actions** :
1. **GARDER** `src/app/(dashboard)/page.tsx` → Route `/` (dashboard par défaut)
2. **SUPPRIMER** `src/app/dashboard/page.tsx`
3. **SUPPRIMER** `src/app/(DashboardLayout)/dashboard/page.tsx`
4. **MODIFIER** `src/app/page.tsx` pour rediriger vers `/` au lieu de `/dashboard`
5. **MODIFIER** `middleware.ts` pour protéger `/` au lieu de `/dashboard`

**Avantages** :
- Route unique `/` pour le dashboard
- Pas de conflit

#### Option 3 : Utiliser un seul route group

**Actions** :
1. **SUPPRIMER** `src/app/dashboard/` (dossier entier)
2. **SUPPRIMER** `src/app/(dashboard)/` (dossier entier)
3. **GARDER** `src/app/(DashboardLayout)/dashboard/page.tsx`
4. **VÉRIFIER** que le layout `(DashboardLayout)` est cohérent

**Avantages** :
- Architecture claire avec un seul layout group

---

## 📋 4. PLAN D'ACTION

### 🔴 PRIORITÉ CRITIQUE

#### Tâche 1 : Corriger `getSession()` pour utiliser `createServerClient` avec cookies
- **Fichiers** : `src/lib/auth/session.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Remplacer `getSupabaseClient()` par `createSupabaseServerClient()` dans `getSession()`
  - Utiliser `cookies()` de `next/headers` pour lire les cookies
  - Vérifier que `getSession()` fonctionne dans les Server Components
- **Impact** : Toutes les pages protégées et API routes fonctionneront correctement

#### Tâche 2 : Remplacer `getSession()` par `getUser()` pour validation réelle
- **Fichiers** : `src/lib/auth/session.ts`, `middleware.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Créer une fonction `getUserFromRequest()` qui utilise `supabase.auth.getUser()`
  - Modifier `getSessionFromRequest()` pour utiliser `getUser()` au lieu de `getSession()`
  - Modifier `getSession()` pour utiliser `getUser()` puis construire la session
- **Impact** : Validation d'authentification plus robuste, protection contre JWT expirés

#### Tâche 3 : Consolider les routes `/dashboard`
- **Fichiers** : `src/app/dashboard/page.tsx`, `src/app/(dashboard)/page.tsx`, `src/app/(DashboardLayout)/dashboard/page.tsx`, `src/app/page.tsx`, `middleware.ts`
- **Type** : SUPPRESSION + MODIFICATION
- **Actions** :
  - **SUPPRIMER** `src/app/dashboard/page.tsx`
  - **SUPPRIMER** `src/app/(dashboard)/page.tsx`
  - **GARDER** `src/app/(DashboardLayout)/dashboard/page.tsx` (ou créer une nouvelle route dans le bon layout)
  - **VÉRIFIER** que le middleware protège la bonne route
- **Impact** : Plus de 404 sur `/dashboard`, comportement déterministe

---

### 🟠 PRIORITÉ IMPORTANTE

#### Tâche 4 : Implémenter un vrai logout
- **Fichiers** : `src/app/(DashboardLayout)/layout/header/Profile.tsx`, `src/app/api/auth/logout/route.ts` (à créer)
- **Type** : AJOUT + MODIFICATION
- **Actions** :
  - Créer `/api/auth/logout` qui appelle `supabase.auth.signOut()`
  - Modifier `Profile.tsx` pour appeler cette API avant redirection
  - Nettoyer les cookies côté serveur
- **Impact** : Déconnexion réelle, sécurité améliorée

#### Tâche 5 : Retirer les logs de debug en production
- **Fichiers** : `middleware.ts`, `src/lib/auth/session.ts`, `src/lib/supabase/client.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Remplacer `console.log()` par des logs conditionnels `if (process.env.NODE_ENV === 'development')`
  - Retirer les logs avec données sensibles (user IDs, emails, cookies)
  - Utiliser un logger structuré pour la production si nécessaire
- **Impact** : Pas de fuite de données en production, performance améliorée

#### Tâche 6 : Utiliser `getUser()` dans le middleware
- **Fichiers** : `middleware.ts`, `src/lib/auth/session.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Modifier `getSessionFromRequest()` pour utiliser `getUser()` au lieu de `getSession()`
  - Vérifier que le JWT est valide et non expiré
- **Impact** : Protection renforcée des routes protégées

---

### 🟡 PRIORITÉ AMÉLIORATION

#### Tâche 7 : Gérer les utilisateurs sans `org_id`
- **Fichiers** : `src/lib/auth/session.ts`, `src/app/api/auth/onboarding/route.ts` (à créer)
- **Type** : AJOUT + MODIFICATION
- **Actions** :
  - Créer un endpoint `/api/auth/onboarding` pour créer/assigner `org_id`
  - Modifier `getCurrentOrgId()` pour rediriger vers onboarding si `org_id` manquant
  - Créer une page d'onboarding
- **Impact** : Nouveaux utilisateurs peuvent utiliser l'application

#### Tâche 8 : Implémenter le refresh automatique de session
- **Fichiers** : `middleware.ts`, `src/lib/auth/session.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Détecter les JWT expirés dans le middleware
  - Appeler `supabase.auth.refreshSession()` automatiquement
  - Retry la requête après refresh
- **Impact** : Meilleure UX, moins de déconnexions inattendues

#### Tâche 9 : Ajouter rate limiting sur `/api/auth/exchange`
- **Fichiers** : `src/app/api/auth/exchange/route.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Utiliser un middleware de rate limiting (ex: `@upstash/ratelimit`)
  - Limiter à 5 requêtes par minute par IP
- **Impact** : Protection contre le spam

---

### 🟢 PRIORITÉ BONNE PRATIQUE

#### Tâche 10 : Refactoriser `session.ts` pour éviter la duplication
- **Fichiers** : `src/lib/auth/session.ts`
- **Type** : MODIFICATION
- **Actions** :
  - Extraire la logique de validation de session dans une fonction réutilisable
  - Unifier `validateSessionWithClient()` et la logique dans `getSessionFromRequest()`
- **Impact** : Code plus maintenable

#### Tâche 11 : Ajouter protection CSRF explicite
- **Fichiers** : Toutes les API routes POST/PATCH/DELETE
- **Type** : MODIFICATION
- **Actions** :
  - Vérifier les headers CSRF dans les API routes
  - Utiliser les tokens CSRF de Next.js
- **Impact** : Protection renforcée contre CSRF

---

## 🎯 5. ÉTAPE SUIVANTE

### Stratégie recommandée

**Phase 1 - Corrections critiques (à faire immédiatement)** :
1. **Tâche 1** : Corriger `getSession()` pour utiliser `createServerClient` avec cookies
2. **Tâche 2** : Remplacer `getSession()` par `getUser()` pour validation réelle
3. **Tâche 3** : Consolider les routes `/dashboard`

**Phase 2 - Améliorations importantes (à faire après Phase 1)** :
4. **Tâche 4** : Implémenter un vrai logout
5. **Tâche 5** : Retirer les logs de debug en production
6. **Tâche 6** : Utiliser `getUser()` dans le middleware

**Phase 3 - Améliorations (à faire après Phase 2)** :
7. **Tâche 7** : Gérer les utilisateurs sans `org_id`
8. **Tâche 8** : Implémenter le refresh automatique de session
9. **Tâche 9** : Ajouter rate limiting

**Phase 4 - Bonnes pratiques (optionnel)** :
10. **Tâche 10** : Refactoriser `session.ts`
11. **Tâche 11** : Ajouter protection CSRF

### Prochaines actions

Une fois que tu auras validé ce plan d'action, je peux :
1. **Générer le code exact** pour les corrections critiques (Phase 1)
2. **Tester les modifications** pour vérifier qu'elles fonctionnent
3. **Créer des tests** pour valider la sécurité

**Recommandation** : Commencer par la **Phase 1** qui résout les problèmes critiques et permet à l'application de fonctionner correctement.

---

## 📝 NOTES ADDITIONNELLES

### Points positifs identifiés

✅ **RLS activé** : Les tables sont protégées par RLS avec des policies cohérentes  
✅ **Filtrage `org_id`** : Toutes les requêtes DB filtrent par `org_id`  
✅ **Utilisation de `@supabase/ssr`** : Bonne utilisation de `createBrowserClient` et `createServerClient`  
✅ **Protection des API routes** : Toutes les API routes vérifient `getCurrentOrgId()`  
✅ **Middleware actif** : Le middleware protège les routes protégées  

### Architecture recommandée après corrections

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE RECOMMANDÉE                 │
└─────────────────────────────────────────────────────────────┘

1. Client Browser
   └─> createBrowserClient() → Cookies sb-<ref>-auth-token

2. Middleware (Edge)
   └─> createServerClient() + getUser() → Validation JWT

3. Server Components
   └─> createSupabaseServerClient() + getUser() → Session

4. API Routes
   └─> createSupabaseServerClient() + getUser() → orgId

5. Database
   └─> RLS + org_id filtering → Isolation multi-tenant
```

---

**Fin du rapport d'audit**

