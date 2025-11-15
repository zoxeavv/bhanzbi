# 🔒 AUDIT COMPLET : Authentification / Rôles / Sécurité

**Date** : 2024  
**Type** : Audit en lecture seule  
**Scope** : Système d'authentification Supabase, rôles (ADMIN/USER), allowlist, guards, middleware, navigation

---

## 📋 Table des matières

1. [Vue d'ensemble AUTH / RÔLES](#1-vue-densemble-auth--rôles)
2. [Matrice des permissions](#2-matrice-des-permissions-admin-vs-user)
3. [Contrôles de sécurité techniques](#3-contrôles-de-sécurité-techniques)
4. [UX & messages d'erreur](#4-ux--messages-derreur)
5. [Problèmes identifiés](#5-problèmes-identifiés)
6. [Conclusion & Checklist](#6-conclusion--checklist)

---

## 1) Vue d'ensemble AUTH / RÔLES

### 1.1. Auth globale

#### Supabase Auth : récupération de session côté serveur

**Fichiers analysés** :
- `src/lib/auth/session.ts`
- `src/lib/supabase/server.ts`
- `src/types/domain.ts`

**Mécanisme de récupération de session** :

1. **`getSession()`** (Server Components / API routes) :
   - Utilise `createSupabaseServerClient()` qui lit les cookies via `cookies()` de Next.js
   - Appelle `supabase.auth.getUser()` (validation JWT complète, pas `getSession()`)
   - Retourne `Session | null` où `Session = { user: User; orgId?: string } | null`

2. **`getSessionFromRequest()`** (Middleware) :
   - Crée un client Supabase depuis les cookies de la `NextRequest`
   - Filtre les cookies pour ne garder que ceux du projet Supabase (`sb-${projectRef}-*`)
   - Appelle `supabase.auth.getUser()` pour valider le JWT
   - Retourne `Session | null`

**Gestion des cookies** :
- Les cookies sont gérés automatiquement par `@supabase/ssr` via `createServerClient`
- Format des cookies : `sb-${projectRef}-auth-token` (où `projectRef` est extrait de l'URL Supabase)
- Le middleware filtre les cookies pour éviter les conflits entre projets Supabase multiples

**Typage User et Session** (`src/types/domain.ts`) :

```typescript
export type Role = "ADMIN" | "USER";

export type User = {
  id: string;
  email: string;
  org_id?: string;
  role?: Role;  // ⚠️ Peut être undefined
};

export type Session = {
  user: User;
  orgId?: string;
} | null;
```

#### Détermination du rôle

**Source du rôle** :
- Le rôle vient de `user.user_metadata?.role` dans Supabase Auth
- Stocké dans `user_metadata` lors de la création du compte (via `/api/auth/register` ou webhook)

**Validation du rôle** (`src/lib/auth/session.ts`, lignes 36-38) :
```typescript
const role = user.user_metadata?.role as Role | undefined;
const validRole: Role | undefined = (role === "ADMIN" || role === "USER") ? role : undefined;
```

**⚠️ Cas où le rôle peut être `undefined`** :
- Si `user_metadata.role` n'est pas défini dans Supabase Auth
- Si `user_metadata.role` n'est ni "ADMIN" ni "USER"
- **Aucun fallback automatique vers "ADMIN"** dans le code actuel (bon point de sécurité)

**Commentaires dans le code** :
- Lignes 34-35, 95-96 : Commentaires explicites "IMPORTANT : ne jamais fallback automatiquement à ADMIN"
- Le code respecte cette règle : si le rôle n'est pas défini, il reste `undefined`

### 1.2. Allowlist admin & attribution du rôle

#### Structure de la table `admin_allowed_emails`

**Schéma** (`src/lib/db/schema.ts`, lignes 68-78) :
```typescript
export const admin_allowed_emails = pgTable('admin_allowed_emails', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  org_id: text('org_id').notNull(),
  email: text('email').notNull(),
  created_by: text('created_by').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  used_at: timestamp('used_at', { withTimezone: true }),
}, (table) => ({
  adminAllowedEmailsOrgIdEmailUnique: uniqueIndex('admin_allowed_emails_org_id_email_unique')
    .on(table.org_id, table.email),
}));
```

**Caractéristiques** :
- Contrainte unique composite sur `(org_id, email)` pour éviter les doublons par organisation
- Champ `used_at` pour tracker si l'email a été utilisé lors d'une inscription
- Filtrage multi-tenant strict par `org_id`

#### Queries associées (`src/lib/db/queries/adminAllowedEmails.ts`) :

- `listAdminAllowedEmails(orgId)` : Liste les emails autorisés pour une org
- `addAdminAllowedEmail(orgId, email, createdBy)` : Ajoute un email (normalisé : trim + toLowerCase)
- `deleteAdminAllowedEmail(orgId, id)` : Supprime un email
- `markAdminEmailAsUsed(orgId, email)` : Marque un email comme utilisé

**Toutes les queries filtrent par `org_id`** ✅

#### Helpers dans `adminAllowlist.ts` :

- `isEmailAllowedForAdmin(email, orgId?)` : Vérifie si un email est dans l'allowlist
- `assignInitialRoleForNewUser(email, orgId?)` : Retourne "ADMIN" si email autorisé, "USER" sinon
- `markEmailAsUsedIfAdmin(email, orgId?)` : Marque l'email comme utilisé si c'est un admin

**Normalisation** : Tous les emails sont normalisés (`trim().toLowerCase()`) avant comparaison/insertion.

#### Flux d'inscription (`/api/auth/register`)

**Fichier** : `src/app/api/auth/register/route.ts`

**Étapes du flux** :

1. **Validation des paramètres** (lignes 32-37) :
   - Vérifie que `email` et `password` sont fournis

2. **Normalisation de l'email** (ligne 40) :
   - `normalizedEmail = email.trim().toLowerCase()`

3. **Récupération de l'orgId** (lignes 43-52) :
   - Appelle `getRequiredDefaultOrgId()` qui throw si `DEFAULT_ORG_ID` n'est pas configuré
   - Retourne 500 si orgId manquant

4. **⚠️ Vérification allowlist AVANT création** (lignes 54-65) :
   ```typescript
   const isEmailAllowed = await isEmailAllowedForAdmin(normalizedEmail, orgId);
   if (!isEmailAllowed) {
     return NextResponse.json(
       { 
         error: 'EMAIL_NOT_ALLOWED',
         message: "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur."
       },
       { status: 403 }
     );
   }
   ```
   **✅ BON POINT** : Le compte n'est PAS créé si l'email n'est pas autorisé.

5. **Attribution du rôle** (ligne 68) :
   - `initialRole = await assignInitialRoleForNewUser(normalizedEmail, orgId)`
   - Comme l'email est forcément autorisé à ce stade, `initialRole` sera toujours "ADMIN"

6. **Création du compte** :
   - Si `SUPABASE_SERVICE_ROLE_KEY` disponible : utilise `admin.createUser()` avec `user_metadata.role = initialRole`
   - Sinon : utilise `signUp()` avec `options.data.role = initialRole`

7. **Marquage comme utilisé** (lignes 99-101, 132-134) :
   - Si `initialRole === 'ADMIN'`, appelle `markEmailAsUsedIfAdmin()`

**Résultat** :
- ✅ Un compte ne peut être créé QUE si l'email est dans l'allowlist
- ✅ Le rôle est toujours défini explicitement ("ADMIN" si autorisé, "USER" sinon)
- ⚠️ **PROBLÈME** : La logique actuelle attribue toujours "ADMIN" car l'inscription est bloquée si l'email n'est pas autorisé. Il n'y a pas de cas où un USER pourrait s'inscrire.

#### Limite max d'admins

**✅ NON APPLICABLE selon le modèle produit actuel**

**Note produit** :
- **AUCUNE limite max d'admins** : Le nombre d'emails dans l'allowlist peut être illimité, c'est voulu par design.
- L'allowlist est le **seul contrôle d'accès** à l'inscription : seuls les emails présents dans `admin_allowed_emails` peuvent créer un compte.
- Tous les comptes créés via `/api/auth/register` reçoivent le rôle ADMIN.

**Vérification effectuée** :
- ✅ Aucune variable d'environnement `MAX_ADMINS` ou équivalent (conforme au produit)
- ✅ Aucune vérification de limite dans `/api/settings/admin-allowed-emails` (POST) (conforme au produit)
- ✅ Aucune config dans `src/lib/config/` (conforme au produit)

**Conclusion** : Le système permet d'ajouter un nombre illimité d'emails dans l'allowlist, ce qui est conforme au modèle produit actuel.

### 1.3. Rôles & guards

#### Type `Role`

**Définition** (`src/types/domain.ts`, ligne 66) :
```typescript
export type Role = "ADMIN" | "USER";
```

**Usage** :
- Utilisé dans `User.role?: Role`
- Utilisé dans les guards `requireAdmin()`
- Utilisé dans la navigation (`SidebarNav`) pour afficher/masquer des onglets

#### `requireSession()`

**Fichier** : `src/lib/auth/session.ts`, lignes 170-176

**Comportement** :
```typescript
export async function requireSession(): Promise<{ user: User; orgId?: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

**Effet** :
- Lance `Error('Unauthorized')` si pas de session valide
- Retourne la session si authentifié
- **Ne vérifie PAS le rôle** (accessible à ADMIN et USER)

**Gestion des erreurs** :
- Attrapée par les pages/API qui appellent `requireSession()`
- Redirection vers `/authentication/login?error=unauthorized` dans certains cas

#### `requireAdmin()`

**Fichier** : `src/lib/auth/permissions.ts`, lignes 23-37

**Comportement** :
```typescript
export async function requireAdmin(): Promise<void> {
  const session = await requireSession();
  
  if (!session.user.role) {
    throw new Error("User role not defined");
  }
  
  if (session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}
```

**Effet** :
- Vérifie d'abord qu'une session existe (`requireSession()`)
- Lance `Error("User role not defined")` si `role` est `undefined`
- Lance `Error("Unauthorized")` si `role !== "ADMIN"`
- Ne retourne rien si OK (void)

**Gestion des erreurs** :
- Les pages/API vérifient `error.message === 'Unauthorized'` pour rediriger
- Exemple dans `src/app/(dashboard)/settings/admins/page.tsx` (lignes 40-50)

#### `getCurrentOrgId()`

**Fichier** : `src/lib/auth/session.ts`, lignes 216-232

**Comportement** :
```typescript
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession();
  
  if (session.orgId) {
    return session.orgId;
  }
  
  if (DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;
  }
  
  throw new Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured');
}
```

**Effet** :
- Vérifie d'abord qu'une session existe
- Retourne `session.orgId` si présent
- Fallback vers `DEFAULT_ORG_ID` (env var) si `session.orgId` manquant
- Throw si ni l'un ni l'autre

**Usage** :
- Utilisé dans TOUTES les queries DB pour filtrer par `org_id`
- Source de vérité unique pour l'orgId côté serveur

---

## 2) Matrice des permissions (ADMIN vs USER)

### Dashboard principal (`/dashboard`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API routes** | Toutes accessibles | Toutes accessibles (si authentifié) |

**Note** : La page dashboard n'a pas de guard spécifique, seulement `getCurrentOrgId()` qui nécessite une session.

### Clients

#### Liste des clients (`/clients`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API GET `/api/clients`** | ✅ `requireSession()` | ✅ `requireSession()` |

#### Création client (`/clients/nouveau`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès page** | ✅ Oui | ⚠️ **Page accessible mais action bloquée** |
| **Guard serveur** | Aucun (page client) | Aucun (page client) |
| **API POST `/api/clients`** | ✅ `requireAdmin()` | ❌ Bloqué par `requireAdmin()` |

**⚠️ INCOHÉRENCE** : La page `/clients/nouveau` est accessible aux USER, mais l'API POST bloque. L'utilisateur verra une erreur après soumission du formulaire.

#### Modification/Suppression client (`/api/clients/[id]`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **API PATCH** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API DELETE** | ✅ `requireAdmin()` | ❌ Bloqué |

### Templates

#### Liste des templates (`/templates`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API GET `/api/templates`** | ✅ `getCurrentOrgId()` uniquement | ✅ `getCurrentOrgId()` uniquement |

#### Création/Modification templates

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Server Actions** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API POST `/api/templates`** | ✅ `getSession()` uniquement | ✅ `getSession()` uniquement |

**⚠️ INCOHÉRENCE** : L'API POST `/api/templates` n'utilise PAS `requireAdmin()`, alors que les Server Actions le font. Un USER pourrait théoriquement créer un template via l'API legacy.

**Note** : L'API POST est marquée comme "LEGACY" et devrait être supprimée à terme.

### Offers / Offres

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès pages** | ✅ Oui | ✅ Oui (présumé) |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API routes** | À vérifier (non analysées en détail) | À vérifier |

**Note** : Les routes offers n'ont pas été analysées en détail dans cet audit.

### Settings > Admins (`/settings/admins`)

| Aspect | ADMIN | USER |
|-------|-------|------|
| **Accès page** | ✅ Oui | ❌ Bloqué par `requireAdmin()` |
| **Guard serveur** | ✅ `requireAdmin()` | ❌ Redirige vers login |
| **API GET** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API POST** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API DELETE** | ✅ `requireAdmin()` | ❌ Bloqué |

**✅ COHÉRENT** : Toutes les routes Settings/Admins sont bien protégées par `requireAdmin()`.

---

## 3) Contrôles de sécurité techniques

### 3.1. Rôles & fallbacks

**Recherche effectuée** : `grep -i "role.*\|\|.*ADMIN"`

**Résultat** :
- ✅ **Aucun fallback `role || "ADMIN"` dans le code de production**
- ⚠️ Des fallbacks trouvés dans les **docs d'audit** (`docs/audits/*.md`), mais pas dans le code source

**Fichiers vérifiés** :
- `src/lib/auth/session.ts` : ✅ Pas de fallback
- `src/lib/auth/permissions.ts` : ✅ Pas de fallback
- `src/app/(dashboard)/layout.tsx` : ✅ Pas de fallback (ligne 16 : `const userRole = session?.user.role`)
- `src/components/AppShell.tsx` : ✅ Pas de fallback
- `src/components/sidebar/Sidebar.tsx` : ✅ Pas de fallback
- `src/components/sidebar/SidebarNav.tsx` : ✅ Pas de fallback (ligne 34 : `if (userRole === "ADMIN")`)

**Conclusion** : ✅ Le code respecte la règle "pas de fallback automatique vers ADMIN".

### 3.2. Inscription et création de comptes

#### Condition EXACTE pour créer un compte

**Fichier** : `src/app/api/auth/register/route.ts`

**Conditions nécessaires** :

1. ✅ `email` et `password` fournis (lignes 32-37)
2. ✅ `DEFAULT_ORG_ID` configuré dans les env vars (lignes 43-52)
3. ✅ **Email dans l'allowlist** (lignes 54-65) - **BLOQUANT**

**Résultat** :
- Si l'email n'est PAS autorisé → **403 Forbidden**, compte NON créé
- Si l'email est autorisé → Compte créé avec `role = "ADMIN"` dans `user_metadata`

**⚠️ PROBLÈME LOGIQUE** :
- La fonction `assignInitialRoleForNewUser()` retourne "ADMIN" si autorisé, "USER" sinon
- Mais comme l'inscription est bloquée si non autorisé, `initialRole` sera toujours "ADMIN"
- Il n'y a donc pas de cas où un USER pourrait s'inscrire via cette route

#### Vérification email non autorisé

**✅ SÉCURISÉ** :
- L'API `/api/auth/register` vérifie l'allowlist AVANT de créer le compte
- Si l'email n'est pas autorisé, retourne 403 avec message clair
- Le compte n'est jamais créé dans Supabase Auth

#### Webhook `user-created`

**Fichier** : `src/app/api/auth/webhook/user-created/route.ts`

**Fonctionnement** :
- Appelé par Supabase après création d'un utilisateur (via Database Trigger ou Auth Hook)
- Vérifie si le rôle est déjà défini (ligne 124) → skip si oui
- Sinon, attribue le rôle basé sur l'allowlist
- Marque l'email comme utilisé si admin

**⚠️ RISQUE DE REDONDANCE** :
- Si `/api/auth/register` crée déjà le compte avec le bon rôle, le webhook ne devrait rien faire (skip à la ligne 124)
- Mais si un compte est créé via un autre moyen (ex: Supabase Dashboard), le webhook peut attribuer le rôle

**⚠️ RISQUE DE DOUBLE ATTRIBUTION** :
- Si le webhook s'exécute avant que `/api/auth/register` ne mette le rôle, il pourrait y avoir une race condition
- Mais le check ligne 124 devrait éviter cela

**Recommandation** : Le webhook est utile comme filet de sécurité, mais ne devrait normalement pas être nécessaire si `/api/auth/register` est le seul point d'entrée.

### 3.3. Limite max d'admins

**❌ NON IMPLÉMENTÉE**

**Où devrait être définie** :
- Variable d'environnement : `MAX_ADMINS` ou `MAX_ADMIN_ALLOWED_EMAILS`
- Config dans `src/lib/config/admin.ts` (fichier à créer)

**Comment devrait être appliquée** :
- Dans `POST /api/settings/admin-allowed-emails` :
  1. Compter les emails existants : `count = await countAdminAllowedEmails(orgId)`
  2. Vérifier : `if (count >= MAX_ADMINS) return 400`
  3. Ajouter l'email si OK

**Comment devrait être renvoyé** :
- Status HTTP : `400 Bad Request` ou `403 Forbidden`
- JSON : `{ error: "MAX_ADMINS_LIMIT_REACHED", message: "La limite maximale d'admins est atteinte." }`

**Consommation côté client** :
- `AdminAllowedEmailsClient.tsx` devrait afficher un toast d'erreur avec le message

**État actuel** : ❌ Aucune vérification, aucun message d'erreur.

### 3.4. Multi-tenant / orgId

#### Filtrage par `org_id` dans les queries

**Queries vérifiées** :

1. **Clients** (`src/lib/db/queries/clients.ts`) :
   - ✅ `listClients(orgId, ...)` : Filtre par `eq(clients.org_id, orgId)` (ligne 49)
   - ✅ `getClientById(id, orgId)` : Filtre par `and(eq(clients.id, id), eq(clients.org_id, orgId))`
   - ✅ `createClient({ orgId, ... })` : Insère avec `org_id: orgId`
   - ✅ `updateClient(id, orgId, ...)` : Filtre par `and(eq(clients.id, id), eq(clients.org_id, orgId))`
   - ✅ `deleteClient(id, orgId)` : Filtre par `and(eq(clients.id, id), eq(clients.org_id, orgId))`

2. **Templates** (`src/lib/db/queries/templates.ts`) :
   - ✅ Toutes les queries filtrent par `org_id`

3. **Offers** (`src/lib/db/queries/offers.ts`) :
   - ✅ `listOffers(orgId)` : Filtre par `eq(offers.org_id, orgId)` (ligne 48)
   - ✅ `getOfferById(id, orgId)` : Filtre par `and(eq(offers.id, id), eq(offers.org_id, orgId))` (ligne 58)
   - ✅ `createOffer({ orgId, ... })` : Insère avec `org_id: data.orgId` (ligne 79)

4. **Admin allowed emails** (`src/lib/db/queries/adminAllowedEmails.ts`) :
   - ✅ Toutes les queries filtrent par `org_id`

**Conclusion** : ✅ Toutes les queries sensibles filtrent correctement par `org_id`.

#### Source de `orgId`

**Vérification** :
- ✅ `orgId` vient TOUJOURS de `getCurrentOrgId()` côté serveur
- ✅ Aucune API n'accepte `org_id` ou `orgId` dans le body (vérifications explicites dans plusieurs routes)
- ✅ Exemples de protection :
  - `POST /api/settings/admin-allowed-emails` (lignes 66-72)
  - `POST /api/clients` (lignes 92-97)

**Conclusion** : ✅ `orgId` vient toujours du serveur, jamais du client.

### 3.5. Middleware & redirections

**Fichier** : `middleware.ts`

#### Patterns de routes protégées

**Routes authentifiées** (lignes 47-52) :
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

**Routes d'authentification** (lignes 36-44) :
- `/authentication/login` et `/authentication/register` : Redirige vers `/dashboard` si déjà authentifié

**Routes legacy** (lignes 55-59) :
- `/auth/*` : Redirige vers `/dashboard` si authentifié

#### Redirections vers login

**Cas de redirection** :
- ✅ Pas de session valide sur routes protégées → `/authentication/login`
- ⚠️ **PAS de paramètre `?error=unauthorized`** ajouté par le middleware

**Redirections depuis les pages** :
- Certaines pages ajoutent `?error=unauthorized` manuellement (ex: `settings/admins/page.tsx`, ligne 44)
- Incohérence : le middleware ne le fait pas, mais certaines pages oui

#### Incohérences dans les redirections

**Problèmes identifiés** :

1. **Middleware** : Redirige vers `/authentication/login` sans paramètre d'erreur
2. **Pages** : Certaines redirigent vers `/authentication/login?error=unauthorized`
3. **Pages** : Certaines redirigent vers `/login?error=unauthorized` (sans `/authentication/`)

**Exemples** :
- `middleware.ts` ligne 50 : `/authentication/login` (sans paramètre)
- `settings/admins/page.tsx` ligne 44 : `/authentication/login?error=unauthorized`
- `templates/page.tsx` ligne 38 : `/login?error=unauthorized` (route incorrecte)

**Impact** : Incohérence dans les URLs de redirection, mais fonctionnel.

---

## 4) UX & messages d'erreur

### Inscription (`AuthRegister.tsx`)

**Fichier** : `src/app/authentication/auth/AuthRegister.tsx`

#### Message si email non autorisé

**Gestion** (lignes 66-67) :
```typescript
if (result.error === 'EMAIL_NOT_ALLOWED') {
  setError(result.message || "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur.");
}
```

**Message affiché** :
- ✅ Message en français : "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur."
- ✅ Clair et compréhensible
- ✅ Affiché dans un `Alert` Material-UI avec `severity="error"`

**✅ BON** : L'utilisateur est bien informé.

### Accès refusés

#### USER sur zone ADMIN-only

**Exemple** : USER tente d'accéder à `/settings/admins`

**Comportement** (`settings/admins/page.tsx`, lignes 40-50) :
```typescript
catch (error) {
  if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
    redirect('/authentication/login?error=unauthorized');
  }
}
```

**Message affiché** (`AuthLogin.tsx`, lignes 37-38) :
```typescript
if (errorParam === "unauthorized") {
  setUrlError("Vous n'avez pas les droits pour accéder à cette page.");
}
```

**✅ BON** : Message clair en français.

#### Session expirée

**Comportement** :
- Le middleware redirige vers `/authentication/login` sans paramètre
- `AuthLogin.tsx` lit `?error=session` si présent (ligne 39-40) :
  ```typescript
  else if (errorParam === "session") {
    setUrlError("Votre session a expiré, veuillez vous reconnecter.");
  }
  ```

**⚠️ PROBLÈME** : Le middleware ne passe pas `?error=session`, donc ce message n'est jamais affiché automatiquement.

#### orgId manquant

**Comportement** :
- `getCurrentOrgId()` throw `Error('Organization ID not found...')`
- Les pages/API attrapent et redirigent avec `?error=unauthorized`
- Message affiché : "Vous n'avez pas les droits pour accéder à cette page."

**⚠️ PROBLÈME** : Le message est générique, ne mentionne pas spécifiquement le problème d'orgId.

### Absence de feedback

**Cas identifiés** :

1. **Limite max d'admins atteinte** : ❌ Aucun message (non implémenté)
2. **Erreur générique serveur** : Certaines pages redirigent sans message visible
3. **Session expirée** : Le middleware ne passe pas de paramètre d'erreur

---

## 5) Problèmes identifiés

### AUTH-001 : Limite max d'admins non implémentée

**Gravité** : **HIGH**

**Fichiers** :
- `src/app/api/settings/admin-allowed-emails/route.ts` (POST)
- `src/lib/db/queries/adminAllowedEmails.ts`
- `src/lib/config/` (fichier manquant)

**Description factuelle** :
- Aucune vérification de limite maximale d'admins lors de l'ajout d'un email dans l'allowlist
- Aucune variable d'environnement `MAX_ADMINS` ou équivalent
- Un admin peut ajouter un nombre illimité d'emails autorisés

**Impact / risque** :
- Violation de la contrainte produit : "La limite max d'admins est configurable, jamais hardcodée"
- Risque de sécurité : multiplication des comptes admin non contrôlée
- Pas de contrôle de gouvernance

**Intention probable** :
- Le système devrait avoir une config `MAX_ADMINS` (env var)
- L'API POST devrait vérifier `count(admin_allowed_emails WHERE org_id = X) < MAX_ADMINS` avant insertion
- Retourner 400/403 avec message clair si limite atteinte

---

### AUTH-002 : Incohérence navigation vs permissions - Page création client

**Gravité** : **MEDIUM**

**Fichiers** :
- `src/app/(dashboard)/clients/nouveau/page.tsx`
- `src/app/api/clients/route.ts` (POST)

**Description factuelle** :
- La page `/clients/nouveau` est accessible aux USER (pas de guard)
- L'API POST `/api/clients` est protégée par `requireAdmin()`
- Un USER peut accéder à la page mais verra une erreur après soumission

**Impact / risque** :
- Mauvaise UX : l'utilisateur pense pouvoir créer un client mais est bloqué
- Confusion sur les permissions réelles

**Intention probable** :
- La page devrait être protégée côté serveur (Server Component avec `requireAdmin()`)
- Ou la navigation devrait masquer le lien "Nouveau client" pour les USER

---

### AUTH-003 : API Templates POST legacy sans requireAdmin

**Gravité** : **MEDIUM**

**Fichiers** :
- `src/app/api/templates/route.ts` (POST)

**Description factuelle** :
- L'API POST `/api/templates` utilise seulement `getSession()`, pas `requireAdmin()`
- Les Server Actions utilisent `requireAdmin()` pour créer des templates
- Un USER authentifié pourrait théoriquement créer un template via l'API legacy

**Impact / risque** :
- Contournement possible des permissions si l'API legacy est utilisée
- Incohérence avec les Server Actions

**Intention probable** :
- L'API est marquée comme "LEGACY" et devrait être supprimée
- En attendant, elle devrait utiliser `requireAdmin()` pour cohérence

**Note** : L'API est loggée avec `console.warn` pour monitoring, ce qui est bien.

---

### AUTH-004 : Incohérence redirections middleware vs pages

**Gravité** : **LOW**

**Fichiers** :
- `middleware.ts`
- `src/app/(dashboard)/settings/admins/page.tsx`
- `src/app/(dashboard)/templates/page.tsx`

**Description factuelle** :
- Le middleware redirige vers `/authentication/login` sans paramètre d'erreur
- Certaines pages redirigent vers `/authentication/login?error=unauthorized`
- Une page redirige vers `/login?error=unauthorized` (route incorrecte)

**Impact / risque** :
- Messages d'erreur inconsistants pour l'utilisateur
- Route `/login` incorrecte (devrait être `/authentication/login`)

**Intention probable** :
- Standardiser les redirections : toujours utiliser `/authentication/login?error=...`
- Le middleware devrait passer un paramètre d'erreur approprié

---

### AUTH-005 : Webhook user-created potentiellement redondant

**Gravité** : **LOW**

**Fichiers** :
- `src/app/api/auth/webhook/user-created/route.ts`
- `src/app/api/auth/register/route.ts`

**Description factuelle** :
- Le webhook attribue le rôle si non défini
- `/api/auth/register` définit déjà le rôle lors de la création
- Le webhook skip si le rôle est déjà défini (ligne 124)

**Impact / risque** :
- Redondance si `/api/auth/register` est le seul point d'entrée
- Utile comme filet de sécurité si d'autres moyens créent des comptes

**Intention probable** :
- Le webhook est un filet de sécurité pour les comptes créés via d'autres moyens
- Pas critique, mais pourrait être documenté comme "safety net"

---

### AUTH-006 : Logique d'inscription : toujours ADMIN si autorisé

**Gravité** : **LOW** (question de design)

**Fichiers** :
- `src/app/api/auth/register/route.ts`
- `src/lib/auth/adminAllowlist.ts`

**Description factuelle** :
- L'inscription est bloquée si l'email n'est PAS dans l'allowlist
- Si l'email est autorisé, le rôle est toujours "ADMIN"
- La fonction `assignInitialRoleForNewUser()` retourne "USER" si non autorisé, mais ce cas n'arrive jamais

**Impact / risque** :
- Pas de problème de sécurité, mais logique redondante
- Si le produit veut permettre l'inscription de USER (non-admin), la logique doit changer

**Intention probable** :
- Le système actuel est "allowlist = admin uniquement"
- Si le besoin évolue vers "allowlist = autorisé à s'inscrire (admin ou user)", la logique doit être adaptée

---

## 6) Conclusion & Checklist

### Résumé (3-5 phrases)

Le système d'authentification est **globalement sécurisé** avec Supabase Auth, des guards stricts (`requireAdmin()`, `requireSession()`), et un filtrage multi-tenant correct par `org_id`. **L'inscription est bien protégée** : seuls les emails dans l'allowlist peuvent créer un compte, et le rôle est toujours défini explicitement (pas de fallback automatique vers ADMIN). Cependant, **la limite max d'admins n'est pas implémentée**, ce qui viole la contrainte produit. Il reste quelques **incohérences mineures** dans la navigation (page création client accessible aux USER) et les redirections (URLs inconsistantes), mais aucun problème de sécurité critique.

### Checklist synthétique

- [ ] **L'inscription est 100% réservée aux emails dans l'allowlist.**
  - ✅ **OK** : `/api/auth/register` vérifie l'allowlist avant création, retourne 403 si non autorisé

- [ ] **Tous les comptes ont toujours un rôle explicite (ADMIN ou USER).**
  - ✅ **OK** : Le rôle est défini dans `user_metadata` lors de la création
  - ⚠️ **À REVOIR** : Un compte créé via un autre moyen (ex: Supabase Dashboard) pourrait ne pas avoir de rôle, mais le webhook devrait le corriger

- [ ] **Les pages / APIs critiques sont bien protégées par requireAdmin().**
  - ✅ **OK** : Settings/Admins, création clients, templates (Server Actions)
  - ⚠️ **À REVOIR** : API Templates POST legacy n'utilise pas `requireAdmin()`
  - ⚠️ **À REVOIR** : Page création client accessible aux USER (pas de guard serveur)

- [ ] **La limite max d'admins est centralisée en config, jamais hardcodée.**
  - ❌ **À REVOIR** : Non implémentée. Aucune config, aucune vérification dans l'API POST

- [ ] **L'UI informe clairement l'utilisateur en cas d'email non autorisé ou accès refusé.**
  - ✅ **OK** : Message clair en français pour email non autorisé
  - ✅ **OK** : Message clair pour accès refusé (USER sur zone ADMIN)
  - ⚠️ **À REVOIR** : Session expirée : middleware ne passe pas de paramètre d'erreur
  - ❌ **À REVOIR** : Limite max d'admins : aucun message (non implémenté)

---

**Fin de l'audit**

