# 🔍 AUDIT COMPLET : Système de Rôles & Allowlist Admin

**Date :** 2024  
**Scope :** Rôles (ADMIN/USER), allowlist admin, flow d'inscription, Settings Admin, navigation, multi-tenant

---

## 1️⃣ RÉSUMÉ GLOBAL

Le système implémente une gestion de rôles basée sur une allowlist d'emails autorisés à devenir ADMIN. Lors de l'inscription, si l'email est présent dans `admin_allowed_emails` pour l'organisation courante, l'utilisateur reçoit le rôle "ADMIN", sinon "USER". Une page Settings Admin permet aux admins de gérer cette allowlist. La navigation affiche le menu "Settings" uniquement pour les ADMIN.

**État actuel :** Architecture bien pensée mais **non complètement branchée**. Le composant d'inscription côté client (`AuthRegister.tsx`) utilise toujours `supabase.auth.signUp()` directement sans passer par l'API route `/api/auth/register`, ce qui signifie que l'attribution automatique du rôle ne fonctionne pas actuellement. De plus, plusieurs fallbacks "ADMIN" silencieux créent un risque de sécurité.

---

## 2️⃣ CE QUI EST OK ✅

### Base de données / Drizzle

✅ **Table `admin_allowed_emails`** (`src/lib/db/schema.ts:68-78`)
- Structure cohérente avec le reste du schéma
- Contrainte unique composite `(org_id, email)` correctement définie
- Colonnes nécessaires présentes : `id`, `org_id`, `email`, `created_by`, `created_at`, `used_at`
- Types cohérents (text, timestamp avec timezone)
- Compatible multi-tenant avec `org_id.notNull()`

### Queries

✅ **`src/lib/db/queries/adminAllowedEmails.ts`**
- `listAdminAllowedEmails()` : Filtrage strict par `org_id`, tri par date décroissante
- `addAdminAllowedEmail()` : Normalisation email (trim + toLowerCase), gestion erreur duplicate claire
- `deleteAdminAllowedEmail()` : Double filtrage `(id, org_id)` pour sécurité multi-tenant
- `markAdminEmailAsUsed()` : Idempotente, normalisation email
- Toutes les fonctions valident `orgId` non vide
- Gestion d'erreurs cohérente avec le reste du projet

### API Route Settings

✅ **`src/app/api/settings/admin-allowed-emails/route.ts`**
- **GET** : `requireAdmin()` + `getCurrentOrgId()` ✅
- **POST** : `requireAdmin()` + `getCurrentOrgId()` + validation email + normalisation ✅
- **DELETE** : `requireAdmin()` + `getCurrentOrgId()` + validation id ✅
- Vérification explicite que `org_id`/`orgId` n'est pas dans le body (sécurité)
- Gestion d'erreurs cohérente (400/401/404/500)
- Messages d'erreur en français

### Page Settings Admin

✅ **`src/app/(dashboard)/settings/admins/page.tsx`**
- `requireAdmin()` au début ✅
- `getCurrentOrgId()` utilisé ✅
- Appel direct aux queries côté serveur (pas de fetch inutile) ✅
- Redirection appropriée en cas d'erreur

✅ **`src/app/(dashboard)/settings/admins/AdminAllowedEmailsClient.tsx`**
- Formulaire d'ajout fonctionnel
- Liste avec toutes les colonnes (email, créé par, dates, used_at)
- Suppression avec confirmation
- Utilise `fetch` vers l'API (cohérent avec `ClientsTableSection`)
- Synchronisation automatique après `router.refresh()`
- UX correcte (loading states, toasts)

### Sidebar & Navigation

✅ **Chaîne de passage du rôle :**
- `layout.tsx` → récupère `session?.user.role`
- `AppShell.tsx` → prop `userRole` ajoutée et passée à `Sidebar`
- `Sidebar.tsx` → prop `userRole` passée à `SidebarNav`
- `SidebarNav.tsx` → condition `userRole === "ADMIN"` pour afficher Settings ✅

✅ **Aucun autre onglet impacté** : Dashboard, Clients, Templates, Offres restent visibles pour tous

### Helpers Auth

