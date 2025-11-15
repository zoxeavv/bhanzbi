# 🔍 Analyse : Redirection vers `/authentication/login?error=unauthorized`

**Date** : 2025-01-27  
**Type** : Audit / Documentation (lecture seule)

---

## 📋 Table des matières

1. [Patterns de routes protégées dans middleware.ts](#1-patterns-de-routes-protégées-dans-middlewarets)
2. [Condition exacte de redirection](#2-condition-exacte-de-redirection)
3. [Analyse de la route Clients](#3-analyse-de-la-route-clients)
4. [Condition exacte qui cause la redirection](#4-condition-exacte-qui-cause-la-redirection)

---

## 1. Patterns de routes protégées dans middleware.ts

### 📍 Fichier

**Chemin** : `middleware.ts` (racine du projet)

### 🛡️ Routes protégées

**Ligne 47** :
```typescript
if (pathname.startsWith('/dashboard') || 
    pathname.startsWith('/clients') || 
    pathname.startsWith('/offers') || 
    pathname.startsWith('/templates')) {
  // Protection ici
}
```

**Patterns protégés** :
- `/dashboard*` (toutes les routes commençant par `/dashboard`)
- `/clients*` (toutes les routes commençant par `/clients`)
- `/offers*` (toutes les routes commençant par `/offers`)
- `/templates*` (toutes les routes commençant par `/templates`)

### 🔄 Condition de redirection dans le middleware

**Lignes 48-50** :
```typescript
if (!hasValidSession) {
  console.log('[Middleware] Redirecting to login - no valid session');
  return NextResponse.redirect(new URL('/authentication/login', request.url));
}
```

**Condition exacte** :
- **Si** : `!hasValidSession` (c'est-à-dire `session === null`)
- **Alors** : Redirect vers `/authentication/login` (sans paramètre `?error=unauthorized`)

**Comment `hasValidSession` est déterminé** :
```typescript
// Ligne 23-24
const session = await getSessionFromRequest(request);
const hasValidSession = session !== null;
```

**Important** : Le middleware redirige vers `/authentication/login` (sans paramètre), **PAS** vers `/authentication/login?error=unauthorized`.

---

## 2. Condition exacte de redirection

### ⚠️ Le middleware NE redirige PAS avec `?error=unauthorized`

**Preuve** (ligne 50 de `middleware.ts`) :
```typescript
return NextResponse.redirect(new URL('/authentication/login', request.url));
//                                                          ↑
//                                    Pas de paramètre ?error=unauthorized
```

**Conclusion** : Le paramètre `?error=unauthorized` ne vient **PAS** du middleware.

### 🔍 D'où vient `?error=unauthorized` ?

Le paramètre `?error=unauthorized` vient de la **page elle-même** (`clients/page.tsx`).

**Preuve** (lignes 81-83 de `clients/page.tsx`) :
```typescript
if (error instanceof Error && 
    (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
  console.error('[ClientsPage] Unauthorized:', error);
  redirect('/authentication/login?error=unauthorized');  // ← Ici
}
```

---

## 3. Analyse de la route Clients

### ✅ La route `/clients` matche le pattern protégé

**Preuve** :
- Le middleware protège `pathname.startsWith('/clients')` (ligne 47)
- L'URL `/clients` matche ce pattern
- Donc `/clients` est protégée par le middleware

### ❌ La route Clients n'est PAS traitée comme admin-only

**Preuve** :
- Le middleware vérifie **uniquement** `hasValidSession` (ligne 48)
- Il n'y a **aucune vérification de rôle** dans le middleware
- Le middleware ne vérifie pas `session.user.role === "ADMIN"`

**Conclusion** : La route `/clients` est protégée par authentification uniquement, pas par rôle ADMIN.

---

## 4. Condition exacte qui cause la redirection

### 🔄 Flux complet

```
1. [CLIENT] Clic sur l'onglet "Clients"
   └── Navigation vers /clients

2. [MIDDLEWARE] Interception
   └── Vérifie : pathname.startsWith('/clients') → ✅ Oui
   └── Vérifie : hasValidSession
       ├── Si session === null → Redirect /authentication/login (sans paramètre)
       └── Si session !== null → Continue vers la page

3. [PAGE] clients/page.tsx s'exécute
   └── Ligne 25 : const orgId = await getCurrentOrgId();
   └── getCurrentOrgId() appelle requireSession() (ligne 212 de session.ts)
   └── requireSession() appelle getSession() (ligne 166)
   └── getSession() appelle getAuthenticatedUser() (ligne 114)
   └── getAuthenticatedUser() utilise supabase.auth.getUser() (ligne 28)
   
   ┌─────────────────────────────────────────────────────────┐
   │ SCÉNARIO A : Session invalide au moment de la page      │
   ├─────────────────────────────────────────────────────────┤
   │ - supabase.auth.getUser() retourne null ou error        │
   │ - getAuthenticatedUser() retourne null                   │
   │ - getSession() retourne null                            │
   │ - requireSession() throw Error('Unauthorized')           │
   │ - getCurrentOrgId() throw (propagation)                  │
   │ - Page catch l'erreur (ligne 79)                        │
   │ - Condition ligne 81 : error.message === 'Unauthorized' │
   │ - Redirect /authentication/login?error=unauthorized      │
   └─────────────────────────────────────────────────────────┘
   
   ┌─────────────────────────────────────────────────────────┐
   │ SCÉNARIO B : orgId manquant                             │
   ├─────────────────────────────────────────────────────────┤
   │ - requireSession() réussit (session valide)              │
   │ - getCurrentOrgId() vérifie session.orgId               │
   │ - session.orgId est undefined                           │
   │ - getCurrentOrgId() vérifie DEFAULT_ORG_ID              │
   │ - DEFAULT_ORG_ID n'est pas défini                       │
   │ - getCurrentOrgId() throw Error('Organization ID...')   │
   │ - Page catch l'erreur (ligne 79)                        │
   │ - Condition ligne 81 : error.message.includes('Org...') │
   │ - Redirect /authentication/login?error=unauthorized      │
   └─────────────────────────────────────────────────────────┘
```

### 📝 Condition exacte

**La redirection vers `/authentication/login?error=unauthorized` se produit si** :

```
(middleware passe ET page s'exécute) ET
(
  (getSession() retourne null) 
  OU 
  (session.orgId === undefined ET DEFAULT_ORG_ID === undefined)
)
```

**Décomposé** :

1. **Le middleware passe** :
   - `getSessionFromRequest(request)` retourne une session valide (`session !== null`)
   - La requête continue vers la page

2. **La page s'exécute** :
   - `clients/page.tsx` appelle `getCurrentOrgId()` (ligne 25)

3. **Une des deux erreurs se produit** :

   **Erreur A** : Session invalide au moment de la page
   - `getSession()` retourne `null` (différent de la session du middleware)
   - `requireSession()` throw `Error('Unauthorized')`
   - Message d'erreur : `'Unauthorized'`

   **Erreur B** : orgId manquant
   - `requireSession()` réussit (session valide)
   - `session.orgId` est `undefined`
   - `DEFAULT_ORG_ID` n'est pas défini dans les variables d'environnement
   - `getCurrentOrgId()` throw `Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured')`
   - Message d'erreur : contient `'Organization ID'`

4. **La page catch l'erreur** :
   - Ligne 79 : `catch (error)`
   - Ligne 81 : Vérifie `error.message === 'Unauthorized'` OU `error.message.includes('Organization ID')`
   - Ligne 83 : `redirect('/authentication/login?error=unauthorized')`

### 🎯 Formulation finale

**Condition exacte** :

```
Clic "Clients" → 
  [Middleware passe (session valide)] → 
  [Page s'exécute] → 
  [getCurrentOrgId() échoue] → 
  (
    si (getSession() retourne null) 
    OU 
    si (session.orgId === undefined ET DEFAULT_ORG_ID === undefined)
  ) → 
  redirect('/authentication/login?error=unauthorized')
```

**En langage naturel** :

> La redirection vers `/authentication/login?error=unauthorized` se produit quand :
> 1. Le middleware valide la session (utilisateur authentifié au moment du middleware)
> 2. Mais la page échoue à récupérer l'orgId pour l'une de ces raisons :
>    - La session est devenue invalide entre le middleware et la page (race condition ou problème de synchronisation cookies)
>    - OU l'utilisateur n'a pas d'orgId dans sa session ET la variable d'environnement `DEFAULT_ORG_ID` n'est pas définie

### 🔍 Scénario le plus probable

**Scénario B** : **orgId manquant**

**Raison** :
- Le middleware passe (session valide)
- Mais `session.orgId` est `undefined` dans Supabase Auth (`user.user_metadata.org_id` non défini)
- ET `DEFAULT_ORG_ID` n'est pas configuré dans les variables d'environnement
- `getCurrentOrgId()` throw une erreur contenant `'Organization ID'`
- La page catch et redirige avec `?error=unauthorized`

**Solution** : Configurer `DEFAULT_ORG_ID` dans les variables d'environnement pour activer le fallback mono-tenant.

---

## 📊 Résumé

### Patterns protégés dans middleware.ts

| Pattern | Routes protégées |
|---------|------------------|
| `/dashboard*` | Toutes les routes dashboard |
| `/clients*` | Toutes les routes clients (inclut `/clients`) |
| `/offers*` | Toutes les routes offres |
| `/templates*` | Toutes les routes templates |

### Condition de redirection dans middleware

**Condition** : `!hasValidSession` (c'est-à-dire `session === null`)

**Redirection** : `/authentication/login` (sans paramètre `?error=unauthorized`)

### Route Clients

- ✅ Matche le pattern protégé (`/clients*`)
- ❌ N'est **PAS** traitée comme admin-only (pas de vérification de rôle dans le middleware)

### Condition exacte de redirection avec `?error=unauthorized`

**La redirection vers `/authentication/login?error=unauthorized` se produit si** :

```
(middleware passe) ET 
(page s'exécute) ET 
(
  (getSession() retourne null) 
  OU 
  (session.orgId === undefined ET DEFAULT_ORG_ID === undefined)
)
```

**Cause la plus probable** : `orgId` manquant dans la session ET `DEFAULT_ORG_ID` non configuré.

---

**Fin du document**

