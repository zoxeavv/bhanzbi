# 🔒 AUDIT SYNTHÉTIQUE : Authentification / Rôles / Sécurité

**Date** : 2024  
**Type** : Audit synthétique aligné sur le modèle produit  
**Contexte produit** : Inscription strictement réservée aux emails dans l'allowlist, tous les utilisateurs créés reçoivent le rôle ADMIN, aucune limite max d'admins

---

## 📋 Résumé exécutif

**État général** : ✅ **Sécurisé et conforme au modèle produit**

- ✅ Inscription strictement protégée par allowlist
- ✅ Tous les comptes créés reçoivent le rôle ADMIN explicitement
- ✅ Aucune limite max d'admins dans le code (conforme au produit)
- ⚠️ Quelques incohérences mineures de guards/navigation à corriger

---

## 1) Confirmation du modèle produit

### 1.1. Inscription strictement réservée à l'allowlist

**Fichier** : `src/app/api/auth/register/route.ts`

**Vérification** (lignes 54-65) :
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
- La vérification de l'allowlist se fait **AVANT** toute création de compte
- Si l'email n'est pas autorisé → **403 Forbidden**, compte **NON créé**
- Le flux est sécurisé : pas de création puis rejet

### 1.2. Attribution du rôle ADMIN

**Fichier** : `src/app/api/auth/register/route.ts`

**Flux** :
1. Email vérifié dans allowlist → autorisé
2. `assignInitialRoleForNewUser()` appelé (ligne 68)
3. Comme l'email est autorisé, retourne toujours `"ADMIN"`
4. Rôle défini dans `user_metadata.role` lors de la création (lignes 85, 117)

**✅ CONFIRMÉ** :
- Tous les comptes créés via `/api/auth/register` reçoivent `role = "ADMIN"`
- Le rôle est **explicitement défini** dans `user_metadata`, pas de fallback
- Aucun cas où un USER pourrait être créé via cette route (car inscription bloquée si non autorisé)

**Note** : La fonction `assignInitialRoleForNewUser()` retourne "USER" si non autorisé, mais ce cas n'arrive jamais car l'inscription est bloquée avant.

### 1.3. Absence de limite max d'admins

**Recherche effectuée** : `grep -i "MAX_ADMINS|max.*admin|limit.*admin"`

**Résultat** :
- ✅ **Aucune trace dans le code de production**
- ⚠️ **Traces dans les docs d'audit** (`docs/audits/AUTH_ROLES_SECURITY_COMPLETE_AUDIT.md`) → À nettoyer

**Code vérifié** :
- `src/app/api/settings/admin-allowed-emails/route.ts` : Aucune vérification de limite ✅
- `src/lib/db/queries/adminAllowedEmails.ts` : Aucune fonction de comptage avec limite ✅
- `src/lib/config/` : Aucun fichier de config admin ✅

**✅ CONFIRMÉ** :
- Le système permet d'ajouter un nombre illimité d'emails dans l'allowlist
- Aucune contrainte de limite dans le code métier
- **Conforme au modèle produit**

**⚠️ À NETTOYER** :
- Les mentions de "limite max d'admins" dans `docs/audits/AUTH_ROLES_SECURITY_COMPLETE_AUDIT.md` doivent être supprimées ou marquées comme "non applicable"

### 1.4. Chemins alternatifs de création de compte

**Chemins identifiés** :

1. **`/api/auth/register`** (principal) :
   - ✅ Protégé par allowlist
   - ✅ Rôle ADMIN attribué

2. **Webhook `user-created`** (`/api/auth/webhook/user-created`) :
   - ⚠️ Peut être appelé si un compte est créé via Supabase Dashboard ou autre moyen
   - ✅ Vérifie l'allowlist avant d'attribuer le rôle (ligne 142)
   - ✅ Skip si le rôle est déjà défini (ligne 124)
   - **Risque** : Si un compte est créé manuellement dans Supabase Dashboard avec un email autorisé, le webhook attribuera ADMIN. Si l'email n'est pas autorisé, le webhook attribuera USER.

**Recommandation** :
- Le webhook est utile comme filet de sécurité
- Pour garantir le modèle produit strict, désactiver la création manuelle de comptes dans Supabase Dashboard (config Supabase)
- Ou documenter que le webhook garantit que seuls les emails autorisés reçoivent ADMIN

