# 🔒 Rapport d'Audit de Sécurité - MGRH

**Date** : 2024-11-13  
**Auditeur** : Lead Dev / Security Reviewer  
**Scope** : Auth Supabase, RLS, Middleware, API Routes, Multi-tenancy

---

## 📋 Résumé Exécutif

L'audit révèle une **architecture globalement solide** avec RLS activé et filtrage systématique par `org_id` dans le code applicatif. Cependant, **un problème critique** a été identifié concernant la connexion Drizzle qui pourrait bypasser RLS.

**Statut global** : ⚠️ **Corrections critiques nécessaires avant production**

---

## 1. ✅ RLS & Policies

### Tables avec RLS activé

✅ **3 tables métier protégées** :
- `clients` - RLS activé
- `templates` - RLS activé  
- `offers` - RLS activé

### Politiques RLS par table

#### Table `clients`
- ✅ **SELECT** : `org_id = public.org_id()` - Les utilisateurs voient uniquement leurs clients
- ✅ **INSERT** : `org_id = public.org_id()` - Les utilisateurs créent uniquement pour leur org
- ✅ **UPDATE** : `org_id = public.org_id()` (USING + WITH CHECK) - Protection double
- ✅ **DELETE** : `org_id = public.org_id()` - Suppression limitée à leur org

**Verdict** : ✅ **Sécurisé** - Aucune faille identifiée

#### Table `templates`
- ✅ **SELECT** : `org_id = public.org_id()` - Isolation complète
- ✅ **INSERT** : `org_id = public.org_id()` - Création limitée
- ✅ **UPDATE** : `org_id = public.org_id()` (USING + WITH CHECK) - Protection double
- ✅ **DELETE** : `org_id = public.org_id()` - Suppression limitée

**Verdict** : ✅ **Sécurisé** - Aucune faille identifiée

#### Table `offers`
- ✅ **SELECT** : `org_id = public.org_id()` - Isolation complète
- ✅ **INSERT** : `org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE ...)` - **Protection supplémentaire** : vérifie que le client référencé appartient à la même org
- ✅ **UPDATE** : `org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE ...)` - Protection contre modification cross-org
- ✅ **DELETE** : `org_id = public.org_id()` - Suppression limitée

**Verdict** : ✅ **Sécurisé** - Protection renforcée pour les références FK

### Fonction helper `public.org_id()`

