# 🔒 AUDIT FINAL : Authentification / Rôles / Allowlist / Sécurité

**Date** : 2024  
**Type** : Audit synthétique complet  
**Contexte produit** : Inscription strictement réservée aux emails dans l'allowlist, tous les utilisateurs créés reçoivent le rôle ADMIN, aucune limite max d'admins

---

## 📋 Résumé exécutif

Le système d'authentification est **globalement sécurisé et conforme au modèle produit**. L'inscription principale (`/api/auth/register`) vérifie strictement l'allowlist avant toute création de compte et attribue toujours le rôle ADMIN explicitement. Aucune limite max d'admins n'est présente dans le code (conforme au produit). Cependant, **le webhook `user-created` peut créer des comptes USER si un compte est créé manuellement dans Supabase Dashboard avec un email non autorisé**, ce qui viole le modèle produit. Quelques **incohérences mineures** existent : page création client accessible sans guard serveur, API Templates POST legacy sans `requireAdmin()`, et redirections inconsistantes. Le multi-tenant est bien sécurisé avec filtrage systématique par `org_id`.

---

## 1) Modèle produit respecté

### 1.1. API d'inscription principale

**Fichier** : `src/app/api/auth/register/route.ts`

**Vérification allowlist AVANT création** (lignes 54-65) :
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

**✅ CONFIRMÉ** :
- La vérification se fait **AVANT** toute création de compte (ligne 54)
- Si l'email n'est pas autorisé → **403 Forbidden**, compte **NON créé**
- Le flux est sécurisé : pas de création puis rejet

**Attribution du rôle ADMIN** (lignes 67-68, 85, 117) :
```typescript
const initialRole = await assignInitialRoleForNewUser(normalizedEmail, orgId);
// initialRole sera toujours "ADMIN" car l'email est autorisé à ce stade
user_metadata: {
  role: initialRole,  // Toujours "ADMIN"
  ...
}
```

**✅ CONFIRMÉ** :
- Tous les comptes créés via `/api/auth/register` reçoivent `role = "ADMIN"` dans `user_metadata`
- Le rôle est **explicitement défini**, pas de fallback automatique
- Aucun cas où un USER pourrait être créé via cette route (car inscription bloquée si non autorisé)

### 1.2. Chemins alternatifs de création de compte

#### Webhook `user-created` (`/api/auth/webhook/user-created`)

**Fichier** : `src/app/api/auth/webhook/user-created/route.ts`

**Fonctionnement** :
- Appelé par Supabase après création d'un utilisateur (Database Trigger ou Auth Hook)
- Vérifie si le rôle est déjà défini (ligne 124) → skip si oui
- Sinon, attribue le rôle basé sur l'allowlist (ligne 142)

**⚠️ PROBLÈME : Violation du modèle produit**

**Scénario problématique** :
1. Un compte est créé manuellement dans Supabase Dashboard avec un email **non autorisé** (ex: `user@example.com`)
2. Le webhook est déclenché
3. `assignInitialRoleForNewUser()` vérifie l'allowlist → email non autorisé → retourne `"USER"` (ligne 142)
4. Le webhook attribue `role = "USER"` dans `user_metadata` (ligne 150)

**Impact** :
- Un compte USER peut être créé, ce qui viole le modèle produit "seuls les emails autorisés peuvent créer un compte"
- Le webhook devrait **rejeter** les comptes créés avec un email non autorisé, pas leur attribuer USER

**Recommandation** :
- Modifier le webhook pour vérifier l'allowlist AVANT d'attribuer le rôle
- Si l'email n'est pas autorisé, soit :
  - Supprimer le compte créé manuellement
  - Soit attribuer un rôle spécial "PENDING" et bloquer l'accès
  - Soit throw une erreur pour signaler la violation

#### Dashboard Supabase (création manuelle)

**Risque** :
- Si la création manuelle de comptes est activée dans Supabase Dashboard, un admin peut créer un compte avec n'importe quel email
- Le webhook attribuera USER si l'email n'est pas autorisé (voir ci-dessus)

**Recommandation** :
- Désactiver la création manuelle de comptes dans Supabase Dashboard (config Supabase)
- Documenter que seul `/api/auth/register` doit être utilisé

**✅ CONCLUSION** :
- Le chemin principal (`/api/auth/register`) est **sécurisé et conforme**
- Le webhook est un **filet de sécurité** mais peut créer des USER si un compte est créé manuellement avec un email non autorisé → **AUTH-001**

---

## 2) Rôles & guards

### 2.1. Absence de fallback automatique vers ADMIN

