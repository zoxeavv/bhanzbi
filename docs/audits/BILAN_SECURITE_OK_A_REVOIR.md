# ✅ Bilan Sécurité : OK / À revoir

**Date** : 2025-01-27  
**Type** : Bilan / Audit (lecture seule)

---

## 📋 Table des matières

1. [Multi-tenant](#31-multi-tenant)
2. [Rôles](#32-rôles)
3. [Guards & UX](#33-guards--ux)

---

## 3.1. Multi-tenant

### ✅ Toutes les queries Clients et Templates filtrent bien sur org_id

**Statut** : **OK**

**Preuves** :

**Clients** (`src/lib/db/queries/clients.ts`) :
- `listClients(orgId, ...)` : ligne 49 → `eq(clients.org_id, orgId)`
- `getClientById(id, orgId)` : ligne 115 → `and(eq(clients.id, id), eq(clients.org_id, orgId))`
- `createClient(data)` : ligne 144 → `org_id: data.orgId`
- `updateClient(id, orgId, data)` : ligne 183 → `and(eq(clients.id, id), eq(clients.org_id, orgId))`
- `deleteClient(id, orgId)` : ligne 211 → `and(eq(clients.id, id), eq(clients.org_id, orgId))`
- `countClients(orgId)` : ligne 204 → `eq(clients.org_id, orgId)`
- `getClientsWithOffersCount(orgId)` : ligne 239 → `eq(clients.org_id, orgId)`

**Templates** (`src/lib/db/queries/templates.ts`) :
- `listTemplates(orgId)` : ligne 25 → `eq(templates.org_id, orgId)`
- `getTemplateById(id, orgId)` : ligne 45 → `and(eq(templates.id, id), eq(templates.org_id, orgId))`
- `getTemplateBySlug(slug, orgId)` : ligne 78 → `and(eq(templates.slug, slug), eq(templates.org_id, orgId))`
- `createTemplate(data)` : ligne 123 → `org_id: data.orgId`
- `updateTemplate(id, orgId, data)` : ligne 177 → `and(eq(templates.id, id), eq(templates.org_id, orgId))`
- `countTemplates(orgId)` : ligne 199 → `eq(templates.org_id, orgId)`

**Offers** (`src/lib/db/queries/offers.ts`) :
- Toutes les fonctions filtrent également sur `org_id`

**Conclusion** : ✅ Toutes les queries filtrent systématiquement sur `org_id` pour l'isolation multi-tenant.

---

### ✅ orgId vient toujours du serveur (getCurrentOrgId), jamais d'un paramètre client

**Statut** : **OK**

**Preuves** :

**Source unique** : `src/lib/auth/session.ts` (lignes 211-227)
- `getCurrentOrgId()` est la seule fonction pour récupérer l'orgId
- Documenté comme "SEULE source de vérité" (ligne 187)

**Utilisation dans les pages** :
- `src/app/(dashboard)/clients/page.tsx` : ligne 25 → `const orgId = await getCurrentOrgId();`
- `src/app/(dashboard)/templates/page.tsx` : ligne 11 → `const orgId = await getCurrentOrgId();`
- Toutes les pages utilisent `getCurrentOrgId()`, jamais de paramètre client

**Utilisation dans les API routes** :
- `src/app/api/clients/route.ts` : lignes 28, 87 → `const orgId = await getCurrentOrgId();`
- `src/app/api/templates/route.ts` : lignes 31, 73 → `const orgId = await getCurrentOrgId();`
- Toutes les API routes utilisent `getCurrentOrgId()`

**Protection explicite** (`src/app/api/clients/route.ts`, lignes 92-96) :
```typescript
// SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Conclusion** : ✅ `orgId` vient toujours de `getCurrentOrgId()` côté serveur, jamais du client. Protection explicite dans les API routes.

---

### ✅ Pas de orgId hardcodé (hors seed / config)

**Statut** : **OK**

**Preuves** :

**Seule exception légitime** : `src/lib/config/org.ts` (ligne 29)
- `DEFAULT_ORG_ID` : Variable d'environnement pour fallback mono-tenant
- Documenté comme configuration légitime (lignes 13-16)

**Vérification** :
- Aucun `orgId` hardcodé trouvé dans les queries (`clients.ts`, `templates.ts`, `offers.ts`)
- Aucun `orgId` hardcodé dans les pages
- Aucun `orgId` hardcodé dans les API routes
- Seulement dans les tests (`__tests__/`) avec des valeurs de test explicites

**Conclusion** : ✅ Pas de `orgId` hardcodé dans le code de production, seulement `DEFAULT_ORG_ID` dans la config (légitime).

---

## 3.2. Rôles

### ✅ Le modèle de rôle (ADMIN / USER / autre) est clair et centralisé

**Statut** : **OK**

**Preuves** :

**Définition centralisée** : `src/types/domain.ts` (ligne 66)
```typescript
export type Role = "ADMIN" | "USER";
```

**Documentation** (lignes 60-65) :
```typescript
/**
 * Rôle utilisateur simple pour le contrôle d'accès
 * 
 * - ADMIN : Accès complet, peut modifier les templates
 * - USER : Accès en lecture seule, ne peut pas modifier les templates
 */
export type Role = "ADMIN" | "USER";
```

**Stockage** : `src/lib/auth/session.ts` (lignes 34-36, 93-94)
- Rôle lu depuis `user.user_metadata?.role` dans Supabase Auth
- Valeur par défaut `"ADMIN"` si non défini (pour compatibilité)

**Conclusion** : ✅ Modèle de rôle clair, centralisé dans `domain.ts`, bien documenté.

---

### ⚠️ Les droits sur la page Clients sont cohérents avec ce modèle (ADMIN-only ou non)

**Statut** : **À revoir**

**Problème identifié** :

**Page Clients** (`src/app/(dashboard)/clients/page.tsx`) :
- ❌ **Pas de vérification de rôle** : Utilise seulement `getCurrentOrgId()` (guard implicite)
- ❌ **Accessible à tous les utilisateurs authentifiés** : ADMIN et USER peuvent y accéder
- ✅ **Onglet toujours visible** : `SidebarNav.tsx` ne filtre pas par rôle (ligne 16)

**API Routes Clients** (`src/app/api/clients/route.ts`) :
- ✅ GET : `requireSession()` (ligne 27) - Accessible à tous les authentifiés
- ✅ POST : `requireAdmin()` (ligne 86) - Réservé aux ADMIN
- ✅ PUT/DELETE : `requireAdmin()` - Réservé aux ADMIN

**Incohérence** :
- **Lecture** : Accessible à tous les utilisateurs authentifiés (ADMIN et USER)
- **Écriture** : Réservée aux ADMIN uniquement
- **Onglet** : Toujours visible (pas de condition de rôle)

**Fichiers concernés** :
- `src/app/(dashboard)/clients/page.tsx` : Pas de guard de rôle
- `src/components/sidebar/SidebarNav.tsx` : Onglet toujours visible
- `src/app/api/clients/route.ts` : Mutations protégées par `requireAdmin()`

**Conclusion** : ⚠️ **À revoir** - Incohérence entre lecture (accessible à tous) et écriture (ADMIN-only). Il faut clarifier si Clients doit être ADMIN-only ou accessible à tous, et ajuster la page et l'onglet en conséquence.

---

### ⚠️ La session contient bien le bon rôle pour l'utilisateur courant

**Statut** : **À revoir**

**Problème identifié** :

**Lecture du rôle** : `src/lib/auth/session.ts` (lignes 34-36, 93-94)
```typescript
const role = (user.user_metadata?.role as Role) || "ADMIN";
```

**Problème** : Fallback `|| "ADMIN"` signifie qu'un utilisateur sans rôle défini sera considéré comme ADMIN.

**Risque** :
- Si un utilisateur USER est créé sans `role` dans `user_metadata`, il sera traité comme ADMIN
- Le guard `requireAdmin()` utilise aussi ce fallback (`permissions.ts`, ligne 25)

**Fichiers concernés** :
- `src/lib/auth/session.ts` : Lignes 34-36, 93-94 (fallback `|| "ADMIN"`)
- `src/lib/auth/permissions.ts` : Ligne 25 (fallback `|| "ADMIN"`)

**Conclusion** : ⚠️ **À revoir** - Le fallback `|| "ADMIN"` est dangereux. Si un utilisateur n'a pas de rôle défini dans `user_metadata`, il sera considéré comme ADMIN par défaut, ce qui peut créer une faille de sécurité.

---

## 3.3. Guards & UX

### ⚠️ requireAdmin / requireAuth sont utilisés au bon endroit (pages/routes, pas seulement dans la nav)

**Statut** : **À revoir**

**Problèmes identifiés** :

**Page Clients** (`src/app/(dashboard)/clients/page.tsx`) :
- ❌ **Pas de guard explicite** : Utilise seulement `getCurrentOrgId()` (guard implicite)
- ⚠️ **Pas de vérification de rôle** : Accessible à tous les utilisateurs authentifiés

**Onglet Clients** (`src/components/sidebar/SidebarNav.tsx`) :
- ❌ **Toujours visible** : Pas de condition de rôle (ligne 16)
- ⚠️ **Pas de vérification côté client** : L'onglet est visible même si l'utilisateur n'a pas les droits

**API Routes** :
- ✅ Utilisent `requireSession()` ou `requireAdmin()` correctement
- ✅ Mutations protégées par `requireAdmin()`

**Server Actions** :
- ✅ Utilisent `requireAdmin()` correctement (templates)

**Fichiers concernés** :
- `src/app/(dashboard)/clients/page.tsx` : Pas de guard explicite
- `src/components/sidebar/SidebarNav.tsx` : Onglet toujours visible
- `src/app/api/clients/route.ts` : Guards corrects
- `src/app/(dashboard)/templates/actions.ts` : Guards corrects

**Conclusion** : ⚠️ **À revoir** - La page Clients devrait utiliser `requireSession()` ou `requireAdmin()` explicitement. L'onglet devrait être conditionné par le rôle si Clients est ADMIN-only.

---

### ⚠️ Le redirect vers login?error=unauthorized est cohérent avec la policy définie

**Statut** : **À revoir**

**Problèmes identifiés** :

**Incohérence dans les redirections** :

**Middleware** (`middleware.ts`, ligne 50) :
```typescript
return NextResponse.redirect(new URL('/authentication/login', request.url));
//                                                          ↑
//                                    Pas de paramètre ?error=unauthorized
```

**Page Clients** (`src/app/(dashboard)/clients/page.tsx`, ligne 83) :
```typescript
redirect('/authentication/login?error=unauthorized');
//                              ↑
//                    Avec paramètre ?error=unauthorized
```

**Autres pages** :
- `src/app/(dashboard)/templates/page.tsx` : Redirect vers `/login?error=unauthorized` (incohérent avec `/authentication/login`)
- `src/app/(dashboard)/clients/[id]/page.tsx` : Redirect vers `/authentication/login?error=unauthorized`

**Problèmes** :
1. **Deux comportements différents** : Middleware redirige sans paramètre, pages redirigent avec paramètre
2. **Incohérence d'URL** : Certaines pages redirigent vers `/login`, d'autres vers `/authentication/login`
3. **Pas de policy claire** : Aucune documentation sur quand utiliser `?error=unauthorized`

**Fichiers concernés** :
- `middleware.ts` : Ligne 50 (redirect sans paramètre)
- `src/app/(dashboard)/clients/page.tsx` : Ligne 83 (redirect avec paramètre)
- `src/app/(dashboard)/templates/page.tsx` : Ligne 38 (redirect vers `/login`)

**Conclusion** : ⚠️ **À revoir** - Incohérence dans les redirections. Le middleware et les pages utilisent des URLs et paramètres différents. Il faut uniformiser le comportement.

---

### ❌ L'UI affiche un message compréhensible quand error=unauthorized est présent

**Statut** : **À revoir**

**Problème identifié** :

**Page de login** (`src/app/authentication/auth/AuthLogin.tsx`) :
- ❌ **Ne lit pas le paramètre `error`** : Pas de `useSearchParams()` pour lire `?error=unauthorized`
- ❌ **Pas de message affiché** : Aucun affichage conditionnel basé sur le paramètre URL
- ✅ **Affiche seulement les erreurs de soumission** : Ligne 29 (`error` state pour les erreurs de formulaire)

**Code actuel** (lignes 25-30) :
```typescript
const [error, setError] = useState<string | null>(null);
// ...
// Pas de lecture de useSearchParams() pour ?error=unauthorized
```

**Fichiers concernés** :
- `src/app/authentication/auth/AuthLogin.tsx` : Ne lit pas `useSearchParams()`
- `src/app/authentication/login/page.tsx` : Ne passe pas le paramètre au composant

**Conclusion** : ❌ **À revoir** - L'UI n'affiche aucun message quand `?error=unauthorized` est présent dans l'URL. L'utilisateur ne comprend pas pourquoi il a été redirigé vers la page de login.

---

## 📊 Résumé du bilan

### ✅ Points OK

1. **Multi-tenant** : Toutes les queries filtrent sur `org_id` ✅
2. **Multi-tenant** : `orgId` vient toujours du serveur ✅
3. **Multi-tenant** : Pas de `orgId` hardcodé ✅
4. **Rôles** : Modèle clair et centralisé ✅

### ⚠️ Points à revoir

1. **Rôles** : Droits sur Clients incohérents (lecture accessible à tous, écriture ADMIN-only) ⚠️
2. **Rôles** : Fallback `|| "ADMIN"` dangereux (utilisateur sans rôle = ADMIN) ⚠️
3. **Guards** : Page Clients n'utilise pas de guard explicite ⚠️
4. **Guards** : Onglet Clients toujours visible (pas de condition de rôle) ⚠️
5. **UX** : Incohérence dans les redirections (middleware vs pages) ⚠️
6. **UX** : Pas de message d'erreur affiché pour `?error=unauthorized` ❌

---

**Fin du document**

