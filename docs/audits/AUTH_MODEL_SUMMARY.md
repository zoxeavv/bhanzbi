# 🔐 Résumé : Modèle d'Authentification et Rôles

**Date** : 2025-01-27  
**Type** : Audit / Documentation (lecture seule)

---

## 📋 Table des matières

1. [Système d'authentification](#1-système-dauthentification)
2. [Modèle User](#2-modèle-user)
3. [Modèle Session / JWT](#3-modèle-session--jwt)
4. [Gestion globale de l'auth](#4-gestion-globale-de-lauth)

---

## 1. Système d'authentification

### Technologie utilisée

**Supabase Auth** (pas NextAuth, pas d'auth maison)

- **Bibliothèque** : `@supabase/ssr` pour la gestion SSR/SSG
- **Client serveur** : `@supabase/supabase-js` via `createServerClient`
- **Stockage session** : Cookies HTTP (gérés automatiquement par Supabase)

### Configuration

**Variables d'environnement requises** :
```env
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DEFAULT_ORG_ID=...  # Optionnel, pour fallback mono-tenant
```

**Fichiers de configuration** :
- `src/lib/supabase/server.ts` : Client Supabase pour Server Components et API routes
- `src/lib/supabase/client.ts` : Client Supabase pour Client Components (non analysé ici)

---

## 2. Modèle User

### Type TypeScript

**Fichier** : `src/types/domain.ts` (lignes 68-73)

```typescript
export type User = {
  id: string;           // UUID Supabase Auth
  email: string;        // Email de l'utilisateur
  org_id?: string;      // ID de l'organisation (optionnel)
  role?: Role;          // Rôle utilisateur (optionnel)
};
```

### Champs clés

| Champ | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | `string` | Supabase Auth (`user.id`) | UUID unique de l'utilisateur |
| `email` | `string` | Supabase Auth (`user.email`) | Email de connexion |
| `org_id` | `string?` | `user.user_metadata.org_id` | ID de l'organisation (multi-tenant) |
| `role` | `Role?` | `user.user_metadata.role` | Rôle utilisateur (`"ADMIN"` ou `"USER"`) |

### Rôle utilisateur

**Type** : `src/types/domain.ts` (ligne 66)

```typescript
export type Role = "ADMIN" | "USER";
```

**Sémantique** :
- **ADMIN** : Accès complet, peut modifier les templates
- **USER** : Accès en lecture seule, ne peut pas modifier les templates

**Stockage du rôle** :
- ✅ Stocké dans `user.user_metadata.role` (Supabase Auth)
- ❌ **PAS** stocké dans une table DB séparée
- ⚠️ **Valeur par défaut** : `"ADMIN"` si non défini (ligne 36 de `session.ts`)

**Stockage de l'orgId** :
- ✅ Stocké dans `user.user_metadata.org_id` (Supabase Auth)
- ✅ Utilisé pour l'isolation multi-tenant (toutes les queries filtrent sur `org_id`)

---

## 3. Modèle Session / JWT

### Type TypeScript

**Fichier** : `src/types/domain.ts` (lignes 75-78)

```typescript
export type Session = {
  user: User;
  orgId?: string;  // Dupliqué depuis user.org_id pour facilité d'accès
} | null;
```

### Structure de la Session

```typescript
{
  user: {
    id: string;
    email: string;
    org_id?: string;
    role?: Role;
  },
  orgId?: string;  // Alias de user.org_id
}
```

**Valeur** : `null` si utilisateur non authentifié

### JWT / Token Supabase

**Validation** :
- Utilise `supabase.auth.getUser()` (pas `getSession()`) pour valider le JWT
- `getUser()` vérifie que le JWT est valide et non expiré
- Le JWT est stocké dans les cookies HTTP (gérés par `@supabase/ssr`)

**Cookies** :
- Format : `sb-{projectRef}-auth-token` (géré automatiquement)
- Le middleware filtre les cookies pour ne garder que ceux du projet actuel
- Les cookies sont synchronisés entre client et serveur via l'API `/api/auth/exchange`

**Contenu du JWT** :
- `user.id` : UUID de l'utilisateur
- `user.email` : Email
- `user.user_metadata.role` : Rôle (optionnel)
- `user.user_metadata.org_id` : ID de l'organisation (optionnel)

---

## 4. Gestion globale de l'auth

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Supabase Client (createBrowserClient)           │   │
│  │  - signInWithPassword()                          │   │
│  │  - signOut()                                      │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Token Exchange
                     ▼
┌─────────────────────────────────────────────────────────┐
│              /api/auth/exchange (API Route)             │
│  - Reçoit access_token + refresh_token                  │
│  - Définit les cookies serveur                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Cookies HTTP
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Middleware                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  getSessionFromRequest(request)                   │   │
│  │  - Lit les cookies de la requête                  │   │
│  │  - Valide le JWT via getUser()                     │   │
│  │  - Redirige si session invalide                    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Session validée
                     ▼
┌─────────────────────────────────────────────────────────┐
│          Server Components / API Routes                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  getSession()                                    │   │
│  │  - Utilise createSupabaseServerClient()          │   │
│  │  - Lit les cookies via cookies()                │   │
│  │  - Retourne Session | null                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  requireSession()                                │   │
│  │  - Appelle getSession()                          │   │
│  │  - Throw Error('Unauthorized') si null           │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  requireAdmin()                                  │   │
│  │  - Appelle requireSession()                      │   │
│  │  - Vérifie role === "ADMIN"                      │   │
│  │  - Throw Error("Unauthorized") si non ADMIN       │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Fichiers clés

#### `src/lib/auth/session.ts`

**Fonctions principales** :

| Fonction | Usage | Retourne |
|----------|-------|----------|
| `getSession()` | Server Components / API routes | `Session \| null` |
| `getSessionFromRequest(request)` | Middleware | `Session \| null` |
| `requireSession()` | Guards (throw si null) | `{ user: User; orgId?: string }` |
| `getCurrentOrgId()` | Récupération orgId | `string` (throw si manquant) |

**Fonctions internes** :
- `getAuthenticatedUser()` : Récupère l'utilisateur depuis Supabase (Server Components)
- `getAuthenticatedUserFromRequest()` : Récupère l'utilisateur depuis la requête (Middleware)

#### `src/lib/auth/permissions.ts`

**Fonctions principales** :

| Fonction | Usage | Comportement |
|----------|-------|--------------|
| `requireAdmin()` | Server Actions (mutations) | Vérifie `role === "ADMIN"`, throw si non ADMIN |

#### `src/lib/supabase/server.ts`

**Fonction principale** :
- `createSupabaseServerClient()` : Crée un client Supabase pour Server Components et API routes
- Gère les cookies via `cookies()` de Next.js

#### `middleware.ts` (racine)

**Fonction principale** :
- `middleware(request)` : Intercepte toutes les requêtes
- Protège les routes `/dashboard`, `/clients`, `/offers`, `/templates`
- Redirige vers `/authentication/login` si session invalide

### Flux d'authentification

#### 1. Connexion (Login)

```
Client → signInWithPassword() 
  → Supabase Auth valide credentials
  → Retourne access_token + refresh_token
  → Client appelle /api/auth/exchange
  → API définit les cookies serveur
  → Redirection vers /dashboard
```

#### 2. Validation de session (Middleware)

```
Requête → Middleware intercepte
  → getSessionFromRequest(request)
  → Lit cookies de la requête
  → Crée client Supabase avec cookies
  → Appelle getUser() pour valider JWT
  → Si valide → continue
  → Si invalide → redirect /authentication/login
```

#### 3. Validation de session (Server Component)

```
Page Server Component s'exécute
  → getSession() ou requireSession()
  → createSupabaseServerClient()
  → Lit cookies via cookies()
  → Appelle getUser() pour valider JWT
  → Retourne Session | null
```

#### 4. Vérification de rôle (Server Action)

```
Server Action s'exécute
  → requireAdmin()
  → Appelle requireSession()
  → Vérifie session.user.role === "ADMIN"
  → Si non ADMIN → throw Error("Unauthorized")
```

### Guards disponibles

#### `requireSession()`

**Fichier** : `src/lib/auth/session.ts` (lignes 165-171)

```typescript
export async function requireSession(): Promise<{ user: User; orgId?: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

**Usage** : Vérifie qu'une session existe (utilisateur authentifié)

#### `requireAdmin()`

**Fichier** : `src/lib/auth/permissions.ts` (lignes 20-32)

```typescript
export async function requireAdmin(): Promise<void> {
  const session = await requireSession();
  const userRole = session.user.role || "ADMIN";
  
  if (userRole !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}
```

**Usage** : Vérifie que l'utilisateur a le rôle `"ADMIN"`

**Note** : Par défaut, si le rôle n'est pas défini, il est considéré comme `"ADMIN"` (compatibilité)

### Récupération de l'orgId

#### `getCurrentOrgId()`

**Fichier** : `src/lib/auth/session.ts` (lignes 211-227)

```typescript
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession();
  
  if (session.orgId) {
    return session.orgId;
  }
  
  if (DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;  // Fallback mono-tenant
  }
  
  throw new Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured');
}
```

**Usage** : Récupère l'orgId de la session, avec fallback sur `DEFAULT_ORG_ID` si défini

**Comportement** :
1. Utilise `session.orgId` si présent
2. Sinon, utilise `DEFAULT_ORG_ID` (variable d'environnement) si défini
3. Sinon, throw une erreur

---

## 📊 Résumé des points clés

### ✅ Points forts

1. **Architecture multi-tenant** : Toutes les queries filtrent sur `org_id`
2. **Validation JWT stricte** : Utilise `getUser()` au lieu de `getSession()` pour valider le token
3. **Source de vérité unique** : `getCurrentOrgId()` est la seule fonction pour récupérer l'orgId
4. **Guards explicites** : `requireSession()` et `requireAdmin()` pour la sécurité

### ⚠️ Points d'attention

1. **Rôle par défaut** : Si `user_metadata.role` n'est pas défini, le rôle est `"ADMIN"` par défaut
2. **orgId optionnel** : Si `orgId` manque dans la session ET `DEFAULT_ORG_ID` n'est pas défini, `getCurrentOrgId()` throw une erreur
3. **Pas de table DB pour les rôles** : Les rôles sont stockés dans `user_metadata`, pas dans une table séparée

### 📁 Fichiers de référence

- **Types** : `src/types/domain.ts` (User, Session, Role)
- **Session** : `src/lib/auth/session.ts` (getSession, requireSession, getCurrentOrgId)
- **Permissions** : `src/lib/auth/permissions.ts` (requireAdmin)
- **Supabase serveur** : `src/lib/supabase/server.ts` (createSupabaseServerClient)
- **Middleware** : `middleware.ts` (protection des routes)

---

**Fin du document**