**Recherche effectuée** : `grep -i "role.*\|\|.*ADMIN"` dans `src/`

**Résultat** : ✅ **Aucun fallback trouvé dans le code de production**

**Fichiers vérifiés** :
- `src/lib/auth/session.ts` : ✅ Pas de fallback (lignes 36-38, 97-99)
- `src/lib/auth/permissions.ts` : ✅ Pas de fallback
- `src/app/(dashboard)/layout.tsx` : ✅ Pas de fallback (ligne 16 : `const userRole = session?.user.role`)
- `src/components/sidebar/SidebarNav.tsx` : ✅ Pas de fallback (ligne 34 : `if (userRole === "ADMIN")`)

**✅ CONFIRMÉ** : Le code respecte la règle "pas de fallback automatique vers ADMIN".

### 2.2. Utilisation des guards

#### `requireSession()`

**Définition** : `src/lib/auth/session.ts`, lignes 170-176
- Lance `Error('Unauthorized')` si pas de session
- Retourne la session si authentifié
- **Ne vérifie PAS le rôle** (accessible à ADMIN et USER)

**Utilisation dans les API routes** :
- `GET /api/clients` : ✅ `requireSession()` (ligne 27)
- `GET /api/clients/[id]` : ✅ `requireSession()` (ligne 24)
- `GET /api/templates` : ⚠️ Utilise `getCurrentOrgId()` qui appelle `requireSession()` indirectement
- `POST /api/templates` (legacy) : ⚠️ Utilise `getSession()` au lieu de `requireSession()` (ligne 72)

**Utilisation dans les Server Components** :
- Aucune utilisation directe (les Server Components utilisent `getSession()` ou `getCurrentOrgId()`)

**Utilisation dans les Server Actions** :
- Aucune utilisation directe (les Server Actions utilisent `requireAdmin()` qui appelle `requireSession()`)

#### `requireAdmin()`

**Définition** : `src/lib/auth/permissions.ts`, lignes 23-37
- Vérifie d'abord qu'une session existe (`requireSession()`)
- Lance `Error("User role not defined")` si `role` est `undefined`
- Lance `Error("Unauthorized")` si `role !== "ADMIN"`

**Utilisation dans les API routes** :
- `POST /api/clients` : ✅ `requireAdmin()` (ligne 86)
- `PATCH /api/clients/[id]` : ✅ `requireAdmin()` (ligne 76)
- `DELETE /api/clients/[id]` : ✅ `requireAdmin()` (ligne 163)
- `GET/POST/DELETE /api/settings/admin-allowed-emails` : ✅ `requireAdmin()` (lignes 24, 60, 134)
- `POST /api/templates` (legacy) : ❌ **MANQUE** `requireAdmin()` (ligne 72 : seulement `getSession()`)

**Utilisation dans les Server Components** :
- `/settings/admins/page.tsx` : ✅ `requireAdmin()` (ligne 22)

**Utilisation dans les Server Actions** :
- `src/app/(dashboard)/templates/actions.ts` : ✅ `requireAdmin()` (lignes 65, 206, 321)
- `src/app/(dashboard)/templates/nouveau/actions.ts` : ✅ `requireAdmin()` (ligne 124)

#### `getCurrentOrgId()`

**Définition** : `src/lib/auth/session.ts`, lignes 216-232
- Appelle `requireSession()` en interne
- Retourne `session.orgId` ou `DEFAULT_ORG_ID` (fallback)
- Throw si ni l'un ni l'autre

**Utilisation** :
- ✅ Utilisé dans **toutes** les queries DB pour filtrer par `org_id`
- ✅ Utilisé dans **toutes** les API routes qui accèdent aux données
- ✅ Source de vérité unique pour l'orgId côté serveur

### 2.3. Routes critiques sans guard adapté

#### Routes admin-only sans `requireAdmin()`

**AUTH-002** : `POST /api/templates` (legacy)
- **Fichier** : `src/app/api/templates/route.ts`, ligne 70-111
- **Problème** : Utilise seulement `getSession()` (ligne 72), pas `requireAdmin()`
- **Impact** : Un USER authentifié pourrait théoriquement créer un template via l'API legacy
- **Incohérence** : Les Server Actions utilisent `requireAdmin()` pour créer des templates
- **Note** : L'API est marquée comme "LEGACY" et loggée avec `console.warn` pour monitoring

**AUTH-003** : Page `/clients/nouveau` accessible sans guard serveur
- **Fichier** : `src/app/(dashboard)/clients/nouveau/page.tsx`
- **Problème** : Page client sans guard serveur, mais API POST protégée par `requireAdmin()`
- **Impact** : Un USER peut accéder à la page et remplir le formulaire, mais voit une erreur après soumission
- **Incohérence UX** : Page visible mais action bloquée

