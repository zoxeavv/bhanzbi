# 🔐 Audit : Guards d'Authentification et Permissions

**Date** : 2025-01-27  
**Type** : Audit / Documentation (lecture seule)

---

## 📋 Table des matières

1. [Guards disponibles](#1-guards-disponibles)
2. [Analyse détaillée de chaque guard](#2-analyse-détaillée-de-chaque-guard)
3. [Utilisation dans le codebase](#3-utilisation-dans-le-codebase)
4. [Conclusion](#4-conclusion)

---

## 1. Guards disponibles

### ⚠️ Note importante

**Il n'existe PAS de fonction `requireAuth()` dans le codebase.**

Les guards disponibles sont :
- ✅ `requireSession()` : Vérifie l'authentification
- ✅ `requireAdmin()` : Vérifie le rôle ADMIN
- ✅ `getCurrentOrgId()` : Récupère l'orgId (appelle `requireSession()` en interne)

Si vous cherchez `requireAuth()`, il s'agit probablement de `requireSession()`.

---

## 2. Analyse détaillée de chaque guard

### 🔒 Guard 1 : `requireSession()`

**Fichier** : `src/lib/auth/session.ts`  
**Lignes** : 165-171

#### Vérifications effectuées

```typescript
export async function requireSession(): Promise<{ user: User; orgId?: string }> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

**Vérifications** :
1. ✅ **Authentification** : Appelle `getSession()` qui vérifie :
   - Existence d'un JWT valide via `supabase.auth.getUser()`
   - JWT non expiré
   - Utilisateur existant dans Supabase Auth
2. ❌ **Pas de vérification de rôle** : Accepte tous les utilisateurs authentifiés (ADMIN et USER)
3. ❌ **Pas de vérification d'orgId** : Ne vérifie pas si `orgId` est présent

**Signalement d'erreur** :
- **Méthode** : `throw new Error('Unauthorized')`
- **Message** : `'Unauthorized'`
- **Type** : Exception JavaScript (doit être catchée par l'appelant)

**Comportement** :
- ✅ Si session valide → Retourne `{ user: User; orgId?: string }`
- ❌ Si session invalide → Throw `Error('Unauthorized')`

#### Utilisation dans le codebase

**Routes / Pages qui l'utilisent** :

| Fichier | Ligne | Usage |
|---------|-------|-------|
| `src/app/api/clients/route.ts` | 27 | `await requireSession();` (GET) |
| `src/app/api/clients/[id]/route.ts` | 24 | `await requireSession();` (GET) |
| `src/lib/auth/session.ts` | 212 | Appelé par `getCurrentOrgId()` |
| `src/lib/auth/permissions.ts` | 21 | Appelé par `requireAdmin()` |

**Pattern d'utilisation** :
```typescript
// Dans les API routes
export async function GET(request: NextRequest) {
  try {
    await requireSession(); // Vérifie l'authentification
    const orgId = await getCurrentOrgId();
    // ... reste du code
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
  }
}
```

---

### 🔒 Guard 2 : `requireAdmin()`

**Fichier** : `src/lib/auth/permissions.ts`  
**Lignes** : 20-32

#### Vérifications effectuées

```typescript
export async function requireAdmin(): Promise<void> {
  const session = await requireSession();
  
  // Si l'utilisateur n'a pas de rôle défini, considérer comme ADMIN par défaut
  const userRole = session.user.role || "ADMIN";
  
  if (userRole !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}
```

**Vérifications** :
1. ✅ **Authentification** : Appelle `requireSession()` (vérifie JWT valide)
2. ✅ **Rôle ADMIN** : Vérifie que `session.user.role === "ADMIN"`
3. ⚠️ **Fallback** : Si `role` est `undefined`, considère comme `"ADMIN"` par défaut
4. ❌ **Pas de vérification d'orgId** : Ne vérifie pas si `orgId` est présent

**Signalement d'erreur** :
- **Méthode** : `throw new Error("Unauthorized")`
- **Message** : `"Unauthorized"`
- **Type** : Exception JavaScript (doit être catchée par l'appelant)

**Comportement** :
- ✅ Si utilisateur authentifié ET rôle === "ADMIN" → Continue (ne retourne rien)
- ❌ Si utilisateur non authentifié → Throw via `requireSession()`
- ❌ Si utilisateur authentifié mais rôle !== "ADMIN" → Throw `Error("Unauthorized")`

**Note importante** : Le fallback `|| "ADMIN"` signifie qu'un utilisateur sans rôle défini sera considéré comme ADMIN. C'est une **faiblesse de sécurité** si des utilisateurs USER sont créés sans rôle explicite.

#### Utilisation dans le codebase

**Routes / Pages qui l'utilisent** :

| Fichier | Ligne | Usage |
|---------|-------|-------|
| `src/app/api/clients/route.ts` | 86 | `await requireAdmin();` (POST) |
| `src/app/api/clients/[id]/route.ts` | 76, 163 | `await requireAdmin();` (PUT, DELETE) |
| `src/app/(dashboard)/templates/actions.ts` | 65, 206, 321 | `await requireAdmin();` (duplicate, update, reset) |
| `src/app/(dashboard)/templates/nouveau/actions.ts` | 124 | `await requireAdmin();` (create) |

**Pattern d'utilisation** :
```typescript
// Dans les Server Actions
export async function createTemplate(...) {
  try {
    await requireAdmin(); // Vérifie les permissions ADMIN
    const orgId = await getCurrentOrgId();
    // ... reste du code
  } catch (error) {
    if (error.message === 'Unauthorized') {
      return { code: 'UNAUTHORIZED', message: '...' };
    }
  }
}
```

---

### 🔒 Guard 3 : `getCurrentOrgId()` (guard implicite)

**Fichier** : `src/lib/auth/session.ts`  
**Lignes** : 211-227

#### Vérifications effectuées

```typescript
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession(); // ← Guard implicite
  
  if (session.orgId) {
    return session.orgId;
  }
  
  if (DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;
  }
  
  throw new Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured');
}
```

**Vérifications** :
1. ✅ **Authentification** : Appelle `requireSession()` en interne (vérifie JWT valide)
2. ✅ **orgId présent** : Vérifie que `session.orgId` existe OU `DEFAULT_ORG_ID` est défini
3. ❌ **Pas de vérification de rôle** : Accepte tous les utilisateurs authentifiés

**Signalement d'erreur** :
- **Méthode** : `throw new Error(...)`
- **Messages possibles** :
  - `'Unauthorized'` (si `requireSession()` échoue)
  - `'Organization ID not found in session and DEFAULT_ORG_ID is not configured'` (si orgId manquant)

**Comportement** :
- ✅ Si session valide ET orgId présent → Retourne `orgId`
- ✅ Si session valide ET `DEFAULT_ORG_ID` défini → Retourne `DEFAULT_ORG_ID`
- ❌ Si session invalide → Throw via `requireSession()`
- ❌ Si orgId manquant ET pas de `DEFAULT_ORG_ID` → Throw erreur

**Note** : Cette fonction agit comme un **guard implicite** car elle appelle `requireSession()` en interne. Toute page/route qui appelle `getCurrentOrgId()` vérifie automatiquement l'authentification.

#### Utilisation dans le codebase

**Routes / Pages qui l'utilisent** (très nombreuses) :

| Fichier | Ligne | Usage |
|---------|-------|-------|
| `src/app/(dashboard)/clients/page.tsx` | 25 | `const orgId = await getCurrentOrgId();` |
| `src/app/(dashboard)/templates/page.tsx` | 11 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/clients/route.ts` | 28, 87 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/templates/route.ts` | 31, 73 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/offers/route.ts` | 9, 29 | `const orgId = await getCurrentOrgId();` |
| ... et beaucoup d'autres | | |

**Pattern d'utilisation** :
```typescript
// Dans les Server Components
export default async function ClientsPage() {
  try {
    const orgId = await getCurrentOrgId(); // ← Vérifie auth + récupère orgId
    const clients = await getClientsWithOffersCount(orgId);
    // ... reste du code
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
      redirect('/authentication/login?error=unauthorized');
    }
  }
}
```

---

## 3. Utilisation dans le codebase

### 📊 Résumé des guards par type de route

#### API Routes (`src/app/api/**`)

| Route | GET | POST | PUT | DELETE |
|-------|-----|------|-----|--------|
| `/api/clients` | `requireSession()` | `requireAdmin()` | - | - |
| `/api/clients/[id]` | `requireSession()` | - | `requireAdmin()` | `requireAdmin()` |
| `/api/templates` | `getCurrentOrgId()`* | `requireAdmin()` | - | - |
| `/api/templates/[id]` | `getCurrentOrgId()`* | - | `requireAdmin()` | - |
| `/api/offers` | `getCurrentOrgId()`* | `getCurrentOrgId()`* | - | - |

*`getCurrentOrgId()` inclut `requireSession()` en interne

#### Server Components (`src/app/(dashboard)/**`)

| Page | Guard utilisé |
|------|--------------|
| `/clients/page.tsx` | `getCurrentOrgId()`* (guard implicite) |
| `/templates/page.tsx` | `getCurrentOrgId()`* (guard implicite) |
| `/templates/[id]/page.tsx` | `getCurrentOrgId()`* (guard implicite) |

#### Server Actions (`src/app/(dashboard)/**/actions.ts`)

| Action | Guard utilisé |
|--------|--------------|
| `createTemplate()` | `requireAdmin()` |
| `duplicateTemplate()` | `requireAdmin()` |
| `updateTemplate()` | `requireAdmin()` |
| `resetTemplateStructure()` | `requireAdmin()` |

### 🔍 Patterns de gestion d'erreur

#### Pattern 1 : API Routes

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const orgId = await getCurrentOrgId();
    // ... code
  } catch (error) {
    if (error instanceof Error && 
        (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

#### Pattern 2 : Server Components

```typescript
export default async function ClientsPage() {
  try {
    const orgId = await getCurrentOrgId();
    // ... code
  } catch (error) {
    if (error instanceof Error && 
        (error.message === 'Unauthorized' || error.message.includes('Organization ID'))) {
      redirect('/authentication/login?error=unauthorized');
    }
    redirect('/dashboard?error=clients_load_failed');
  }
}
```

#### Pattern 3 : Server Actions

```typescript
export async function createTemplate(...): Promise<ActionResult> {
  try {
    await requireAdmin();
    const orgId = await getCurrentOrgId();
    // ... code
  } catch (error) {
    if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
      return {
        code: 'UNAUTHORIZED',
        message: getUserMessage('UNAUTHORIZED')
      };
    }
    return { code: 'ERROR', message: '...' };
  }
}
```

---

## 4. Conclusion

### ✅ Guard `requireSession()` : **OK**

**Raison** :
- ✅ Vérifie correctement l'authentification via JWT Supabase
- ✅ Utilise `getUser()` pour valider le token (vérifie expiration)
- ✅ Signalement d'erreur clair (`throw Error('Unauthorized')`)
- ✅ Utilisé de manière cohérente dans les API routes
- ⚠️ **Petit point d'attention** : Ne vérifie pas si `orgId` est présent (mais c'est normal, ce n'est pas son rôle)

**Recommandation** : Continuer à utiliser `requireSession()` pour vérifier l'authentification de base.

---

### ⚠️ Guard `requireAdmin()` : **À revoir**

**Raisons** :

1. **Fallback dangereux** :
   ```typescript
   const userRole = session.user.role || "ADMIN";
   ```
   - Si un utilisateur n'a pas de rôle défini, il est considéré comme ADMIN par défaut
   - **Risque** : Si un utilisateur USER est créé sans `role` dans `user_metadata`, il sera traité comme ADMIN
   - **Recommandation** : Ne pas utiliser de fallback, throw une erreur si `role` est `undefined`

2. **Incohérence dans les messages d'erreur** :
   - `requireSession()` throw `Error('Unauthorized')` (simple quotes)
   - `requireAdmin()` throw `Error("Unauthorized")` (double quotes)
   - Même si ça fonctionne, c'est une incohérence mineure

3. **Pas de vérification d'orgId** :
   - Ne vérifie pas si `orgId` est présent (mais c'est normal, ce n'est pas son rôle)
   - Cependant, la plupart des mutations nécessitent un `orgId`, donc il faudra appeler `getCurrentOrgId()` après

**Recommandations** :

1. **Modifier le fallback** :
   ```typescript
   // Au lieu de :
   const userRole = session.user.role || "ADMIN";
   
   // Utiliser :
   if (!session.user.role) {
     throw new Error("User role not defined");
   }
   if (session.user.role !== "ADMIN") {
     throw new Error("Unauthorized");
   }
   ```

2. **Uniformiser les messages d'erreur** : Utiliser le même format de quotes partout

3. **Documenter le comportement** : Clarifier que `requireAdmin()` ne vérifie QUE le rôle, pas l'orgId

**Utilisation actuelle** : ✅ Correcte dans les Server Actions (mutations critiques)

---

### 📝 Résumé des guards

| Guard | Vérifie Auth | Vérifie Rôle | Vérifie orgId | Signalement |
|-------|--------------|--------------|---------------|-------------|
| `requireSession()` | ✅ | ❌ | ❌ | `throw Error('Unauthorized')` |
| `requireAdmin()` | ✅ (via `requireSession()`) | ✅ (ADMIN) | ❌ | `throw Error("Unauthorized")` |
| `getCurrentOrgId()` | ✅ (via `requireSession()`) | ❌ | ✅ (présence) | `throw Error(...)` |

---

**Fin du document**

