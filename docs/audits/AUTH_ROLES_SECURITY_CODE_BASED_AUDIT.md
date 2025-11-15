# Audit de Sécurité - Authentification et Rôles
## Audit strictement basé sur le code réel

**Date**: 2024  
**Méthodologie**: Analyse statique du code source uniquement  
**Scope**: Authentification Supabase, gestion des rôles, allowlist, webhooks, guards, multi-tenant, navigation, API routes, sécurité globale

---

## Résumé Exécutif

Le système implémente un modèle d'authentification basé sur Supabase avec une allowlist stricte pour les inscriptions. L'inscription est contrôlée par `/api/auth/register` qui vérifie l'email dans `admin_allowed_emails` avant toute création de compte. Le webhook `user-created` ne crée jamais de rôle USER et n'attribue un rôle ADMIN que si l'email est dans l'allowlist. Les guards `requireSession` et `requireAdmin` sont utilisés de manière cohérente dans les routes API critiques et les pages protégées. Le multi-tenant est géré via `getCurrentOrgId()` qui extrait l'orgId depuis la session, jamais depuis le client. La navigation masque les éléments admin selon le rôle utilisateur. Des vérifications explicites empêchent l'injection d'orgId par le client dans les routes API de mutation.

---

## Table des Forces (Points OK)

| Point | État | Preuve dans le code |
|-------|------|---------------------|
| **Allowlist vérifiée avant inscription** | ✅ | `src/app/api/auth/register/route.ts:55` - `isEmailAllowedForAdmin()` appelé AVANT création |
| **Webhook ne crée jamais USER** | ✅ | `src/app/api/auth/webhook/user-created/route.ts:155` - Commentaire explicite + log warning si email non autorisé |
| **Webhook idempotent** | ✅ | `src/app/api/auth/webhook/user-created/route.ts:134` - Vérifie si rôle déjà défini avant modification |
| **requireAdmin() strict** | ✅ | `src/lib/auth/permissions.ts:23-36` - Vérifie `role === "ADMIN"` explicitement, throw si undefined ou non-ADMIN |
| **requireSession() utilisé** | ✅ | Routes API GET protégées : `src/app/api/clients/route.ts:27`, `src/app/api/clients/[id]/route.ts:24` |
| **orgId jamais accepté du client** | ✅ | Vérifications explicites : `src/app/api/clients/route.ts:92`, `src/app/api/clients/[id]/route.ts:91`, `src/app/api/settings/admin-allowed-emails/route.ts:67` |
| **getCurrentOrgId() source de vérité** | ✅ | Toutes les routes API utilisent `getCurrentOrgId()` : `src/app/api/clients/route.ts:28`, `src/app/api/templates/route.ts:32` |
| **Navigation filtrée par rôle** | ✅ | `src/components/sidebar/SidebarNav.tsx:34` - Settings ajouté uniquement si `userRole === "ADMIN"` |
| **Pages protégées avec requireAdmin** | ✅ | `src/app/(dashboard)/clients/nouveau/page.tsx:17`, `src/app/(dashboard)/settings/admins/page.tsx:22` |
| **Rôle validé strictement** | ✅ | `src/lib/auth/session.ts:38` - Validation : `(role === "ADMIN" || role === "USER") ? role : undefined` |
| **Pas de fallback ADMIN automatique** | ✅ | `src/lib/auth/session.ts:34` - Commentaire explicite + code : pas de fallback |
| **Middleware protège routes dashboard** | ✅ | `middleware.ts:47` - Routes `/dashboard`, `/clients`, `/offers`, `/templates` protégées |
| **Queries DB filtrées par orgId** | ✅ | Toutes les queries utilisent orgId : `src/lib/db/queries/adminAllowedEmails.ts:40`, `src/lib/db/queries/clients.ts:38` |

---

## Table des Risques / Anomalies