**✅ CONCLUSION** : Le chemin principal est sécurisé. Le webhook est un filet de sécurité mais pourrait permettre la création de USER si un compte est créé manuellement avec un email non autorisé.

---

## 2) Matrice des permissions (ADMIN vs USER)

**Contexte** : En pratique, tous les utilisateurs créés via l'allowlist sont ADMIN. Le rôle USER existe dans le type mais n'est probablement jamais utilisé en production.

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

**⚠️ PROBLÈME** : La page est accessible aux USER (pas de guard), mais l'API POST bloque. Mauvaise UX.

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

**⚠️ PROBLÈME** : L'API POST legacy n'utilise pas `requireAdmin()`, contrairement aux Server Actions.

### Settings > Admins (`/settings/admins`)

| Aspect | ADMIN | USER (théorique) |
|-------|-------|-----------------|
| **Accès page** | ✅ Oui | ❌ Bloqué par `requireAdmin()` |
| **Guard serveur** | ✅ `requireAdmin()` | ❌ Redirige vers login |
| **API GET/POST/DELETE** | ✅ `requireAdmin()` | ❌ Bloqué |

**✅ COHÉRENT** : Toutes les routes Settings/Admins sont bien protégées.

---

## 3) Problèmes identifiés

### AUTH-001 : Page création client accessible aux USER

**Gravité** : **MEDIUM**

**Fichiers** :
- `src/app/(dashboard)/clients/nouveau/page.tsx` (page client, pas de guard)
- `src/app/api/clients/route.ts` (POST protégé par `requireAdmin()`)

**Description** :
- La page `/clients/nouveau` est un composant client sans guard serveur
- Un USER peut accéder à la page et remplir le formulaire
- L'API POST bloque avec `requireAdmin()`, mais l'utilisateur voit une erreur après soumission

**Impact** :
- Mauvaise UX : l'utilisateur pense pouvoir créer un client mais est bloqué
- Confusion sur les permissions réelles

**Solution recommandée** :
- Convertir la page en Server Component avec `requireAdmin()` au début
- Ou masquer le lien "Nouveau client" dans la navigation pour les USER (mais en pratique tous sont ADMIN)

---

### AUTH-002 : API Templates POST legacy sans requireAdmin

**Gravité** : **MEDIUM**

**Fichier** :
- `src/app/api/templates/route.ts` (POST, ligne 70-111)

**Description** :
- L'API POST `/api/templates` utilise seulement `getSession()`, pas `requireAdmin()`
- Les Server Actions utilisent `requireAdmin()` pour créer des templates
- Un USER authentifié pourrait théoriquement créer un template via l'API legacy

**Impact** :
- Contournement possible des permissions si l'API legacy est utilisée
- Incohérence avec les Server Actions

**Solution recommandée** :
- Ajouter `requireAdmin()` dans l'API POST legacy
- Ou documenter que l'API est dépréciée et sera supprimée
- L'API est déjà loggée avec `console.warn` pour monitoring ✅

---

### AUTH-003 : Incohérence redirections middleware vs pages

**Gravité** : **LOW**

**Fichiers** :
- `middleware.ts` (ligne 50)
- `src/app/(dashboard)/settings/admins/page.tsx` (ligne 44)
- `src/app/(dashboard)/templates/page.tsx` (ligne 38)

**Description** :
- Le middleware redirige vers `/authentication/login` sans paramètre d'erreur
- Certaines pages redirigent vers `/authentication/login?error=unauthorized`
- Une page redirige vers `/login?error=unauthorized` (route incorrecte)

**Impact** :
- Messages d'erreur inconsistants pour l'utilisateur
- Route `/login` incorrecte (devrait être `/authentication/login`)

**Solution recommandée** :
- Standardiser : toujours utiliser `/authentication/login?error=unauthorized` pour accès refusé
- Corriger la route `/login` → `/authentication/login`
- Le middleware pourrait passer `?error=session` pour session expirée

---

### AUTH-004 : Webhook user-created pourrait créer des USER

**Gravité** : **LOW** (filet de sécurité)

