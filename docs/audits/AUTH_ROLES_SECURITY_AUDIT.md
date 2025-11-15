# 🔐 Audit Authentification / Rôles / Sécurité

**Date** : 2025-01-27  
**Objectif** : Comprendre pourquoi le clic sur l'onglet "Clients" redirige vers `/authentication/login?error=unauthorized`

---

## 1️⃣ Vue d'ensemble Auth / Rôles

### 1.1. Auth globale

**Système d'authentification utilisé** : **Supabase Auth** (pas NextAuth)

- **Fichiers clés** :
  - `src/lib/auth/session.ts` : Gestion de la session et authentification
  - `src/lib/supabase/server.ts` : Client Supabase côté serveur
  - `src/lib/supabase/client.ts` : Client Supabase côté client

**Gestion de la session** :
- La session est gérée via Supabase Auth avec JWT
- Les tokens sont stockés dans des cookies (gérés par `@supabase/ssr`)
- Le middleware (`middleware.ts`) valide la session via `getSessionFromRequest()`
- Les Server Components utilisent `getSession()` qui appelle `getAuthenticatedUser()`

**Structure d'un "user" ou "session" côté serveur** :

```typescript
// src/types/domain.ts
export type Role = "ADMIN" | "USER";

export type User = {
  id: string;
  email: string;
  org_id?: string;
  role?: Role;
};

export type Session = {
  user: User;
  orgId?: string;
} | null;
```

**Champs importants** :
- `id` : UUID de l'utilisateur (Supabase Auth)
- `email` : Email de l'utilisateur
- `org_id` : ID de l'organisation (optionnel, stocké dans `user_metadata`)
- `role` : Rôle de l'utilisateur (`"ADMIN"` ou `"USER"`, stocké dans `user_metadata`, défaut `"ADMIN"`)

**Source du rôle** :
- Le rôle est lu depuis `user.user_metadata?.role` dans Supabase Auth
- Par défaut, si non défini, le rôle est `"ADMIN"` (ligne 36 de `session.ts`)
- Le rôle est stocké dans les métadonnées utilisateur Supabase, pas dans une table séparée

### 1.2. Multi-tenant & orgId

**Fonction `getCurrentOrgId()`** : Définie dans `src/lib/auth/session.ts` (lignes 211-227)