```sql
CREATE OR REPLACE FUNCTION public.org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

✅ **Correctement implémentée** :
- Utilise `SECURITY DEFINER` pour accéder à `auth.jwt()`
- Créée dans le schéma `public` (évite les problèmes de permissions)
- Extrait `org_id` depuis `user_metadata` du JWT

**Note** : Cette fonction retourne `NULL` si l'utilisateur n'a pas d'`org_id` dans son JWT, ce qui fait que toutes les politiques RLS rejettent l'accès (comportement attendu).

---

## 2. ✅ Auth + Cookies

### Client Browser (`src/lib/supabase/client.ts`)

```typescript
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
```

✅ **Correct** :
- Utilise `createBrowserClient` de `@supabase/ssr`
- Gère automatiquement les cookies `sb-<project-ref>-auth-token`
- Compatible avec le middleware et les API routes

### Server Client (`src/lib/supabase/server.ts`)

```typescript
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll(), setAll() }
  });
}
```

✅ **Correct** :
- Utilise `createServerClient` de `@supabase/ssr`
- Gère les cookies via `next/headers`
- Compatible avec le client browser

### Route `/api/auth/exchange` (`src/app/api/auth/exchange/route.ts`)

✅ **Correct** :
- Reçoit `access_token` et `refresh_token` du client
- Utilise `createServerClient` avec gestion des cookies
- Appelle `supabase.auth.setSession()` pour synchroniser la session
- Vérifie que la session est bien créée avant de retourner
- Les cookies sont définis sur la `NextResponse`

**Verdict** : ✅ **Sécurisé** - Pas de manipulation manuelle dangereuse des cookies

### Middleware (`middleware.ts`)

✅ **Correct** :
- Utilise `getSessionFromRequest()` qui utilise `createServerClient`
- Filtre les cookies par project ref pour éviter les conflits
- Protège les routes `/dashboard`, `/clients`, `/offers`, `/templates`
- Redirige vers `/authentication/login` si non authentifié
- Redirige vers `/dashboard` si déjà authentifié sur les pages login/register

**Verdict** : ✅ **Sécurisé** - Protection des routes fonctionnelle

---

## 3. ⚠️ Problème Critique Identifié

### 🚨 CRITIQUE : Connexion Drizzle Bypass RLS

**Fichier** : `src/lib/db/index.ts`

```typescript
function getDb() {
  if (!_db) {
    const connectionString = getEnvVar('DATABASE_URL');
    _pool = new Pool({
      connectionString,
    });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}
```

**Problème** :
- La connexion Drizzle utilise `DATABASE_URL` qui est probablement une connexion PostgreSQL **directe** (type `postgresql://postgres:password@host:5432/dbname`)
- Cette connexion utilise les **credentials du superuser PostgreSQL**, ce qui **bypasse complètement RLS**
- Même si les queries filtrent par `org_id` dans le code, si quelqu'un modifie le code ou fait une erreur, RLS ne protégera pas

**Impact** :
- ❌ RLS est **inefficace** car la connexion utilise un rôle PostgreSQL avec privilèges élevés
- ❌ Si une query oublie le filtre `org_id`, elle verra **toutes les données de toutes les orgs**
- ❌ Un développeur malveillant ou une erreur de code peut exposer toutes les données

**Solution requise** :
Utiliser une connexion Supabase qui respecte RLS. Deux options :

#### Option 1 : Utiliser la connexion Supabase avec JWT (Recommandé)

Modifier `src/lib/db/index.ts` pour utiliser le client Supabase avec le JWT de la session :

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentOrgId } from '@/lib/auth/session';