| Risque | Gravité | Localisation | Description |
|--------|---------|--------------|-------------|
| **assignInitialRoleForNewUser retourne "USER" théorique** | ⚠️ Moyen | `src/lib/auth/adminAllowlist.ts:58` | La fonction retourne `'USER'` si email non autorisé, mais cette valeur n'est jamais utilisée car l'inscription est bloquée avant |
| **Route API offers/[id] PATCH non protégée par requireAdmin** | 🔴 Élevé | `src/app/api/offers/[id]/route.ts:60` | La route PATCH modifie des offres sans vérifier `requireAdmin()`, seulement `getCurrentOrgId()` |
| **Route API dashboard/summary non protégée** | 🟡 Moyen | `src/app/api/dashboard/summary/route.ts:14` | Route GET accessible sans `requireSession()` explicite (dépend du middleware) |
| **Route API templates GET non protégée** | 🟡 Moyen | `src/app/api/templates/route.ts:30` | Route GET accessible sans `requireSession()` explicite (dépend du middleware) |
| **Route API offers/[id] GET non protégée** | 🟡 Moyen | `src/app/api/offers/[id]/route.ts:10` | Route GET accessible sans `requireSession()` explicite (dépend du middleware) |
| **Webhook secret optionnel** | 🟡 Moyen | `src/app/api/auth/webhook/user-created/route.ts:66` | Le secret webhook est vérifié seulement si `webhookSecret` est défini, sinon skip |
| **assignInitialRoleForNewUser peut retourner USER** | 🟡 Moyen | `src/lib/auth/adminAllowlist.ts:56` | La fonction retourne `'USER'` si email non autorisé, mais cette logique n'est jamais atteinte car inscription bloquée |
| **DEFAULT_ORG_ID requis mais peut être undefined** | 🟡 Moyen | `src/lib/config/org.ts:29` | `DEFAULT_ORG_ID` peut être `undefined`, mais `getRequiredDefaultOrgId()` throw si non défini |
| **getCurrentOrgId() fallback sur DEFAULT_ORG_ID** | 🟡 Moyen | `src/lib/auth/session.ts:226` | Si session.orgId manquant, utilise `DEFAULT_ORG_ID` si défini, sinon throw |
| **Type Role inclut USER mais jamais créé** | 🟡 Info | `src/types/domain.ts:66` | Le type `Role` inclut `"USER"` mais aucun chemin de code ne crée un utilisateur avec ce rôle |

---

## Analyse Détaillée Point par Point

### 1. Authentification Supabase

**État réel** :
- Utilisation de `@supabase/ssr` avec `createServerClient` pour Server Components (`src/lib/supabase/server.ts:28`)
- Utilisation de `createServerClient` dans middleware avec gestion des cookies (`src/lib/auth/session.ts:75`)
- Validation JWT via `getUser()` au lieu de `getSession()` pour vérifier expiration (`src/lib/auth/session.ts:28`)

**Constats** :
- ✅ Validation JWT correcte avec `getUser()`
- ✅ Gestion des cookies compatible SSR
- ✅ Pas de fallback automatique sur rôle ADMIN

**Risques identifiés** :
- Aucun risque critique identifié dans l'implémentation de l'authentification Supabase

---

### 2. Gestion des Rôles (ADMIN uniquement ou USER théorique)

**État réel** :
- Type `Role` défini comme `"ADMIN" | "USER"` (`src/types/domain.ts:66`)
- Rôle extrait depuis `user.user_metadata?.role` (`src/lib/auth/session.ts:36`)
- Validation stricte : `(role === "ADMIN" || role === "USER") ? role : undefined` (`src/lib/auth/session.ts:38`)
- Pas de fallback automatique vers ADMIN (`src/lib/auth/session.ts:34`)

**Constats** :
- ✅ Rôle validé strictement avant utilisation
- ✅ Pas de fallback automatique
- ⚠️ Type inclut `"USER"` mais aucun chemin de code ne crée un USER

**Risques identifiés** :
- Le type `Role` inclut `"USER"` mais ce rôle n'est jamais créé dans le système actuel

---

### 3. Allowlist et Processus d'Inscription

**État réel** :
- Table `admin_allowed_emails` avec contrainte unique `(org_id, email)` (`src/lib/db/schema.ts:77`)
- Vérification allowlist AVANT création : `isEmailAllowedForAdmin()` appelé ligne 55 de `src/app/api/auth/register/route.ts`
- Si email non autorisé → retourne 403 avec message `EMAIL_NOT_ALLOWED` (`src/app/api/auth/register/route.ts:58`)
- Rôle attribué : `assignInitialRoleForNewUser()` retourne `'ADMIN'` si autorisé (`src/lib/auth/adminAllowlist.ts:58`)

