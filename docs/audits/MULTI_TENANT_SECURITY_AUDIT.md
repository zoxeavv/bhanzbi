# AUDIT SÉCURITÉ MULTI-TENANT

**Date**: 2024-12-19  
**Objectif**: Vérifier que la sécurité multi-tenant est correctement implémentée et alignée

---

## 📋 RÉSUMÉ (3-6 lignes)

**État global**: ✅ **Sécurité multi-tenant correctement implémentée** avec défense en profondeur (app + DB). Toutes les tables métier (`clients`, `templates`, `offers`, `admin_allowed_emails`) ont `org_id NOT NULL` et filtrent systématiquement par `org_id` dans les queries Drizzle. Routes API utilisent `getCurrentOrgId()` et rejettent explicitement `org_id` du client. RLS activé sur `clients`, `templates`, `offers` avec policies utilisant `public.org_id()` aligné avec `getCurrentOrgId()`. **Point à améliorer** : `admin_allowed_emails` n'a pas RLS activé (protection uniquement app, acceptable si intentionnel).

---

## 1️⃣ TABLES & RLS

### Tables métier identifiées

| Table | `org_id` présent | RLS activé | Policies |
|-------|------------------|------------|----------|
| `clients` | ✅ NOT NULL | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `templates` | ✅ NOT NULL | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `offers` | ✅ NOT NULL | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `admin_allowed_emails` | ✅ NOT NULL | ❌ | Aucune |
| `crm_users` | ⚠️ nullable | ❌ | Aucune (table fantôme) |

### Policies RLS (selon migration 0002)

**Table `clients`**:
- SELECT: `USING (org_id = public.org_id())`
- INSERT: `WITH CHECK (org_id = public.org_id())`
- UPDATE: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id())`
- DELETE: `USING (org_id = public.org_id())`

**Table `templates`**:
- SELECT: `USING (org_id = public.org_id())`
- INSERT: `WITH CHECK (org_id = public.org_id())`
- UPDATE: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id())`
- DELETE: `USING (org_id = public.org_id())`