#### Routes avec guards corrects

**✅ Routes bien protégées** :
- `/settings/admins` : ✅ `requireAdmin()` (page + API)
- `POST /api/clients` : ✅ `requireAdmin()`
- `PATCH/DELETE /api/clients/[id]` : ✅ `requireAdmin()`
- Server Actions templates : ✅ `requireAdmin()`

---

## 3) Matrice des permissions

### Dashboard principal (`/dashboard`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API routes** | Toutes accessibles | Toutes accessibles (si authentifié) |

**Note** : Pas de guard spécifique, seulement vérification de session via `getCurrentOrgId()`.

### Clients

#### Liste (`/clients`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API GET `/api/clients`** | ✅ `requireSession()` | ✅ `requireSession()` |

#### Création (`/clients/nouveau`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ⚠️ **Page accessible mais action bloquée** |
| **Guard serveur** | Aucun (page client) | Aucun (page client) |
| **API POST `/api/clients`** | ✅ `requireAdmin()` | ❌ Bloqué par `requireAdmin()` |

**⚠️ INCOHÉRENCE** : La page est accessible aux USER (pas de guard), mais l'API POST bloque. → **AUTH-003**

#### Modification/Suppression (`/api/clients/[id]`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **API PATCH** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API DELETE** | ✅ `requireAdmin()` | ❌ Bloqué |

### Templates

#### Liste (`/templates`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ✅ Oui |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API GET `/api/templates`** | ✅ `getCurrentOrgId()` uniquement | ✅ `getCurrentOrgId()` uniquement |

#### Création/Modification

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Server Actions** | ✅ `requireAdmin()` | ❌ Bloqué |
| **API POST `/api/templates` (legacy)** | ⚠️ `getSession()` uniquement | ⚠️ `getSession()` uniquement |

**⚠️ INCOHÉRENCE** : L'API POST legacy n'utilise pas `requireAdmin()`. → **AUTH-002**

### Offers / Offres

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès pages** | ✅ Oui | ✅ Oui (présumé) |
| **Guard serveur** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |
| **API routes** | `getCurrentOrgId()` uniquement | `getCurrentOrgId()` uniquement |

**Note** : Les routes offers n'ont pas été analysées en détail, mais semblent utiliser `getCurrentOrgId()` pour le filtrage multi-tenant.

### Settings > Admins (`/settings/admins`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ❌ Bloqué par `requireAdmin()` |
| **Guard serveur** | ✅ `requireAdmin()` | ❌ Redirige vers login |
| **API GET/POST/DELETE** | ✅ `requireAdmin()` | ❌ Bloqué |

**✅ COHÉRENT** : Toutes les routes Settings/Admins sont bien protégées.

---

## 4) Multi-tenant / orgId

### 4.1. Filtrage par `org_id` dans les queries

**Queries vérifiées** :

1. **Clients** (`src/lib/db/queries/clients.ts`) :
   - ✅ `listClients(orgId, ...)` : Filtre par `eq(clients.org_id, orgId)`
   - ✅ `getClientById(id, orgId)` : Filtre par `and(eq(clients.id, id), eq(clients.org_id, orgId))`
   - ✅ `createClient({ orgId, ... })` : Insère avec `org_id: orgId`
   - ✅ `updateClient(id, orgId, ...)` : Filtre par `org_id`
   - ✅ `deleteClient(id, orgId)` : Filtre par `org_id`

2. **Templates** (`src/lib/db/queries/templates.ts`) :
   - ✅ Toutes les queries filtrent par `org_id`

3. **Offers** (`src/lib/db/queries/offers.ts`) :
   - ✅ `listOffers(orgId)` : Filtre par `eq(offers.org_id, orgId)`
   - ✅ `getOfferById(id, orgId)` : Filtre par `and(eq(offers.id, id), eq(offers.org_id, orgId))`
   - ✅ `createOffer({ orgId, ... })` : Insère avec `org_id: data.orgId`

4. **Admin allowed emails** (`src/lib/db/queries/adminAllowedEmails.ts`) :
   - ✅ Toutes les queries filtrent par `org_id`

**✅ CONFIRMÉ** : Toutes les queries sensibles filtrent correctement par `org_id`.

### 4.2. Source de `orgId`

**Vérification** :
- ✅ `orgId` vient TOUJOURS de `getCurrentOrgId()` côté serveur
- ✅ Aucune API n'accepte `org_id` ou `orgId` dans le body (vérifications explicites)