**Constats** :
- ✅ Inscription 100% réservée à l'allowlist
- ✅ Vérification avant toute création de compte
- ⚠️ `assignInitialRoleForNewUser()` retourne théoriquement `'USER'` si non autorisé, mais cette branche n'est jamais atteinte

**Risques identifiés** :
- Aucun risque critique : l'inscription est bien bloquée avant création si email non autorisé

---

### 4. Webhook user-created

**État réel** :
- Route `/api/auth/webhook/user-created` (`src/app/api/auth/webhook/user-created/route.ts`)
- Vérification secret webhook optionnelle (`src/app/api/auth/webhook/user-created/route.ts:66`)
- Idempotence : vérifie si rôle déjà défini avant modification (`src/app/api/auth/webhook/user-created/route.ts:134`)
- Si email non autorisé : ne PAS attribuer de rôle, logger warning (`src/app/api/auth/webhook/user-created/route.ts:154-171`)
- Si email autorisé : attribuer rôle ADMIN (`src/app/api/auth/webhook/user-created/route.ts:175`)

**Constats** :
- ✅ Webhook ne crée jamais de rôle USER
- ✅ Webhook idempotent
- ⚠️ Secret webhook optionnel (vérifié seulement si défini)

**Risques identifiés** :
- Secret webhook optionnel : si non défini, le webhook accepte toutes les requêtes

---

### 5. Guards (requireSession / requireAdmin)

**État réel** :
- `requireSession()` : throw si session null (`src/lib/auth/session.ts:170-176`)
- `requireAdmin()` : vérifie `session.user.role === "ADMIN"` explicitement (`src/lib/auth/permissions.ts:32`)
- `requireAdmin()` throw si rôle undefined (`src/lib/auth/permissions.ts:27`)
- Utilisation dans routes API : `src/app/api/clients/route.ts:86`, `src/app/api/templates/route.ts:76`
- Utilisation dans pages : `src/app/(dashboard)/clients/nouveau/page.tsx:17`, `src/app/(dashboard)/settings/admins/page.tsx:22`

**Constats** :
- ✅ `requireAdmin()` strict : vérifie explicitement `role === "ADMIN"`
- ✅ Pas de fallback automatique
- ✅ Utilisé de manière cohérente dans les routes critiques

**Risques identifiés** :
- Aucun risque critique identifié dans les guards

---

### 6. Multi-tenant et Gestion du orgId

**État réel** :
- `getCurrentOrgId()` extrait orgId depuis session (`src/lib/auth/session.ts:216-232`)
- Fallback sur `DEFAULT_ORG_ID` si session.orgId manquant (`src/lib/auth/session.ts:226`)
- Toutes les routes API utilisent `getCurrentOrgId()` : `src/app/api/clients/route.ts:28`, `src/app/api/templates/route.ts:32`
- Vérifications explicites pour rejeter orgId du client : `src/app/api/clients/route.ts:92`, `src/app/api/clients/[id]/route.ts:91`
- Toutes les queries DB filtrées par orgId : `src/lib/db/queries/clients.ts:38`, `src/lib/db/queries/adminAllowedEmails.ts:28`

**Constats** :
- ✅ orgId jamais accepté depuis le client
- ✅ Vérifications explicites dans routes de mutation
- ✅ Queries DB filtrées par orgId
- ⚠️ Fallback sur `DEFAULT_ORG_ID` si session.orgId manquant

**Risques identifiés** :
- Fallback sur `DEFAULT_ORG_ID` : si un utilisateur n'a pas d'orgId dans sa session, le système utilise `DEFAULT_ORG_ID` au lieu de throw

---

### 7. Navigation + Pages Protégées