**Table `offers`**:
- SELECT: `USING (org_id = public.org_id())`
- INSERT: `WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))`
- UPDATE: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))`
- DELETE: `USING (org_id = public.org_id())`

**Table `admin_allowed_emails`**:
- ❌ RLS non activé (selon migrations)

**Fonction `public.org_id()`**:
- Extrait `org_id` depuis JWT: `(auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id'`
- Aligné avec `getCurrentOrgId()` qui lit `user.user_metadata?.org_id`

---

## 2️⃣ COHÉRENCE AVEC LE CODE

### Queries Drizzle filtrent toujours par `org_id`

**✅ Table `clients`** (`src/lib/db/queries/clients.ts`):
- `listClients(orgId)`: `eq(clients.org_id, orgId)` ✅
- `getClientById(id, orgId)`: `and(eq(clients.id, id), eq(clients.org_id, orgId))` ✅
- `createClient({ orgId })`: `org_id: data.orgId` ✅
- `updateClient(id, orgId, ...)`: `and(eq(clients.id, id), eq(clients.org_id, orgId))` ✅
- `deleteClient(id, orgId)`: `and(eq(clients.id, id), eq(clients.org_id, orgId))` ✅

**✅ Table `templates`** (`src/lib/db/queries/templates.ts`):
- `listTemplates(orgId)`: `eq(templates.org_id, orgId)` ✅
- `getTemplateById(id, orgId)`: `and(eq(templates.id, id), eq(templates.org_id, orgId))` ✅
- `getTemplateBySlug(slug, orgId)`: `and(eq(templates.slug, slug), eq(templates.org_id, orgId))` ✅
- `createTemplate({ orgId })`: `org_id: data.orgId` ✅
- `updateTemplate(id, orgId, ...)`: `and(eq(templates.id, id), eq(templates.org_id, orgId))` ✅

**✅ Table `offers`** (`src/lib/db/queries/offers.ts`):
- `listOffers(orgId)`: `eq(offers.org_id, orgId)` ✅
- `getOfferById(id, orgId)`: `and(eq(offers.id, id), eq(offers.org_id, orgId))` ✅
- `createOffer({ orgId })`: `org_id: data.orgId` ✅
- `updateOffer(id, orgId, ...)`: `and(eq(offers.id, id), eq(offers.org_id, orgId))` ✅
- `listOffersByClient(clientId, orgId)`: `and(eq(offers.org_id, orgId), eq(offers.client_id, clientId))` ✅
- `getLastUsedAtByTemplateIds(orgId, ...)`: `eq(offers.org_id, orgId)` ✅

**✅ Table `admin_allowed_emails`** (`src/lib/db/queries/adminAllowedEmails.ts`):
- `listAdminAllowedEmails(orgId)`: `eq(admin_allowed_emails.org_id, orgId)` ✅
- `addAdminAllowedEmail(orgId, ...)`: `org_id: orgId` ✅
- `deleteAdminAllowedEmail(orgId, id)`: `and(eq(admin_allowed_emails.id, id), eq(admin_allowed_emails.org_id, orgId))` ✅
- `markAdminEmailAsUsed(orgId, ...)`: `eq(admin_allowed_emails.org_id, orgId)` ✅

**Conclusion**: ✅ **Toutes les queries filtrent systématiquement par `org_id`**

---

### Routes API utilisent `getCurrentOrgId()` et rejettent `org_id` du client

**✅ Route `/api/clients`**:
- GET: `await requireSession()` → `getCurrentOrgId()` → `listClients(orgId)` ✅
- POST: `await requireAdmin()` → `getCurrentOrgId()` → vérifie `'org_id' in body || 'orgId' in body` → rejette si présent ✅

**✅ Route `/api/clients/[id]`**:
- GET: `await requireSession()` → `getCurrentOrgId()` → `getClientById(id, orgId)` ✅
- PUT: `await requireAdmin()` → `getCurrentOrgId()` → vérifie `'org_id' in body` → rejette si présent ✅
- DELETE: `await requireAdmin()` → `getCurrentOrgId()` → `deleteClient(id, orgId)` ✅

**✅ Route `/api/offers`**:
- GET: `getCurrentOrgId()` → `listOffers(orgId)` ✅
- POST: `getCurrentOrgId()` → vérifie `'org_id' in body || 'orgId' in body` → rejette si présent ✅

**✅ Route `/api/templates`**:
- GET: `getCurrentOrgId()` → `listTemplates(orgId)` ✅
- POST: `await requireAdmin()` → `getCurrentOrgId()` → `createTemplate({ orgId })` ✅

**✅ Route `/api/settings/admin-allowed-emails`**:
- GET: `await requireAdmin()` → `getCurrentOrgId()` → `listAdminAllowedEmails(orgId)` ✅
- POST: `await requireAdmin()` → `getCurrentOrgId()` → vérifie `'org_id' in body || 'orgId' in body` → rejette si présent ✅
- DELETE: `await requireAdmin()` → `getCurrentOrgId()` → `deleteAdminAllowedEmail(orgId, id)` ✅

**Conclusion**: ✅ **Toutes les routes utilisent `getCurrentOrgId()` et rejettent `org_id` du client**

---

### Alignement `public.org_id()` ↔ `getCurrentOrgId()`

**Fonction DB `public.org_id()`** (migration 0002):
```sql
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id';
END;
```

**Fonction app `getCurrentOrgId()`** (`src/lib/auth/session.ts`):
```typescript
const session = await requireSession();
if (session.orgId) {
  return session.orgId;
}
// Fallback DEFAULT_ORG_ID si défini
```

**`getSession()` lit** (`src/lib/auth/session.ts`):
```typescript
org_id: user.user_metadata?.org_id
```

**Conclusion**: ✅ **Aligné** - Les deux lisent `user_metadata.org_id` depuis le JWT Supabase

---

## 3️⃣ MATRICE PAR TABLE

### Table `clients`

| Opération | Guard app | RLS | org_id check DB | org_id check app | État |
|-----------|-----------|-----|-----------------|------------------|------|
| SELECT | ✅ `requireSession()` | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ `listClients(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `requireAdmin()` | ✅ `WITH CHECK (org_id = public.org_id())` | ✅ | ✅ `createClient({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `requireAdmin()` | ✅ `USING/WITH CHECK (org_id = public.org_id())` | ✅ | ✅ `updateClient(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | ✅ `requireAdmin()` | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ `deleteClient(id, orgId)` | ✅ **Sécurisé** |

**Conclusion**: ✅ **Défense en profondeur** (app + DB)

---

### Table `templates`

| Opération | Guard app | RLS | org_id check DB | org_id check app | État |
|-----------|-----------|-----|-----------------|------------------|------|
| SELECT | ✅ `getCurrentOrgId()` | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ `listTemplates(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `requireAdmin()` | ✅ `WITH CHECK (org_id = public.org_id())` | ✅ | ✅ `createTemplate({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `requireAdmin()` | ✅ `USING/WITH CHECK (org_id = public.org_id())` | ✅ | ✅ `updateTemplate(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | - | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ (via queries) | ✅ **Sécurisé** |

**Conclusion**: ✅ **Défense en profondeur** (app + DB)

---

### Table `offers`

| Opération | Guard app | RLS | org_id check DB | org_id check app | État |
|-----------|-----------|-----|-----------------|------------------|------|
| SELECT | ✅ `getCurrentOrgId()` | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ `listOffers(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `getCurrentOrgId()` | ✅ `WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())` | ✅ + vérifie client | ✅ `createOffer({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `getCurrentOrgId()` | ✅ `USING/WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())` | ✅ + vérifie client | ✅ `updateOffer(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | - | ✅ `USING (org_id = public.org_id())` | ✅ | ✅ (via queries) | ✅ **Sécurisé** |

**Conclusion**: ✅ **Défense en profondeur** (app + DB) + vérification supplémentaire de `client.org_id` pour INSERT/UPDATE

---

### Table `admin_allowed_emails`

| Opération | Guard app | RLS | org_id check DB | org_id check app | État |
|-----------|-----------|-----|-----------------|------------------|------|
| SELECT | ✅ `requireAdmin()` | ❌ | ❌ | ✅ `listAdminAllowedEmails(orgId)` | ⚠️ **Protection app uniquement** |
| INSERT | ✅ `requireAdmin()` | ❌ | ❌ | ✅ `addAdminAllowedEmail(orgId, ...)` | ⚠️ **Protection app uniquement** |
| DELETE | ✅ `requireAdmin()` | ❌ | ❌ | ✅ `deleteAdminAllowedEmail(orgId, id)` | ⚠️ **Protection app uniquement** |

**Conclusion**: ⚠️ **Protection uniquement côté app** - RLS non activé (acceptable si intentionnel, mais moins sécurisé)

---

## 4️⃣ DOUBLE CHECK : TABLE `offers` (critique)

### Vérification manuelle complète

**1. Queries TS** (`src/lib/db/queries/offers.ts`):
- ✅ `listOffers(orgId)`: ligne 30-38, filtre par `eq(offers.org_id, orgId)`
- ✅ `getOfferById(id, orgId)`: ligne 40-49, filtre par `and(eq(offers.id, id), eq(offers.org_id, orgId))`
- ✅ `createOffer({ orgId })`: ligne 51-80, utilise `org_id: data.orgId`
- ✅ `updateOffer(id, orgId, ...)`: ligne 82-109, filtre par `and(eq(offers.id, id), eq(offers.org_id, orgId))`
- ✅ `listOffersByClient(clientId, orgId)`: ligne 111-120, filtre par `and(eq(offers.org_id, orgId), eq(offers.client_id, clientId))`

**2. Policies RLS** (migration 0002):
- ✅ SELECT: `USING (org_id = public.org_id())` - ligne 105-108
- ✅ INSERT: `WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))` - ligne 113-123
- ✅ UPDATE: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id() AND EXISTS (...))` - ligne 127-138
- ✅ DELETE: `USING (org_id = public.org_id())` - ligne 142-145

**3. Routes API** (`src/app/api/offers/route.ts`):
- ✅ GET: ligne 29, `getCurrentOrgId()` → `listOffers(orgId)` - pas de guard mais `getCurrentOrgId()` throw si non authentifié
- ✅ POST: ligne 67, `getCurrentOrgId()` → ligne 71-76, vérifie et rejette `org_id` du body → `createOffer({ orgId })`

**4. Alignement `public.org_id()` ↔ `getCurrentOrgId()`**:
- ✅ `public.org_id()` lit: `(auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id'`
- ✅ `getCurrentOrgId()` lit: `user.user_metadata?.org_id` depuis `getUser()`
- ✅ Les deux lisent la même source (JWT Supabase `user_metadata.org_id`)

**Conclusion**: ✅ **Table `offers` parfaitement sécurisée** avec défense en profondeur (app + DB) et vérification supplémentaire de `client.org_id` pour INSERT/UPDATE

---

## 5️⃣ TABLES OK vs TABLES À RISQUE

### ✅ Tables OK (sécurité complète)

| Table | Raison |
|-------|--------|
| `clients` | RLS activé + policies complètes + queries filtrent par `org_id` + routes protégées |
| `templates` | RLS activé + policies complètes + queries filtrent par `org_id` + routes protégées |
| `offers` | RLS activé + policies complètes + queries filtrent par `org_id` + vérification `client.org_id` |

---

### ⚠️ Tables à risque

| Table | Risque | Suggestion de fix |
|-------|--------|-------------------|
| `admin_allowed_emails` | RLS non activé, protection uniquement app | **Option 1** : Activer RLS avec policies similaires aux autres tables<br>**Option 2** : Documenter pourquoi RLS non activé (si intentionnel) |
| `crm_users` | Table fantôme (non créée), `org_id` nullable | Supprimer de `schema.ts` ou créer migration avec RLS si nécessaire |

---

## 6️⃣ RECOMMANDATIONS

### Actions immédiates

1. **Documenter ou activer RLS sur `admin_allowed_emails`**:
   - Si intentionnel : documenter pourquoi RLS non activé
   - Si erreur : créer migration pour activer RLS avec policies similaires aux autres tables

2. **Supprimer ou créer `crm_users`**:
   - Si non utilisé : supprimer de `schema.ts`
   - Si nécessaire : créer migration avec RLS activé

### Améliorations optionnelles

3. **Ajouter guard `requireSession()` sur GET `/api/offers`**:
   - Actuellement : `getCurrentOrgId()` throw si non authentifié (acceptable)
   - Suggestion : Ajouter `await requireSession()` pour cohérence avec autres routes

4. **Vérifier policies RLS en DB réelle**:
   - Exécuter `scripts/inspect-rls-policies.sql` sur Supabase
   - Vérifier que toutes les policies existent et utilisent bien `public.org_id()`

---

## 7️⃣ CONCLUSION

**État global**: ✅ **Sécurité multi-tenant correctement implémentée** avec défense en profondeur.

**Forces**:
- ✅ Toutes les tables métier ont `org_id NOT NULL`
- ✅ Queries Drizzle filtrent systématiquement par `org_id`
- ✅ Routes API utilisent `getCurrentOrgId()` et rejettent `org_id` du client
- ✅ RLS activé sur tables critiques (`clients`, `templates`, `offers`)
- ✅ Policies RLS alignées avec `getCurrentOrgId()`
- ✅ Vérification supplémentaire `client.org_id` pour `offers` INSERT/UPDATE

**Points à améliorer**:
- ⚠️ `admin_allowed_emails` : RLS non activé (protection app uniquement)
- ⚠️ `crm_users` : Table fantôme à supprimer ou créer

**Recommandation**: Activer RLS sur `admin_allowed_emails` pour cohérence avec les autres tables métier, sauf si intentionnellement désactivé pour des raisons spécifiques.