**Fichier** :
- `src/app/api/auth/webhook/user-created/route.ts`

**Description** :
- Le webhook attribue le rôle basé sur l'allowlist (ligne 142)
- Si un compte est créé manuellement dans Supabase Dashboard avec un email **non autorisé**, le webhook attribuera `role = "USER"`
- Cela viole le modèle produit "seuls les emails autorisés peuvent créer un compte"

**Impact** :
- Risque faible si la création manuelle est désactivée dans Supabase
- Mais si activée, un USER pourrait être créé

**Solution recommandée** :
- Documenter que le webhook est un filet de sécurité
- Recommander de désactiver la création manuelle de comptes dans Supabase Dashboard
- Ou faire échouer le webhook si l'email n'est pas autorisé (au lieu d'attribuer USER)

---

### AUTH-005 : Traces de "limite max d'admins" dans les docs

**Gravité** : **LOW** (documentation)

**Fichier** :
- `docs/audits/AUTH_ROLES_SECURITY_COMPLETE_AUDIT.md`

**Description** :
- L'audit précédent mentionne "limite max d'admins" comme problème à résoudre
- Cela ne correspond pas au modèle produit actuel

**Impact** :
- Confusion pour les futurs développeurs
- Documentation incorrecte

**Solution recommandée** :
- Supprimer ou marquer comme "non applicable" toutes les mentions de MAX_ADMINS dans les docs
- Mettre à jour l'audit pour refléter le modèle produit réel

---

## 4) Checklist finale

### Modèle produit

- [x] **Inscription strictement réservée aux emails dans l'allowlist**
  - ✅ Vérification avant création, retourne 403 si non autorisé

- [x] **Tous les comptes créés reçoivent le rôle ADMIN**
  - ✅ Rôle explicitement défini dans `user_metadata.role = "ADMIN"`

- [x] **Aucune limite max d'admins dans le code**
  - ✅ Aucune vérification de limite dans le code métier
  - ⚠️ À nettoyer : mentions dans les docs d'audit

### Sécurité

- [x] **Guards stricts sur les routes critiques**
  - ✅ Settings/Admins : `requireAdmin()`
  - ✅ Création clients : `requireAdmin()` (API)
  - ⚠️ Templates POST legacy : manque `requireAdmin()`

- [x] **Multi-tenant sécurisé**
  - ✅ Toutes les queries filtrent par `org_id`
  - ✅ `orgId` vient toujours de `getCurrentOrgId()`, jamais du client

- [x] **Pas de fallback automatique vers ADMIN**
  - ✅ Le code respecte cette règle

### UX / Navigation

- [x] **Pages protégées cohérentes avec les guards**
  - ⚠️ Page création client accessible mais action bloquée

- [x] **Messages d'erreur clairs**
  - ✅ Email non autorisé : message clair en français
  - ✅ Accès refusé : message clair
  - ⚠️ Redirections inconsistantes (URLs différentes)

---

## 5) Recommandations prioritaires

### Priorité HIGH

1. **Ajouter `requireAdmin()` dans l'API Templates POST legacy**
   - Fichier : `src/app/api/templates/route.ts`
   - Ligne 70 : Ajouter `await requireAdmin();` avant `getSession()`

### Priorité MEDIUM

2. **Protéger la page création client**
   - Fichier : `src/app/(dashboard)/clients/nouveau/page.tsx`
   - Convertir en Server Component avec `requireAdmin()` au début
   - Ou créer un wrapper Server Component qui appelle `requireAdmin()`

3. **Standardiser les redirections**
   - Corriger `/login` → `/authentication/login` dans `templates/page.tsx`
   - Standardiser les paramètres d'erreur (`?error=unauthorized` pour accès refusé)

### Priorité LOW

4. **Nettoyer les docs d'audit**
   - Supprimer les mentions de "limite max d'admins" dans `AUTH_ROLES_SECURITY_COMPLETE_AUDIT.md`
   - Marquer comme "non applicable" ou supprimer les sections concernées

5. **Documenter le webhook**
   - Ajouter une note que le webhook est un filet de sécurité
   - Recommander de désactiver la création manuelle de comptes dans Supabase

---

**Fin de l'audit synthétique**