✅ **`src/lib/auth/adminAllowlist.ts`**
- `isEmailAllowedForAdmin()` : Normalisation, fallback DEFAULT_ORG_ID, fail-safe (retourne false en cas d'erreur)
- `assignInitialRoleForNewUser()` : Logique claire ADMIN/USER
- `markEmailAsUsedIfAdmin()` : Vérifie d'abord si email est dans allowlist avant de marquer

### API Route Register (code)

✅ **`src/app/api/auth/register/route.ts`**
- Normalisation email ✅
- Lookup dans allowlist via `assignInitialRoleForNewUser()` ✅
- Attribution rôle dans `user_metadata` ✅
- Appel à `markEmailAsUsedIfAdmin()` si admin ✅
- Gère les deux cas (avec/sans service key)

✅ **`src/app/api/auth/webhook/user-created/route.ts`**
- Webhook bien structuré pour mise à jour post-inscription
- Vérifie si rôle déjà défini (idempotent)
- Supporte différents formats de payload

---

## 3️⃣ CE QUI EST À REVOIR ⚠️

### 🔴 BLOQUANT : Flow d'inscription non branché

**Fichier :** `src/app/authentication/auth/AuthRegister.tsx:37-45`

**Problème :** Le composant d'inscription utilise toujours `supabase.auth.signUp()` directement côté client, **sans passer par `/api/auth/register`**. Cela signifie que :
- L'attribution automatique du rôle basée sur l'allowlist **ne fonctionne pas**
- Le rôle n'est pas défini dans `user_metadata` lors de l'inscription
- `markEmailAsUsedIfAdmin()` n'est jamais appelé

**Impact :** Tous les nouveaux utilisateurs sont créés sans rôle défini, et le système utilise les fallbacks "ADMIN" partout.

**Solution attendue :** Modifier `AuthRegister.tsx` pour appeler `/api/auth/register` au lieu de `supabase.auth.signUp()` directement.

---

### ⚠️ CRITIQUE : Fallbacks "ADMIN" silencieux

**Fichiers concernés :**

1. **`src/lib/auth/permissions.ts:25`**
   ```typescript
   const userRole = session.user.role || "ADMIN";
   ```
   **Problème :** Si `role` est `undefined`, l'utilisateur est considéré comme ADMIN par défaut. Cela contourne la sécurité.

2. **`src/lib/auth/session.ts:36` et `94`**
   ```typescript
   const role = (user.user_metadata?.role as Role) || "ADMIN";
   ```
   **Problème :** Même fallback silencieux. Un utilisateur sans rôle devient ADMIN automatiquement.

3. **`src/app/(dashboard)/layout.tsx:14`**
   ```typescript
   const userRole: Role | undefined = session?.user.role || "ADMIN"
   ```
   **Problème :** Fallback pour la navigation. Moins critique mais incohérent.

**Impact sécurité :** Un utilisateur créé sans rôle (ex: via l'inscription actuelle) devient ADMIN par défaut, ce qui est une faille majeure.

**Solution :** 
- Supprimer tous les fallbacks "ADMIN"
- Forcer l'attribution explicite du rôle lors de l'inscription
- Si rôle manquant → considérer comme "USER" (plus restrictif) ou throw une erreur

---

### ⚠️ INCOHÉRENCE : Webhook non configuré

**Fichier :** `src/app/api/auth/webhook/user-created/route.ts`

**Problème :** Le webhook existe mais n'est probablement pas configuré dans Supabase Dashboard. Si l'inscription se fait toujours côté client, ce webhook devrait être configuré comme :
- Database Trigger sur `auth.users` (INSERT)
- Ou Auth Hook dans Supabase Dashboard > Authentication > Hooks

**Impact :** Si l'inscription passe par le client directement, le rôle ne sera jamais attribué automatiquement.

**Solution :** 
- Soit configurer le webhook dans Supabase
- Soit modifier `AuthRegister.tsx` pour utiliser `/api/auth/register` (solution préférée)

---

### ⚠️ MINOR : Normalisation email dans `isEmailAllowedForAdmin`

**Fichier :** `src/lib/auth/adminAllowlist.ts:35-36`

**Problème :** Double normalisation :
```typescript
const normalizedEmail = email.trim().toLowerCase();
// ...
return allowedEmails.some(
  (allowedEmail) => allowedEmail.email.toLowerCase() === normalizedEmail
);
```
Les emails dans la DB sont déjà normalisés (via `addAdminAllowedEmail`), donc le `.toLowerCase()` sur `allowedEmail.email` est redondant.

**Impact :** Performance mineure (négligeable).

**Solution :** Retirer le `.toLowerCase()` sur `allowedEmail.email` car déjà normalisé en DB.

---

### ⚠️ MINOR : Validation email côté client

**Fichier :** `src/app/(dashboard)/settings/admins/AdminAllowedEmailsClient.tsx:48-50`

**Problème :** Validation basique (`!email.trim()`). Pas de validation de format email côté client.

**Impact :** UX (erreur retournée après appel API au lieu de validation immédiate).

**Solution :** Ajouter validation format email avec regex ou utiliser un composant Input type="email" avec validation HTML5.

---

## 4️⃣ RISQUES / FAILLES POTENTIELLES 🔥

### 🔥 CRITIQUE : Escalade de privilèges silencieuse

**Risque :** Les fallbacks "ADMIN" dans `requireAdmin()` et `getAuthenticatedUser()` permettent à un utilisateur sans rôle défini d'obtenir les droits ADMIN.

**Fichiers :**
- `src/lib/auth/permissions.ts:25`
- `src/lib/auth/session.ts:36, 94`

**Scénario d'attaque :**
1. Utilisateur s'inscrit via `AuthRegister.tsx` (sans passer par `/api/auth/register`)
2. Aucun rôle n'est défini dans `user_metadata`
3. Lors de la connexion, `getAuthenticatedUser()` retourne `role = "ADMIN"` (fallback)
4. `requireAdmin()` valide car `userRole = "ADMIN"`
5. L'utilisateur accède aux fonctionnalités ADMIN

**Gravité :** 🔴 CRITIQUE

**Mitigation immédiate :** Supprimer tous les fallbacks "ADMIN", forcer l'attribution explicite du rôle.

---

### 🔥 ÉLEVÉ : Inscription sans attribution de rôle

**Risque :** Le flow d'inscription actuel (`AuthRegister.tsx`) ne définit pas le rôle, créant des utilisateurs "orphelins".

**Fichier :** `src/app/authentication/auth/AuthRegister.tsx:37-45`

**Impact :** 
- Tous les nouveaux utilisateurs créés via cette route n'ont pas de rôle
- Dépendance totale sur les fallbacks "ADMIN" (qui sont un problème)
- L'allowlist n'est jamais utilisée

**Gravité :** 🔴 CRITIQUE (car combiné avec les fallbacks)

---

### ⚠️ MOYEN : orgId manquant lors de l'inscription

**Fichiers :**
- `src/app/api/auth/register/route.ts:43`
- `src/app/api/auth/webhook/user-created/route.ts:111`

**Problème :** Utilise `DEFAULT_ORG_ID` directement au lieu de le récupérer dynamiquement. Si `DEFAULT_ORG_ID` n'est pas configuré, `orgId` sera `undefined`.

**Impact :** 
- `assignInitialRoleForNewUser()` retournera `false` si `orgId` manquant (fail-safe dans `isEmailAllowedForAdmin`)
- Tous les nouveaux utilisateurs deviendront "USER" même s'ils sont dans l'allowlist
- Pas d'erreur visible, juste un comportement silencieux

**Gravité :** ⚠️ MOYEN (fail-safe présent mais comportement non désiré)

**Mitigation :** Vérifier que `DEFAULT_ORG_ID` est configuré, ou utiliser `getCurrentOrgId()` si session disponible.

---

### ⚠️ MOYEN : Duplication d'email possible entre orgs

**Fichier :** `src/lib/db/schema.ts:77`

**Statut :** ✅ Contrainte unique composite `(org_id, email)` présente, donc **pas de risque réel**.

**Note :** La contrainte DB garantit qu'un même email peut exister dans plusieurs orgs, mais pas deux fois dans la même org. C'est le comportement attendu pour le multi-tenant.

---

### ⚠️ FAIBLE : Route webhook non protégée

**Fichier :** `src/app/api/auth/webhook/user-created/route.ts`

**Problème :** Pas de vérification de signature/secret pour valider que la requête vient bien de Supabase.

**Impact :** Si l'URL du webhook est découverte, un attaquant pourrait appeler cette route directement pour modifier des rôles.

**Gravité :** ⚠️ FAIBLE (nécessite connaissance de l'URL + payload correct)

**Mitigation :** Ajouter vérification d'un secret partagé ou signature Supabase.

---

### ⚠️ FAIBLE : Race condition sur `markAdminEmailAsUsed`

**Fichier :** `src/lib/db/queries/adminAllowedEmails.ts:138-157`

**Problème :** Si deux utilisateurs s'inscrivent simultanément avec le même email autorisé, `markAdminEmailAsUsed()` pourrait être appelé deux fois. La fonction est idempotente mais utilise `NOW()` qui pourrait donner des timestamps légèrement différents.

**Impact :** Négligeable (dernière mise à jour gagne, pas de corruption de données).

**Gravité :** ⚠️ FAIBLE

---

## 5️⃣ LISTE D'ACTIONS

### 🔴 BLOQUANT (à faire immédiatement)

1. **Modifier `AuthRegister.tsx` pour utiliser `/api/auth/register`**
   - Remplacer `supabase.auth.signUp()` par un appel `fetch('/api/auth/register')`
   - Gérer la réponse (user créé, redirection vers login)
   - Tester le flow complet

2. **Supprimer tous les fallbacks "ADMIN" silencieux**
   - `src/lib/auth/permissions.ts:25` → throw si `role` undefined
   - `src/lib/auth/session.ts:36, 94` → retourner "USER" ou throw si `role` undefined
   - `src/app/(dashboard)/layout.tsx:14` → gérer le cas `undefined` explicitement

3. **Forcer l'attribution du rôle lors de l'inscription**
   - S'assurer que `/api/auth/register` est toujours appelé
   - Vérifier que `user_metadata.role` est toujours défini après création
   - Ajouter un test pour vérifier qu'un utilisateur sans rôle ne peut pas se connecter

---

### ⚠️ IMPORTANT (à faire rapidement)

4. **Configurer le webhook Supabase (si nécessaire)**
   - Si on garde l'inscription côté client, configurer le webhook dans Supabase Dashboard
   - Ou documenter que l'inscription doit passer par `/api/auth/register`

5. **Valider que `DEFAULT_ORG_ID` est configuré**
   - Ajouter une vérification au démarrage de l'app
   - Ou utiliser `getCurrentOrgId()` si session disponible lors de l'inscription

6. **Ajouter validation email côté client**
   - Dans `AdminAllowedEmailsClient.tsx`, valider le format email avant l'appel API
   - Améliorer l'UX avec feedback immédiat

---

### 💡 OPTIONNEL (améliorations)

7. **Protéger le webhook avec secret**
   - Ajouter vérification d'un secret partagé dans `user-created/route.ts`
   - Documenter la configuration dans Supabase

8. **Optimiser `isEmailAllowedForAdmin`**
   - Retirer le `.toLowerCase()` redondant sur `allowedEmail.email`

9. **Ajouter tests E2E**
   - Test : inscription avec email dans allowlist → rôle ADMIN
   - Test : inscription avec email hors allowlist → rôle USER
   - Test : tentative d'accès Settings par USER → redirection

10. **Documentation**
    - Documenter le flow d'inscription complet
    - Documenter la configuration requise (DEFAULT_ORG_ID, SUPABASE_SERVICE_ROLE_KEY)
    - Ajouter diagramme de flux pour l'attribution des rôles

---

## 📊 RÉSUMÉ DES PRIORITÉS

| Priorité | Action | Fichier(s) | Impact |
|----------|--------|------------|--------|
| 🔴 BLOQUANT | Modifier AuthRegister pour utiliser /api/auth/register | `AuthRegister.tsx` | Sécurité |
| 🔴 BLOQUANT | Supprimer fallbacks "ADMIN" | `permissions.ts`, `session.ts`, `layout.tsx` | Sécurité |
| ⚠️ IMPORTANT | Valider DEFAULT_ORG_ID configuré | `register/route.ts`, `webhook/route.ts` | Fonctionnalité |
| ⚠️ IMPORTANT | Configurer webhook Supabase | Supabase Dashboard | Fonctionnalité |
| 💡 OPTIONNEL | Protéger webhook avec secret | `webhook/route.ts` | Sécurité |

---

## ✅ CHECKLIST FINALE

- [x] Table `admin_allowed_emails` créée avec contraintes
- [x] Queries implémentées et filtrées par org_id
- [x] API route Settings protégée par requireAdmin()
- [x] Page Settings Admin créée et fonctionnelle
- [x] Navigation Settings visible uniquement pour ADMIN
- [x] Helpers auth créés (adminAllowlist.ts)
- [x] API route register créée
- [x] Webhook user-created créé
- [ ] **AuthRegister.tsx modifié pour utiliser /api/auth/register** ❌
- [ ] **Fallbacks "ADMIN" supprimés** ❌
- [ ] **Webhook configuré dans Supabase** ❌
- [ ] Tests E2E ajoutés ❌

---

**Conclusion :** L'architecture est solide et bien pensée, mais le système n'est **pas complètement branché**. Les deux actions bloquantes (modifier AuthRegister et supprimer les fallbacks) sont critiques pour la sécurité. Une fois ces corrections effectuées, le système sera fonctionnel et sécurisé.