**Fonctionnement actuel** :
1. Appelle `requireSession()` pour obtenir la session
2. Si `session.orgId` existe, le retourne
3. Sinon, utilise `DEFAULT_ORG_ID` (variable d'environnement) comme fallback
4. Si ni l'un ni l'autre, throw une erreur

**État actuel** : **Mono-tenant avec architecture multi-tenant**
- Le système est architecturé pour le multi-tenant (toutes les queries filtrent sur `org_id`)
- En pratique, une seule organisation existe
- `orgId` peut venir de :
  - `user.user_metadata?.org_id` (session)
  - `DEFAULT_ORG_ID` (fallback si défini dans `.env`)

**Vérification des queries** :
- ✅ **Clients** : Toutes les queries filtrent sur `org_id` (`src/lib/db/queries/clients.ts`)
  - `listClients(orgId, ...)` : ligne 49
  - `getClientById(id, orgId)` : ligne 115
  - `getClientsWithOffersCount(orgId)` : ligne 239
- ✅ **Templates** : Toutes les queries filtrent sur `org_id` (`src/lib/db/queries/templates.ts`)
  - `listTemplates(orgId)` : ligne 25
  - `getTemplateById(id, orgId)` : ligne 45
- ✅ **Offres** : Filtrent également sur `org_id` (confirmé par la structure)

**Source de vérité pour orgId** :
- ✅ `getCurrentOrgId()` est la seule source de vérité (documenté ligne 187-189 de `session.ts`)
- ✅ Pas d'orgId hardcodé dans les queries (sauf tests/seeding)

### 1.3. Rôles & guards

**Type de rôle** : Défini dans `src/types/domain.ts` ligne 66
```typescript
export type Role = "ADMIN" | "USER";
```

**Stockage du rôle** :
- Stocké dans `user_metadata` de Supabase Auth (pas dans une table DB séparée)
- Lu via `user.user_metadata?.role` dans `getAuthenticatedUser()`
- Par défaut `"ADMIN"` si non défini

**Guards disponibles** :

#### `requireSession()` (`src/lib/auth/session.ts`, lignes 165-171)
- **Fonction** : Vérifie qu'une session existe
- **Comportement** : Appelle `getSession()`, si `null` → throw `Error('Unauthorized')`
- **Utilisation** : Utilisé dans les Server Components et API routes pour vérifier l'authentification

#### `requireAdmin()` (`src/lib/auth/permissions.ts`, lignes 20-32)
- **Fonction** : Vérifie que l'utilisateur a le rôle `"ADMIN"`
- **Comportement** :
  1. Appelle `requireSession()` pour obtenir la session
  2. Lit `session.user.role` (défaut `"ADMIN"` si non défini)
  3. Si `role !== "ADMIN"` → throw `Error("Unauthorized")`
- **Utilisation** : Utilisé dans les Server Actions pour les mutations critiques (Templates, Clients)

**Signalement d'erreur** :
- Les guards utilisent `throw new Error("Unauthorized")` ou `throw new Error('Unauthorized')`
- Les pages/API routes catch ces erreurs et redirigent vers `/authentication/login?error=unauthorized`
- Le middleware ne vérifie QUE la présence d'une session valide, pas le rôle

---

## 2️⃣ Focus "Clients" : pourquoi `error=unauthorized` ?

### 2.1. Le lien "Clients"

**Composant qui rend l'onglet "Clients"** : `src/components/sidebar/SidebarNav.tsx`

**Définition du lien** :
```typescript
// Ligne 16 de SidebarNav.tsx
{ name: "Clients", href: "/clients", icon: Users }
```

**URL cible** : `/clients`

**Condition d'affichage** : **Aucune condition** - l'onglet est toujours visible dans la navigation
- Le composant `SidebarNav` ne vérifie pas le rôle de l'utilisateur
- Tous les utilisateurs authentifiés voient l'onglet "Clients"

### 2.2. La route cible

**Page cible** : `src/app/(dashboard)/clients/page.tsx`

**Layout parent** : `src/app/(dashboard)/layout.tsx`

**Analyse de la page Clients** :

```typescript
// clients/page.tsx, lignes 23-30
export default async function ClientsPage() {
  try {
    const orgId = await getCurrentOrgId(); // ← Appel direct
    
    const clients = await getClientsWithOffersCount(orgId);
    // ...
  } catch (error) {
    // Lignes 81-83
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      redirect('/authentication/login?error=unauthorized');
    }
  }
}
```

**Guards utilisés** :
- ❌ **Aucun guard explicite** (`requireAuth`, `requireAdmin`) dans la page
- ⚠️ **Guard implicite** : `getCurrentOrgId()` appelle `requireSession()` en interne
- Si `requireSession()` échoue → throw `Error('Unauthorized')`
- Si `getCurrentOrgId()` échoue (pas d'orgId et pas de DEFAULT_ORG_ID) → throw `Error('Organization ID not found...')`

**Layout parent** (`src/app/(dashboard)/layout.tsx`) :
- Appelle `getSession()` ligne 12
- **Ne throw pas d'erreur** si session est `null` (passe `undefined` à `AppShell`)
- Le layout ne protège pas la route, il affiche juste les infos utilisateur si disponibles

**Protection par middleware** :
- ✅ Oui, la route `/clients` est protégée par le middleware (ligne 47 de `middleware.ts`)

### 2.3. Middleware / redirections

**Fichier** : `middleware.ts` (racine du projet)

**Routes protégées** (ligne 47) :
```typescript
if (pathname.startsWith('/dashboard') || 
    pathname.startsWith('/clients') || 
    pathname.startsWith('/offers') || 
    pathname.startsWith('/templates')) {
  if (!hasValidSession) {
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  }
}
```

**Redirection vers `/authentication/login?error=unauthorized`** :
- ❌ **Le middleware NE redirige PAS vers `?error=unauthorized`**
- Le middleware redirige vers `/authentication/login` (sans paramètre) si pas de session valide
- Le paramètre `?error=unauthorized` vient de la **page elle-même** (catch d'erreur dans `clients/page.tsx`)

**Logique du middleware** :
1. Vérifie la session via `getSessionFromRequest(request)`
2. Si `session === null` → `hasValidSession = false`
3. Si route protégée ET `!hasValidSession` → redirect vers `/authentication/login` (sans paramètre)

### 2.4. Condition concrète

**Flux complet du clic sur "Clients"** :

1. **Clic sur l'onglet "Clients"** (`/clients`)
   - Lien défini dans `SidebarNav.tsx` ligne 16
   - Aucune vérification de rôle côté client

2. **Middleware intercepte la requête** (`middleware.ts` ligne 47)
   - Vérifie si `pathname.startsWith('/clients')` → ✅ Oui
   - Appelle `getSessionFromRequest(request)`
   - Si `session === null` → redirect vers `/authentication/login` (sans paramètre)
   - Si `session !== null` → continue

3. **Si middleware passe, la page se charge** (`clients/page.tsx`)
   - Server Component s'exécute
   - Appelle `getCurrentOrgId()` ligne 25
   - `getCurrentOrgId()` appelle `requireSession()` ligne 212
   - `requireSession()` appelle `getSession()` ligne 166
   - `getSession()` appelle `getAuthenticatedUser()` ligne 114
   - `getAuthenticatedUser()` utilise `createSupabaseServerClient()` ligne 27
   - Si `supabase.auth.getUser()` échoue ou retourne `null` → `getAuthenticatedUser()` retourne `null`
   - Si `getAuthenticatedUser()` retourne `null` → `getSession()` retourne `null`
   - Si `getSession()` retourne `null` → `requireSession()` throw `Error('Unauthorized')`
   - Si `requireSession()` throw → `getCurrentOrgId()` throw
   - Si `getCurrentOrgId()` throw → catch dans `clients/page.tsx` ligne 79
   - Si erreur contient `'Unauthorized'` ou `'Organization ID'` → redirect vers `/authentication/login?error=unauthorized`

**Condition EXACTE qui provoque le redirect** :

Il y a **DEUX scénarios possibles** :

#### Scénario A : Session invalide au niveau middleware
- **Cause** : `getSessionFromRequest()` retourne `null` dans le middleware
- **Raison possible** :
  - Cookies Supabase absents ou invalides
  - JWT expiré ou invalide
  - Problème de synchronisation cookies client/serveur
- **Redirection** : `/authentication/login` (sans paramètre) par le middleware

#### Scénario B : Session valide au middleware mais invalide au niveau page
- **Cause** : `getSession()` dans la page retourne `null` alors que le middleware a passé
- **Raison possible** :
  - **Race condition** : Session expirée entre middleware et page
  - **Différence de contexte** : Le middleware utilise `getSessionFromRequest()` (cookies de la requête), la page utilise `getSession()` (cookies du serveur via `createSupabaseServerClient()`)
  - **Problème de synchronisation** : Les cookies ne sont pas correctement synchronisés entre client et serveur
- **Redirection** : `/authentication/login?error=unauthorized` par la page

**Hypothèse la plus probable** : **Scénario B**
- Le middleware passe (session valide au moment du middleware)
- Mais `getCurrentOrgId()` échoue dans la page (session invalide ou orgId manquant)
- Cela explique pourquoi on voit `?error=unauthorized` (vient de la page, pas du middleware)

**Autre possibilité** : **orgId manquant**
- Si `session.orgId` est `undefined` ET `DEFAULT_ORG_ID` n'est pas défini
- `getCurrentOrgId()` throw `Error('Organization ID not found...')`
- Cette erreur contient `'Organization ID'` → catch dans la page → redirect avec `?error=unauthorized`

---

## 3️⃣ Check "OK / À revoir"

### 3.1. Multi-tenant

- ✅ **Toutes les queries Clients et Templates filtrent bien sur org_id**
  - Fichiers : `src/lib/db/queries/clients.ts`, `src/lib/db/queries/templates.ts`
  - Toutes les fonctions prennent `orgId` en paramètre et filtrent avec `eq(table.org_id, orgId)`

- ✅ **orgId vient toujours du serveur (getCurrentOrgId), jamais du client**
  - `getCurrentOrgId()` est appelée uniquement dans les Server Components et API routes
  - Aucun appel côté client trouvé

- ✅ **Pas de orgId hardcodé un peu partout**
  - Seulement dans `src/lib/config/org.ts` (DEFAULT_ORG_ID pour fallback)
  - Pas de valeurs hardcodées dans les queries

### 3.2. Rôles

- ✅ **Le modèle de rôle (ADMIN / USER) est clair et centralisé**
  - Défini dans `src/types/domain.ts` ligne 66
  - Type `Role = "ADMIN" | "USER"`

- ⚠️ **Les droits sur Clients sont cohérents avec ce modèle**
  - **Problème identifié** : La page `/clients` n'utilise **PAS** `requireAdmin()`
  - Elle utilise seulement `getCurrentOrgId()` qui appelle `requireSession()`
  - Donc **Clients est accessible à tous les utilisateurs authentifiés** (ADMIN et USER)
  - Mais les **mutations** (create, update, delete) sont protégées par `requireAdmin()` dans les API routes
  - **Incohérence** : Lecture accessible à tous, écriture réservée aux ADMIN

- ⚠️ **La session contient bien le bon rôle pour l'utilisateur courant**
  - Le rôle est lu depuis `user_metadata?.role`
  - Par défaut `"ADMIN"` si non défini (ligne 36 de `session.ts`)
  - **Risque** : Si un utilisateur n'a pas de rôle défini dans `user_metadata`, il sera considéré comme ADMIN par défaut

### 3.3. Guards & UX

- ⚠️ **requireAdmin / requireAuth sont utilisés au bon endroit**
  - **Problème** : La page `/clients` n'utilise **PAS** de guard explicite
  - Elle compte sur `getCurrentOrgId()` qui appelle `requireSession()` en interne
  - Les API routes utilisent `requireAdmin()` pour les mutations (lignes 86, 76, 163 de `src/app/api/clients/**`)
  - **Incohérence** : La page devrait utiliser `requireAuth()` ou `requireAdmin()` explicitement

- ⚠️ **Le redirect vers login?error=unauthorized est cohérent avec la policy**
  - **Problème** : Le middleware redirige vers `/authentication/login` (sans paramètre)
  - La page redirige vers `/authentication/login?error=unauthorized` (avec paramètre)
  - **Incohérence** : Deux comportements différents selon où l'erreur est détectée
  - Si Clients doit être accessible à tous les utilisateurs authentifiés → Le redirect `unauthorized` ne devrait pas se produire (sauf si session invalide)
  - Si Clients doit être ADMIN-only → Il faut ajouter `requireAdmin()` dans la page ET cacher l'onglet pour les non-admins

- ❌ **L'UI affiche/lit un message compréhensible quand error=unauthorized est présent**
  - **Problème** : `AuthLogin.tsx` ne lit **PAS** le paramètre `error` de l'URL
  - Le composant affiche seulement les erreurs de soumission du formulaire
  - Aucun message n'est affiché pour `?error=unauthorized`
  - **Fichier** : `src/app/authentication/auth/AuthLogin.tsx` (ne vérifie pas `useSearchParams()`)

---

## 4️⃣ Problèmes identifiés

### ID : AUTH-001
- **Gravité** : **high**
- **Fichiers** : 
  - `src/app/(dashboard)/clients/page.tsx` (ligne 25)
  - `src/lib/auth/session.ts` (lignes 211-227)
- **Description factuelle** : 
  - La page `/clients` appelle `getCurrentOrgId()` qui peut throw si :
    1. Pas de session → `requireSession()` throw `Error('Unauthorized')`
    2. Pas d'orgId dans la session ET pas de `DEFAULT_ORG_ID` → throw `Error('Organization ID not found...')`
  - Ces erreurs sont catchées et redirigent vers `/authentication/login?error=unauthorized`
- **Cause probable** : 
  - Session invalide ou expirée au moment où la page s'exécute (alors que le middleware a passé)
  - Ou `orgId` manquant dans la session ET `DEFAULT_ORG_ID` non défini dans les variables d'environnement
- **Intention probable** : 
  - Vérifier l'authentification et obtenir l'orgId avant de charger les clients
  - Mais la gestion d'erreur est trop générique (redirige même si c'est juste un problème d'orgId)

### ID : AUTH-002
- **Gravité** : **medium**
- **Fichiers** : 
  - `src/app/(dashboard)/clients/page.tsx`
  - `src/components/sidebar/SidebarNav.tsx`
- **Description factuelle** : 
  - La page `/clients` n'utilise **PAS** `requireAdmin()` ou `requireAuth()` explicitement
  - Elle compte sur `getCurrentOrgId()` qui appelle `requireSession()` en interne
  - L'onglet "Clients" est visible pour tous les utilisateurs (pas de condition de rôle)
  - Mais les mutations (create, update, delete) sont protégées par `requireAdmin()` dans les API routes
- **Cause probable** : 
  - Incohérence dans la politique d'accès : lecture accessible à tous, écriture réservée aux ADMIN
  - Ou oubli d'ajouter `requireAdmin()` dans la page si Clients doit être ADMIN-only
- **Intention probable** : 
  - Si Clients doit être accessible à tous les utilisateurs authentifiés → OK, mais il faut documenter
  - Si Clients doit être ADMIN-only → Il faut ajouter `requireAdmin()` dans la page ET cacher l'onglet pour les non-admins

### ID : AUTH-003
- **Gravité** : **medium**
- **Fichiers** : 
  - `src/app/authentication/auth/AuthLogin.tsx`
  - `src/app/authentication/login/page.tsx`
- **Description factuelle** : 
  - Le composant `AuthLogin` ne lit **PAS** le paramètre `error` de l'URL
  - Quand on redirige vers `/authentication/login?error=unauthorized`, aucun message n'est affiché
  - L'utilisateur ne comprend pas pourquoi il a été redirigé
- **Cause probable** : 
  - Oubli d'implémenter la lecture de `useSearchParams()` pour afficher le message d'erreur
- **Intention probable** : 
  - Afficher un message clair quand l'utilisateur est redirigé pour cause d'autorisation insuffisante

### ID : AUTH-004
- **Gravité** : **low**
- **Fichiers** : 
  - `middleware.ts` (ligne 50)
  - `src/app/(dashboard)/clients/page.tsx` (ligne 83)
- **Description factuelle** : 
  - Le middleware redirige vers `/authentication/login` (sans paramètre) si pas de session
  - La page redirige vers `/authentication/login?error=unauthorized` (avec paramètre) si erreur
  - Deux comportements différents selon où l'erreur est détectée
- **Cause probable** : 
  - Manque de cohérence dans la gestion des redirections
- **Intention probable** : 
  - Uniformiser les redirections pour toujours inclure le paramètre `error` quand approprié

### ID : AUTH-005
- **Gravité** : **low**
- **Fichiers** : 
  - `src/lib/auth/session.ts` (ligne 36)
- **Description factuelle** : 
  - Si `user.user_metadata?.role` est `undefined`, le rôle par défaut est `"ADMIN"`
  - Cela signifie qu'un utilisateur sans rôle défini sera considéré comme ADMIN
- **Cause probable** : 
  - Compatibilité avec le comportement actuel (tous les utilisateurs sont ADMIN en production mono-tenant)
- **Intention probable** : 
  - Éviter les erreurs si le rôle n'est pas encore défini dans `user_metadata`
  - Mais cela peut masquer des problèmes de configuration

---

## 5️⃣ Conclusion

### Cause précise du redirect unauthorized sur l'onglet Clients

Le redirect vers `/authentication/login?error=unauthorized` se produit parce que :

1. **Le middleware passe** (session valide au moment de l'interception)
2. **Mais `getCurrentOrgId()` échoue dans la page** pour l'une de ces raisons :
   - La session est invalide ou expirée au moment où la page s'exécute (race condition ou problème de synchronisation cookies)
   - **OU** `orgId` est manquant dans la session ET `DEFAULT_ORG_ID` n'est pas défini dans les variables d'environnement
3. **L'erreur est catchée** dans le `try/catch` de `clients/page.tsx` (ligne 79)
4. **La redirection** se fait vers `/authentication/login?error=unauthorized` (ligne 83)

**Le problème le plus probable** : **orgId manquant** dans la session ET `DEFAULT_ORG_ID` non configuré, ce qui fait que `getCurrentOrgId()` throw une erreur contenant `'Organization ID'`, déclenchant le redirect.

### Pistes de correction possibles

#### Piste 1 : Configurer DEFAULT_ORG_ID
- **Si** Clients doit être accessible à tous les utilisateurs authentifiés (même sans orgId défini)
- **Alors** : Définir `DEFAULT_ORG_ID` dans les variables d'environnement (`.env.local` ou `.env.production`)
- **Effet** : `getCurrentOrgId()` utilisera le fallback au lieu de throw une erreur
- **Fichiers à modifier** : Aucun (juste config)

#### Piste 2 : Ajouter requireAuth() explicite dans la page
- **Si** on veut être explicite sur les guards
- **Alors** : Ajouter `await requireAuth()` ou `await requireSession()` au début de `ClientsPage()` avant `getCurrentOrgId()`
- **Effet** : Séparation claire entre vérification d'authentification et récupération d'orgId
- **Fichiers à modifier** : `src/app/(dashboard)/clients/page.tsx`

#### Piste 3 : Rendre Clients ADMIN-only
- **Si** Clients doit être réservé aux administrateurs
- **Alors** :
  1. Ajouter `await requireAdmin()` dans `clients/page.tsx` (ligne 24, avant `getCurrentOrgId()`)
  2. Cacher l'onglet "Clients" dans `SidebarNav.tsx` pour les non-admins (nécessite de passer le rôle en prop)
- **Effet** : Seuls les ADMIN verront l'onglet et pourront accéder à la page
- **Fichiers à modifier** : 
  - `src/app/(dashboard)/clients/page.tsx`
  - `src/components/sidebar/SidebarNav.tsx` (pour cacher l'onglet)

#### Piste 4 : Améliorer l'UX du message d'erreur
- **Si** on veut informer l'utilisateur pourquoi il a été redirigé
- **Alors** : Modifier `AuthLogin.tsx` pour lire `useSearchParams()` et afficher un message si `error=unauthorized`
- **Effet** : L'utilisateur comprendra pourquoi il a été redirigé
- **Fichiers à modifier** : `src/app/authentication/auth/AuthLogin.tsx`

#### Piste 5 : Uniformiser les redirections
- **Si** on veut une gestion cohérente des erreurs
- **Alors** : Modifier le middleware pour aussi rediriger vers `/authentication/login?error=unauthorized` (ou créer une constante pour l'URL de redirection)
- **Effet** : Comportement uniforme entre middleware et pages
- **Fichiers à modifier** : `middleware.ts`

---

**Recommandation principale** : Commencer par **Piste 1** (configurer `DEFAULT_ORG_ID`) car c'est la cause la plus probable du problème, puis **Piste 4** (améliorer l'UX) pour informer l'utilisateur.