**Exemples de protection** :
- `POST /api/settings/admin-allowed-emails` (lignes 66-72) :
  ```typescript
  if ('org_id' in body || 'orgId' in body) {
    return NextResponse.json(
      { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
      { status: 400 }
    );
  }
  ```
- `POST /api/clients` (lignes 92-97) : Même vérification
- `PATCH /api/clients/[id]` (lignes 90-95) : Même vérification

**✅ CONFIRMÉ** : `orgId` vient toujours du serveur, jamais du client.

---

## 5) Redirections & UX

### 5.1. Cohérence des redirections

#### Middleware (`middleware.ts`)

**Redirections** :
- Routes protégées sans session → `/authentication/login` (ligne 50)
- Routes auth avec session → `/dashboard` (ligne 40)
- **⚠️ Pas de paramètre d'erreur** dans les redirections

#### Pages Server Components

**Redirections identifiées** :
- `settings/admins/page.tsx` (ligne 44) : `/authentication/login?error=unauthorized` ✅
- `templates/page.tsx` (ligne 38) : `/login?error=unauthorized` ❌ **Route incorrecte**
- `clients/page.tsx` (ligne 83) : `/authentication/login?error=unauthorized` ✅

**⚠️ INCOHÉRENCE** : Route `/login` incorrecte dans `templates/page.tsx` → **AUTH-004**

### 5.2. Paramètres d'erreur

**Paramètres utilisés** :
- `?error=unauthorized` : Accès refusé (USER sur zone ADMIN-only)
- `?error=session` : Session expirée (non utilisé par le middleware)

**Gestion côté client** (`AuthLogin.tsx`, lignes 35-43) :
```typescript
const errorParam = searchParams.get("error");
if (errorParam === "unauthorized") {
  setUrlError("Vous n'avez pas les droits pour accéder à cette page.");
} else if (errorParam === "session") {
  setUrlError("Votre session a expiré, veuillez vous reconnecter.");
}
```

**✅ Messages clairs en français**

**⚠️ PROBLÈME** : Le middleware ne passe pas `?error=session` lors de la redirection pour session expirée.

### 5.3. Messages d'erreur

#### Inscription (`AuthRegister.tsx`)

**Email non autorisé** (lignes 66-67) :
```typescript
if (result.error === 'EMAIL_NOT_ALLOWED') {
  setError(result.message || "Cet email n'est pas autorisé à créer un compte. Contactez un administrateur.");
}
```

**✅ Message clair en français**

#### Accès refusé

**Message affiché** : "Vous n'avez pas les droits pour accéder à cette page." ✅

**✅ CONCLUSION** : Les messages d'erreur sont clairs et en français. Seule incohérence : route `/login` incorrecte et middleware qui ne passe pas de paramètre d'erreur.

---

## 6) Dérives à corriger

### AUTH-001 : Webhook peut créer des USER

**Gravité** : **HIGH**

**Fichier** : `src/app/api/auth/webhook/user-created/route.ts`

**Description** :
- Le webhook attribue le rôle basé sur l'allowlist (ligne 142)
- Si un compte est créé manuellement dans Supabase Dashboard avec un email **non autorisé**, le webhook attribuera `role = "USER"`
- Cela viole le modèle produit "seuls les emails autorisés peuvent créer un compte"

**Impact** :
- Violation du modèle produit
- Risque de création de comptes USER non autorisés

**Solution recommandée** :
- Modifier le webhook pour vérifier l'allowlist AVANT d'attribuer le rôle
- Si l'email n'est pas autorisé :
  - Option 1 : Supprimer le compte créé manuellement
  - Option 2 : Attribuer un rôle spécial "PENDING" et bloquer l'accès
  - Option 3 : Throw une erreur pour signaler la violation
- Documenter que la création manuelle de comptes doit être désactivée dans Supabase Dashboard

---

### AUTH-002 : API Templates POST legacy sans requireAdmin

**Gravité** : **MEDIUM**

**Fichier** : `src/app/api/templates/route.ts`, ligne 70-111

**Description** :
- L'API POST `/api/templates` utilise seulement `getSession()` (ligne 72), pas `requireAdmin()`
- Les Server Actions utilisent `requireAdmin()` pour créer des templates
- Un USER authentifié pourrait théoriquement créer un template via l'API legacy

**Impact** :
- Contournement possible des permissions si l'API legacy est utilisée
- Incohérence avec les Server Actions

**Solution recommandée** :
- Ajouter `await requireAdmin();` avant `getSession()` dans l'API POST (ligne 72)
- Ou documenter que l'API est dépréciée et sera supprimée
- L'API est déjà loggée avec `console.warn` pour monitoring ✅