**État réel** :
- Middleware protège routes `/dashboard`, `/clients`, `/offers`, `/templates` (`middleware.ts:47`)
- Redirection vers login si pas de session (`middleware.ts:50`)
- Navigation filtrée par rôle : Settings ajouté uniquement si `userRole === "ADMIN"` (`src/components/sidebar/SidebarNav.tsx:34`)
- Pages protégées avec `requireAdmin()` : `src/app/(dashboard)/clients/nouveau/page.tsx:17`, `src/app/(dashboard)/settings/admins/page.tsx:22`
- Redirection vers login en cas d'erreur (`src/app/(dashboard)/clients/nouveau/page.tsx:24`)

**Constats** :
- ✅ Middleware protège les routes dashboard
- ✅ Navigation masque les éléments admin selon rôle
- ✅ Pages protégées utilisent `requireAdmin()`

**Risques identifiés** :
- Aucun risque critique identifié dans la navigation et les pages protégées

---

### 8. API Routes Sensibles

**État réel** :
- Routes protégées par `requireAdmin()` :
  - `POST /api/clients` (`src/app/api/clients/route.ts:86`)
  - `PATCH /api/clients/[id]` (`src/app/api/clients/[id]/route.ts:76`)
  - `DELETE /api/clients/[id]` (`src/app/api/clients/[id]/route.ts:163`)
  - `POST /api/templates` (`src/app/api/templates/route.ts:76`)
  - `GET /api/settings/admin-allowed-emails` (`src/app/api/settings/admin-allowed-emails/route.ts:24`)
  - `POST /api/settings/admin-allowed-emails` (`src/app/api/settings/admin-allowed-emails/route.ts:60`)
  - `DELETE /api/settings/admin-allowed-emails` (`src/app/api/settings/admin-allowed-emails/route.ts:134`)

- Routes protégées par `requireSession()` :
  - `GET /api/clients` (`src/app/api/clients/route.ts:27`)
  - `GET /api/clients/[id]` (`src/app/api/clients/[id]/route.ts:24`)

- Routes sans protection explicite (dépendent du middleware) :
  - `GET /api/templates` (`src/app/api/templates/route.ts:30`)
  - `GET /api/dashboard/summary` (`src/app/api/dashboard/summary/route.ts:14`)
  - `GET /api/offers/[id]` (`src/app/api/offers/[id]/route.ts:10`)
  - `PATCH /api/offers/[id]` (`src/app/api/offers/[id]/route.ts:60`)

**Constats** :
- ✅ Routes de mutation protégées par `requireAdmin()`
- ✅ Routes GET protégées par `requireSession()` ou middleware
- 🔴 Route `PATCH /api/offers/[id]` non protégée par `requireAdmin()`

**Risques identifiés** :
- Route `PATCH /api/offers/[id]` modifie des offres sans vérifier `requireAdmin()`, seulement `getCurrentOrgId()`

---

### 9. Server Components / Client Components et Logique Associée

**État réel** :
- Server Components utilisent `getSession()` : `src/app/(dashboard)/layout.tsx:13`
- Rôle passé aux Client Components : `src/app/(dashboard)/layout.tsx:16`
- Client Components utilisent le rôle pour filtrer la navigation : `src/components/sidebar/SidebarNav.tsx:34`
- Pas de logique de permission côté client pour les actions critiques

**Constats** :
- ✅ Rôle extrait côté serveur
- ✅ Navigation filtrée côté client selon rôle
- ✅ Actions critiques protégées côté serveur

**Risques identifiés** :
- Aucun risque critique identifié dans la séparation Server/Client Components

---

### 10. Cohérence UI/UX vs Permissions

**État réel** :
- Navigation masque Settings si `userRole !== "ADMIN"` (`src/components/sidebar/SidebarNav.tsx:34`)
- Pages protégées redirigent si non autorisé (`src/app/(dashboard)/clients/nouveau/page.tsx:24`)
- Pas de boutons/actions visibles pour les non-admins sur les pages protégées

**Constats** :
- ✅ UI masque les éléments admin selon rôle
- ✅ Pages protégées redirigent si non autorisé
- ✅ Pas de divergence UI/permissions identifiée

**Risques identifiés** :
- Aucun risque critique identifié dans la cohérence UI/UX vs permissions

---

### 11. Sécurité Globale (Manipulabilité, Contournements Possibles)