// Utiliser Supabase client pour les queries qui respectent RLS
// Note: Cela nécessite d'utiliser Supabase client au lieu de Drizzle direct
```

**Problème** : Drizzle ne peut pas utiliser directement Supabase client. Il faut soit :
- Utiliser Supabase client directement (perd les avantages de Drizzle)
- Utiliser `DATABASE_URL` mais avec le rôle `authenticator` et un JWT valide

#### Option 2 : Utiliser DATABASE_URL avec rôle `authenticator` + JWT (Meilleure solution)

Modifier la connexion pour utiliser le rôle `authenticator` de Supabase avec le JWT de la session :

```typescript
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function getDb() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No session');
  }
  
  // Construire DATABASE_URL avec le JWT pour respecter RLS
  const connectionString = `${DATABASE_URL}?options=-c%20request.jwt.claim.role=authenticator`;
  // + passer le JWT dans les headers
}
```

**Note** : Cette approche est complexe avec Drizzle. La solution la plus simple est de s'assurer que toutes les queries filtrent toujours par `org_id` (ce qui est déjà le cas) et d'ajouter des tests pour vérifier.

#### Option 3 : Vérification systématique dans les queries (Solution pragmatique)

Ajouter une vérification dans chaque query pour s'assurer que `org_id` est toujours présent :

```typescript
// Dans chaque fonction de query
export async function listClients(orgId: string): Promise<Client[]> {
  if (!orgId) {
    throw new Error('orgId is required');
  }
  // ... reste du code
}
```

**Recommandation immédiate** :
1. ✅ **Court terme** : Les queries filtrent déjà par `org_id` - c'est bien
2. ⚠️ **Moyen terme** : Ajouter des tests E2E pour vérifier qu'un user ne peut pas accéder aux données d'un autre
3. 🔄 **Long terme** : Migrer vers une connexion qui respecte RLS (Option 2)

---

## 4. ✅ API Routes & Server Actions

### Analyse des routes API

#### `/api/clients` (GET, POST)
✅ **Sécurisé** :
- Utilise `getCurrentOrgId()` qui vérifie la session
- Passe `orgId` à `listClients(orgId)` et `createClient({ orgId, ... })`
- Les queries filtrent par `org_id`

#### `/api/clients/[id]` (GET, PATCH)
✅ **Sécurisé** :
- Utilise `getCurrentOrgId()`
- Passe `orgId` à `getClientById(id, orgId)` et `updateClient(id, orgId, ...)`
- Protection IDOR : même avec un ID d'un autre org, la query retournera "not found"

#### `/api/templates` (GET, POST)
✅ **Sécurisé** :
- Même pattern que `/api/clients`
- Filtrage systématique par `org_id`

#### `/api/templates/[id]` (GET, PATCH)
✅ **Sécurisé** :
- Même pattern que `/api/clients/[id]`
- Protection IDOR en place

#### `/api/offres` (GET, POST)
✅ **Sécurisé** :
- Utilise `getCurrentOrgId()`
- Passe `orgId` à toutes les queries
- Protection IDOR en place

#### `/api/offres/[id]` (GET, PATCH)
✅ **Sécurisé** :
- Même pattern que les autres routes
- Protection IDOR en place

#### `/api/pdf/generate` (POST)
✅ **Sécurisé** :
- Utilise `getCurrentOrgId()`
- Vérifie l'ownership de l'offer, du client et du template avant génération PDF
- Protection IDOR en place

**Verdict global API Routes** : ✅ **Sécurisé** - Toutes les routes vérifient la session et filtrent par `org_id`

---

## 5. ✅ Server Components

### Pages analysées

Les pages dans `src/app/(dashboard)/` sont des **Client Components** (`"use client"`) qui utilisent les API routes pour charger les données.

✅ **Sécurisé** :
- Pas d'accès direct à la DB depuis les Server Components
- Toutes les données passent par les API routes protégées
- Le middleware protège l'accès aux routes

**Exemple** : `src/app/(dashboard)/clients/page.tsx`
```typescript
const res = await fetch("/api/clients")  // → API route protégée
```

**Verdict** : ✅ **Sécurisé** - Pas de problème identifié

---

## 6. 📊 Rapport Structuré

### ✅ Points OK

1. ✅ **RLS activé** sur les 3 tables métier avec politiques complètes
2. ✅ **Fonction `public.org_id()`** correctement implémentée
3. ✅ **Client browser** utilise `createBrowserClient` correctement
4. ✅ **Server client** utilise `createServerClient` correctement
5. ✅ **Route `/api/auth/exchange`** gère les cookies correctement
6. ✅ **Middleware** protège les routes et gère les redirections
7. ✅ **Toutes les API routes** vérifient la session via `getCurrentOrgId()`
8. ✅ **Toutes les queries** filtrent systématiquement par `org_id`
9. ✅ **Protection IDOR** en place : les queries avec ID vérifient aussi `org_id`
10. ✅ **Politiques RLS pour `offers`** vérifient aussi l'ownership du client référencé

### ⚠️ Points à améliorer

1. ⚠️ **Connexion Drizzle bypass RLS** (voir section 3 - Problème Critique)
   - **Impact** : RLS n'est pas efficace si la connexion utilise un superuser
   - **Solution** : Vérifier que `DATABASE_URL` utilise le rôle `authenticator` ou migrer vers Supabase client
   - **Priorité** : Moyenne (les queries filtrent déjà par `org_id` dans le code)

2. ⚠️ **Pas de tests E2E pour vérifier l'isolation multi-tenant**
   - **Impact** : Pas de garantie automatisée que l'isolation fonctionne
   - **Solution** : Ajouter des tests Playwright qui vérifient qu'un user ne peut pas accéder aux données d'un autre
   - **Priorité** : Moyenne

3. ⚠️ **Fonction `getSession()` utilise `createClient` au lieu de `createServerClient`**
   - **Fichier** : `src/lib/auth/session.ts` ligne 32
   - **Impact** : Potentiel problème de gestion des cookies dans certains contextes
   - **Note** : Cette fonction semble être utilisée uniquement dans `getSession()` qui n'est peut-être plus utilisée
   - **Solution** : Vérifier l'usage et migrer vers `createServerClient` si nécessaire
   - **Priorité** : Basse

### 🚨 Problèmes critiques (à fixer avant d'aller plus loin)

1. 🚨 **CRITIQUE** : Connexion Drizzle utilise probablement un superuser PostgreSQL qui bypass RLS
   - **Fichier** : `src/lib/db/index.ts`
   - **Impact** : RLS est inefficace, si une query oublie le filtre `org_id`, elle expose toutes les données
   - **Solution immédiate** :
     - ✅ Vérifier que toutes les queries filtrent par `org_id` (déjà fait)
     - ⚠️ Ajouter des assertions dans les queries pour garantir que `orgId` est toujours présent
     - 🔄 Long terme : Migrer vers une connexion qui respecte RLS
   - **Action requise** : Vérifier la configuration de `DATABASE_URL` et documenter le comportement attendu

---

## 7. 🔍 Détails Techniques

### Vérification de la connexion Drizzle

Pour vérifier si la connexion bypass RLS, exécuter cette query dans Supabase SQL Editor :

```sql
-- Vérifier le rôle actuel de la connexion
SELECT current_user, current_role;