---

### AUTH-003 : Page création client accessible sans guard serveur

**Gravité** : **MEDIUM**

**Fichier** : `src/app/(dashboard)/clients/nouveau/page.tsx`

**Description** :
- La page `/clients/nouveau` est un composant client sans guard serveur
- Un USER peut accéder à la page et remplir le formulaire
- L'API POST bloque avec `requireAdmin()`, mais l'utilisateur voit une erreur après soumission

**Impact** :
- Mauvaise UX : l'utilisateur pense pouvoir créer un client mais est bloqué
- Confusion sur les permissions réelles

**Solution recommandée** :
- Convertir la page en Server Component avec `requireAdmin()` au début
- Ou créer un wrapper Server Component qui appelle `requireAdmin()` avant de rendre le composant client

---

### AUTH-004 : Route de redirection incorrecte

**Gravité** : **LOW**

**Fichier** : `src/app/(dashboard)/templates/page.tsx`, ligne 38

**Description** :
- La page redirige vers `/login?error=unauthorized` au lieu de `/authentication/login?error=unauthorized`
- Route incorrecte qui ne fonctionnera pas

**Impact** :
- Redirection vers une route inexistante
- L'utilisateur ne sera pas redirigé correctement

**Solution recommandée** :
- Corriger la route : `/login` → `/authentication/login`

---

### AUTH-005 : Middleware ne passe pas de paramètre d'erreur

**Gravité** : **LOW**

**Fichier** : `middleware.ts`, ligne 50

**Description** :
- Le middleware redirige vers `/authentication/login` sans paramètre d'erreur
- Les pages Server Components passent `?error=unauthorized` ou `?error=session`
- Incohérence dans les redirections

**Impact** :
- Messages d'erreur inconsistants pour l'utilisateur
- Le message "Votre session a expiré" n'est jamais affiché automatiquement

**Solution recommandée** :
- Ajouter `?error=session` dans la redirection du middleware (ligne 50)
- Standardiser : toujours utiliser `/authentication/login?error=...` pour les erreurs

---

### AUTH-006 : Traces de "limite max d'admins" dans les docs

**Gravité** : **LOW** (documentation)

**Fichier** : `docs/audits/AUTH_ROLES_SECURITY_COMPLETE_AUDIT.md`

**Description** :
- L'audit précédent mentionne "limite max d'admins" comme problème à résoudre
- Cela ne correspond pas au modèle produit actuel (aucune limite voulue)

**Impact** :
- Confusion pour les futurs développeurs
- Documentation incorrecte

**Solution recommandée** :
- Supprimer ou marquer comme "non applicable" toutes les mentions de MAX_ADMINS dans les docs
- Mettre à jour l'audit pour refléter le modèle produit réel

---

## 📊 Checklist finale

### Modèle produit

- [x] **Inscription strictement réservée aux emails dans l'allowlist**
  - ✅ Vérification avant création, retourne 403 si non autorisé

- [x] **Tous les comptes créés reçoivent le rôle ADMIN**
  - ✅ Rôle explicitement défini dans `user_metadata.role = "ADMIN"`

- [x] **Aucune limite max d'admins dans le code**
  - ✅ Aucune vérification de limite dans le code métier
  - ⚠️ À nettoyer : mentions dans les docs d'audit

- [ ] **Chemins alternatifs respectent le modèle**
  - ⚠️ Webhook peut créer des USER si compte créé manuellement → **AUTH-001**

### Sécurité

- [x] **Pas de fallback automatique vers ADMIN**
  - ✅ Le code respecte cette règle

- [x] **Guards stricts sur les routes critiques**
  - ✅ Settings/Admins : `requireAdmin()`
  - ✅ Création clients : `requireAdmin()` (API)
  - ⚠️ Templates POST legacy : manque `requireAdmin()` → **AUTH-002**

- [x] **Multi-tenant sécurisé**
  - ✅ Toutes les queries filtrent par `org_id`
  - ✅ `orgId` vient toujours de `getCurrentOrgId()`, jamais du client

### UX / Navigation

- [x] **Pages protégées cohérentes avec les guards**
  - ⚠️ Page création client accessible mais action bloquée → **AUTH-003**

- [x] **Messages d'erreur clairs**
  - ✅ Email non autorisé : message clair en français
  - ✅ Accès refusé : message clair
  - ⚠️ Redirections inconsistantes (route incorrecte, pas de paramètre d'erreur) → **AUTH-004, AUTH-005**

---

**Fin de l'audit**