**État réel** :
- orgId jamais accepté depuis le client : vérifications explicites (`src/app/api/clients/route.ts:92`)
- Rôle vérifié côté serveur uniquement
- Webhook vérifie secret si défini (`src/app/api/auth/webhook/user-created/route.ts:66`)
- Inscription bloquée si email non autorisé (`src/app/api/auth/register/route.ts:56`)

**Constats** :
- ✅ orgId protégé contre injection client
- ✅ Rôle vérifié côté serveur
- ⚠️ Secret webhook optionnel
- ✅ Inscription réservée à l'allowlist

**Risques identifiés** :
- Secret webhook optionnel : si non défini, le webhook accepte toutes les requêtes
- Route `PATCH /api/offers/[id]` modifie des offres sans vérifier `requireAdmin()`

---

### 12. Vérification Alignement Modèle Produit (Inscription Réservée + Admin-Only)

**État réel** :
- Inscription réservée à l'allowlist : ✅ (`src/app/api/auth/register/route.ts:55`)
- Webhook ne crée jamais USER : ✅ (`src/app/api/auth/webhook/user-created/route.ts:155`)
- Seul chemin de création : `/api/auth/register` qui vérifie allowlist : ✅
- Routes critiques utilisent `requireAdmin()` : ✅ (sauf `PATCH /api/offers/[id]`)
- Multi-tenant hermétique : ✅ (orgId jamais accepté du client)

**Constats** :
- ✅ Inscription 100% réservée à l'allowlist
- ✅ Un seul chemin de création d'utilisateur (via `/api/auth/register`)
- ✅ Webhook conforme (ne crée jamais USER)
- ⚠️ Route `PATCH /api/offers/[id]` non protégée par `requireAdmin()`
- ✅ Multi-tenant hermétique

**Risques identifiés** :
- Route `PATCH /api/offers/[id]` modifie des offres sans vérifier `requireAdmin()`

---

## Conclusion

### État Général

Le système implémente un modèle d'authentification strict avec allowlist pour les inscriptions. L'inscription est effectivement réservée à l'allowlist, avec vérification avant toute création de compte. Le webhook `user-created` ne crée jamais de rôle USER et n'attribue un rôle ADMIN que si l'email est autorisé. Les guards `requireSession` et `requireAdmin` sont utilisés de manière cohérente dans la plupart des routes critiques. Le multi-tenant est géré de manière hermétique avec `getCurrentOrgId()` qui extrait l'orgId depuis la session, jamais depuis le client.

### Risques Résiduels

1. **Route `PATCH /api/offers/[id]` non protégée par `requireAdmin()`** : Cette route modifie des offres sans vérifier les permissions admin, seulement l'orgId. Un utilisateur authentifié pourrait modifier des offres de son organisation sans être admin.

2. **Secret webhook optionnel** : Si `AUTH_WEBHOOK_SECRET` n'est pas défini, le webhook accepte toutes les requêtes sans authentification. Cela permet potentiellement à un attaquant de déclencher le webhook depuis l'extérieur.

3. **Fallback sur `DEFAULT_ORG_ID`** : Si un utilisateur n'a pas d'orgId dans sa session, le système utilise `DEFAULT_ORG_ID` au lieu de throw une erreur. Cela pourrait permettre à un utilisateur sans orgId d'accéder aux données de l'organisation par défaut.

4. **Type `Role` inclut `"USER"` mais jamais créé** : Le type inclut `"USER"` mais aucun chemin de code ne crée un utilisateur avec ce rôle. Cela crée une incohérence entre le type et l'implémentation réelle.

### Constats Finaux

- ✅ **Inscription réservée à l'allowlist** : Confirmé dans le code
- ✅ **Un seul chemin de création d'utilisateur** : `/api/auth/register` vérifie l'allowlist
- ✅ **Webhook conforme** : Ne crée jamais USER, attribue ADMIN seulement si autorisé
- ✅ **Routes critiques protégées** : La plupart utilisent `requireAdmin()` (sauf `PATCH /api/offers/[id]`)
- ✅ **Multi-tenant hermétique** : orgId jamais accepté du client
- ✅ **Cohérence guards → pages → navigation → API** : Cohérence globale respectée

---

**Fin de l'audit**