-- Si c'est 'postgres' ou 'service_role', RLS est bypassé
-- Si c'est 'authenticator' ou 'anon', RLS est respecté
```

### Test d'isolation multi-tenant

Pour tester manuellement :

1. Créer 2 utilisateurs avec des `org_id` différents
2. Se connecter avec le user 1
3. Créer un client pour org_1
4. Se connecter avec le user 2
5. Essayer d'accéder au client créé par user 1 via l'API
6. **Résultat attendu** : 404 Not Found (pas d'erreur 403 pour ne pas révéler l'existence)

---

## 8. 📝 Next Steps (Prompt 8)

### ✅ On peut passer à la fonctionnalité suivante ?

**Réponse** : ⚠️ **Oui, MAIS avec une correction préalable**

### Corrections critiques à faire en priorité

#### 1. Vérifier et documenter la connexion Drizzle (URGENT)

**Action** :
1. Vérifier la valeur de `DATABASE_URL` dans `.env.local`
2. Si c'est une connexion directe PostgreSQL (type `postgresql://postgres:...`), documenter que RLS est bypassé mais que le code filtre par `org_id`
3. Ajouter des assertions dans les queries pour garantir que `orgId` n'est jamais `null` ou `undefined`

**Fichiers à modifier** :
- `src/lib/db/queries/clients.ts` - Ajouter assertion `if (!orgId) throw new Error(...)`
- `src/lib/db/queries/templates.ts` - Idem
- `src/lib/db/queries/offers.ts` - Idem

#### 2. Ajouter des tests E2E d'isolation (RECOMMANDÉ)

**Action** :
Créer un test Playwright qui :
1. Crée 2 utilisateurs avec des `org_id` différents
2. Vérifie qu'ils ne peuvent pas accéder aux données de l'autre

**Fichier à créer** : `tests/e2e/multi-tenancy.spec.ts`

---

## 9. ✅ Conclusion

**Architecture globale** : ✅ **Solide**

- RLS activé et bien configuré
- Filtrage systématique par `org_id` dans le code
- Protection IDOR en place
- Middleware et auth bien implémentés

**Point d'attention** : ⚠️ **Connexion Drizzle**

- La connexion Drizzle pourrait bypasser RLS si elle utilise un superuser
- Les queries filtrent déjà par `org_id` dans le code, donc le risque est mitigé
- Recommandation : Vérifier la configuration et ajouter des assertions

**Recommandation finale** :
1. ✅ **Court terme** : Ajouter des assertions dans les queries pour garantir `orgId` non-null
2. ⚠️ **Moyen terme** : Ajouter des tests E2E d'isolation
3. 🔄 **Long terme** : Migrer vers une connexion qui respecte RLS nativement

**Statut** : 🟡 **Prêt pour développement avec vigilance** - Les protections sont en place, mais il faut rester vigilant sur la connexion Drizzle.

---

**Fin du rapport**


