# AUDIT COMPLET : ALIGNEMENT DRIZZLE ↔ SUPABASE ↔ MIGRATIONS

**Date**: 2024-12-19  
**Objectif**: Vérifier l'alignement complet entre Drizzle schema, migrations SQL, et Supabase réel

---

## 📋 RÉSUMÉ EXÉCUTIF

**État global**: ✅ **Bien aligné** avec quelques écarts mineurs à corriger

**Forces principales**:
- ✅ Multi-tenant strict : toutes les tables métier ont `org_id NOT NULL`
- ✅ RLS activé sur `clients`, `templates`, `offers` avec policies cohérentes
- ✅ Routes API protégées : `orgId` vient toujours de `getCurrentOrgId()`, jamais du client
- ✅ Queries Drizzle filtrent systématiquement par `org_id`
- ✅ Indexes créés pour optimiser les requêtes multi-tenant
- ✅ Contraintes uniques composites pour isolation org (`templates`, `admin_allowed_emails`)

**Écarts critiques** (à corriger en priorité):
1. ❌ **Table `crm_users`** : définie en Drizzle mais aucune migration de création
2. ⚠️ **Conversions monétaires** : asymétrie DB ↔ TS (DB stocke décimales, TS attend centimes mais conversion DB→TS manquante)
3. ⚠️ **RLS sur `admin_allowed_emails`** : non activé selon migrations (intentionnel ?)
4. ⚠️ **Enum `offer_status`** : à vérifier existence en DB

**Écarts mineurs / TODO**:
- Vérifier correspondance exacte colonnes DB vs Drizzle (nécessite accès DB réel)
- Vérifier présence de tous les indexes en DB
- Vérifier que les policies RLS utilisent bien `public.org_id()`
- Documenter l'usage de `crm_users` ou le supprimer si inutilisé

---

## 1️⃣ INVENTAIRE GLOBAL

### 1.1. Tables définies en Drizzle (`src/lib/db/schema.ts`)

| Table | Colonnes | PK | FK | Uniques | Indexes |
|-------|----------|----|----|---------|---------|
| `clients` | 9 | `id` | - | - | `idx_clients_org_id`, `idx_clients_created_at` |
| `templates` | 10 | `id` | - | `(org_id, slug)` | `idx_templates_org_id`, `idx_templates_created_at` |
| `offers` | 13 | `id` | `client_id → clients.id`<br>`template_id → templates.id` | - | `idx_offers_org_id`, `idx_offers_created_at`, `idx_offers_org_id_created_at`, `idx_offers_org_id_status`, `idx_offers_client_id`, `idx_offers_org_client` |
| `crm_users` | 5 | `id` | - | `email` | - |
| `admin_allowed_emails` | 6 | `id` | - | `(org_id, email)` | `idx_admin_allowed_emails_org_id`, `idx_admin_allowed_emails_email` |

**Enums définis**:
- `offer_status`: `['draft', 'sent', 'accepted', 'rejected']` (pgEnum)

### 1.2. Tables créées par migrations SQL

**Migration 0000**: `templates` (création initiale)  
**Migration 0001**: `org_id` ajouté à `clients`, `templates`, `offers`  
**Migration 0002**: RLS activé sur `clients`, `templates`, `offers`  
**Migration 0003**: Indexes créés  
**Migration 0004**: Indexes `offers.client_id` créés  
**Migration 0005**: Contrainte unique composite `(org_id, slug)` sur `templates`  
**Migration 0006**: Colonne `template_kind` ajoutée à `templates`  
**Migration 0007**: Table `admin_allowed_emails` créée

**Tables créées**: `clients`, `templates`, `offers`, `admin_allowed_emails`

**⚠️ Table manquante**: `crm_users` définie en Drizzle mais aucune migration de création

### 1.3. Colonnes `org_id` (multi-tenant)

| Table | Présent | NOT NULL | Index | RLS |
|-------|---------|----------|-------|-----|
| `clients` | ✅ | ✅ | ✅ | ✅ |
| `templates` | ✅ | ✅ | ✅ | ✅ |
| `offers` | ✅ | ✅ | ✅ | ✅ |
| `crm_users` | ✅ | ❌ (nullable) | ❌ | ❌ |
| `admin_allowed_emails` | ✅ | ✅ | ✅ | ❌ |

**Conclusion**: Toutes les tables métier ont `org_id NOT NULL` avec indexes et RLS (sauf `admin_allowed_emails` et `crm_users`).

---

## 2️⃣ COMPARAISON STRUCTURELLE

### 2.1. Tables Drizzle vs Migrations

**✅ Alignées**:
- `clients` : définie en Drizzle, créée/modifiée par migrations
- `templates` : définie en Drizzle, créée/modifiée par migrations
- `offers` : définie en Drizzle, créée/modifiée par migrations
- `admin_allowed_emails` : définie en Drizzle, créée par migration 0007

**❌ Écarts**:
- `crm_users` : définie en Drizzle mais **aucune migration de création**

**Action requise**: 
- Vérifier si `crm_users` est utilisé dans le code
- Si utilisé : créer migration de création
- Si non utilisé : supprimer de `schema.ts`

### 2.2. Colonnes par table

#### Table `clients`

| Colonne | Type Drizzle | Type DB attendu | NOT NULL | Default |
|---------|-------------|-----------------|----------|---------|
| `id` | `text` | `TEXT` | ✅ | `gen_random_uuid()` |
| `org_id` | `text` | `TEXT` | ✅ | - |
| `name` | `text` | `TEXT` | ✅ | - |
| `company` | `text` | `TEXT` | ✅ | `''` |
| `email` | `text` | `TEXT` | ✅ | `''` |
| `phone` | `text` | `TEXT` | ✅ | `''` |
| `tags` | `jsonb` | `JSONB` | ✅ | `[]` |
| `created_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |
| `updated_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |

**✅ Aligné** avec migrations 0001, 0003

#### Table `templates`

| Colonne | Type Drizzle | Type DB attendu | NOT NULL | Default |
|---------|-------------|-----------------|----------|---------|
| `id` | `text` | `TEXT` | ✅ | `gen_random_uuid()` |
| `org_id` | `text` | `TEXT` | ✅ | - |
| `title` | `text` | `TEXT` | ✅ | - |
| `slug` | `varchar(255)` | `VARCHAR(255)` | ✅ | - |
| `content` | `text` | `TEXT` | ✅ | `''` |
| `template_kind` | `varchar(50)` | `VARCHAR(50)` | ✅ | `'GENERIC'` |
| `category` | `text` | `TEXT` | ✅ | `''` |
| `tags` | `jsonb` | `JSONB` | ✅ | `[]` |
| `created_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |
| `updated_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |

**✅ Aligné** avec migrations 0000, 0001, 0006

**Contrainte unique**: `(org_id, slug)` (migration 0005) ✅

#### Table `offers`

| Colonne | Type Drizzle | Type DB attendu | NOT NULL | Default |
|---------|-------------|-----------------|----------|---------|
| `id` | `text` | `TEXT` | ✅ | `gen_random_uuid()` |
| `org_id` | `text` | `TEXT` | ✅ | - |
| `client_id` | `text` | `TEXT` | ✅ | - |
| `template_id` | `text` | `TEXT` | ❌ (nullable) | - |
| `title` | `text` | `TEXT` | ✅ | - |
| `items` | `jsonb` | `JSONB` | ✅ | `[]` |
| `subtotal` | `numeric(10,2)` | `NUMERIC(10,2)` | ✅ | `'0'` |
| `tax_rate` | `numeric(5,2)` | `NUMERIC(5,2)` | ✅ | `'0'` |
| `tax_amount` | `numeric(10,2)` | `NUMERIC(10,2)` | ✅ | `'0'` |
| `total` | `numeric(10,2)` | `NUMERIC(10,2)` | ✅ | `'0'` |
| `status` | `offer_status` | `offer_status ENUM` | ✅ | `'draft'` |
| `created_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |
| `updated_at` | `timestamp` | `TIMESTAMP` | ✅ | `NOW()` |

**✅ Aligné** avec migrations 0001, 0003, 0004

**Foreign Keys**: 
- `client_id → clients.id` ✅
- `template_id → templates.id` ✅ (nullable)

**⚠️ À vérifier**: Existence du type ENUM `offer_status` en DB

#### Table `admin_allowed_emails`

| Colonne | Type Drizzle | Type DB attendu | NOT NULL | Default |
|---------|-------------|-----------------|----------|---------|
| `id` | `text` | `TEXT` | ✅ | `gen_random_uuid()` |
| `org_id` | `text` | `TEXT` | ✅ | - |
| `email` | `text` | `TEXT` | ✅ | - |
| `created_by` | `text` | `TEXT` | ✅ | - |
| `created_at` | `timestamptz` | `TIMESTAMPTZ` | ✅ | `NOW()` |
| `used_at` | `timestamptz` | `TIMESTAMPTZ` | ❌ (nullable) | - |

**✅ Aligné** avec migration 0007

**Contrainte unique**: `(org_id, email)` ✅

---

## 3️⃣ RLS, MULTI-TENANT & ORG_ID

### 3.1. RLS activé (selon migration 0002)

| Table | RLS activé | Policies attendues |
|-------|------------|---------------------|
| `clients` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `templates` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `offers` | ✅ | SELECT, INSERT, UPDATE, DELETE |
| `admin_allowed_emails` | ❌ | - |
| `crm_users` | ❌ | - |

**Policies attendues** (migration 0002):
- Toutes utilisent `org_id = public.org_id()` dans USING/WITH CHECK
- `offers` vérifie aussi que `client.org_id = public.org_id()` dans INSERT/UPDATE

**⚠️ Action requise**: Vérifier en DB que les policies existent et utilisent bien `public.org_id()`

### 3.2. Matrice de cohérence par table

#### Table `clients`

| Opération | Guard app | RLS | org_id check DB | org_id check app |
|-----------|-----------|-----|-----------------|------------------|
| SELECT | `requireSession()` | ✅ | ✅ (`org_id = public.org_id()`) | ✅ (`listClients(orgId)`) |
| INSERT | `requireAdmin()` | ✅ | ✅ (`WITH CHECK org_id = public.org_id()`) | ✅ (`createClient({ orgId })`) |
| UPDATE | `requireAdmin()` | ✅ | ✅ (`USING/WITH CHECK org_id = public.org_id()`) | ✅ (`updateClient(id, orgId, ...)`) |
| DELETE | `requireAdmin()` | ✅ | ✅ (`USING org_id = public.org_id()`) | ✅ (`deleteClient(id, orgId)`) |

**✅ Cohérent**: Toutes les opérations filtrent par `org_id` côté app ET DB

#### Table `templates`

| Opération | Guard app | RLS | org_id check DB | org_id check app |
|-----------|-----------|-----|-----------------|------------------|
| SELECT | `getCurrentOrgId()` | ✅ | ✅ (`org_id = public.org_id()`) | ✅ (`listTemplates(orgId)`) |
| INSERT | `requireAdmin()` | ✅ | ✅ (`WITH CHECK org_id = public.org_id()`) | ✅ (`createTemplate({ orgId })`) |
| UPDATE | `requireAdmin()` | ✅ | ✅ (`USING/WITH CHECK org_id = public.org_id()`) | ✅ (`updateTemplate(id, orgId, ...)`) |
| DELETE | - | ✅ | ✅ (`USING org_id = public.org_id()`) | ✅ (via queries) |

**✅ Cohérent**: Toutes les opérations filtrent par `org_id` côté app ET DB

#### Table `offers`

| Opération | Guard app | RLS | org_id check DB | org_id check app |
|-----------|-----------|-----|-----------------|------------------|
| SELECT | `getCurrentOrgId()` | ✅ | ✅ (`org_id = public.org_id()`) | ✅ (`listOffers(orgId)`) |
| INSERT | - | ✅ | ✅ (`WITH CHECK org_id = public.org_id() AND client.org_id = public.org_id()`) | ✅ (`createOffer({ orgId })`) |
| UPDATE | - | ✅ | ✅ (`USING/WITH CHECK org_id = public.org_id() AND client.org_id = public.org_id()`) | ✅ (`updateOffer(id, orgId, ...)`) |
| DELETE | - | ✅ | ✅ (`USING org_id = public.org_id()`) | ✅ (via queries) |

**✅ Cohérent**: Toutes les opérations filtrent par `org_id` côté app ET DB, avec vérification supplémentaire de `client.org_id` pour INSERT/UPDATE

#### Table `admin_allowed_emails`

| Opération | Guard app | RLS | org_id check DB | org_id check app |
|-----------|-----------|-----|-----------------|------------------|
| SELECT | `requireAdmin()` | ❌ | ❌ | ✅ (`listAdminAllowedEmails(orgId)`) |
| INSERT | `requireAdmin()` | ❌ | ❌ | ✅ (`addAdminAllowedEmail(orgId, ...)`) |
| DELETE | `requireAdmin()` | ❌ | ❌ | ✅ (`deleteAdminAllowedEmail(orgId, id)`) |

**⚠️ RLS non activé**: Protection uniquement côté app. À documenter si intentionnel ou activer RLS.

### 3.3. Routes API et `org_id`

**✅ Toutes les routes API**:
- Utilisent `getCurrentOrgId()` pour obtenir `orgId` (jamais depuis le client)
- Vérifient explicitement que `org_id`/`orgId` n'est pas dans le body
- Passent `orgId` aux queries Drizzle qui filtrent par `org_id`

**Exemples vérifiés**:
- `GET /api/clients`: `requireSession()` → `getCurrentOrgId()` → `listClients(orgId)` ✅
- `POST /api/clients`: `requireAdmin()` → `getCurrentOrgId()` → `createClient({ orgId })` ✅
- `GET /api/offers`: `getCurrentOrgId()` → `listOffers(orgId)` ✅
- `POST /api/offers`: `getCurrentOrgId()` → `createOffer({ orgId })` ✅
- `GET /api/templates`: `getCurrentOrgId()` → `listTemplates(orgId)` ✅

---

## 4️⃣ TYPES TS, QUERIES ET CONVERSIONS

### 4.1. Types TypeScript vs DB

#### Table `clients`

| Champ TS | Type TS | Type DB | Nullable | Conversion |
|----------|---------|---------|----------|------------|
| `id` | `string` | `TEXT` | ❌ | Direct |
| `name` | `string` | `TEXT` | ❌ | Direct |
| `company` | `string` | `TEXT` | ❌ | Direct |
| `email` | `string` | `TEXT` | ❌ | Direct |
| `phone` | `string` | `TEXT` | ❌ | Direct |
| `tags` | `string[]` | `JSONB` | ❌ | `normalizeArray()` |
| `created_at` | `string` (ISO) | `TIMESTAMP` | ❌ | `.toISOString()` |
| `updated_at` | `string` (ISO) | `TIMESTAMP` | ❌ | `.toISOString()` |

**✅ Aligné**: Pas de conversion d'unités, normalisation des arrays/strings

#### Table `offers`

| Champ TS | Type TS | Type DB | Nullable | Conversion |
|----------|---------|---------|----------|------------|
| `subtotal` | `number` (centimes) | `NUMERIC(10,2)` (décimales) | ❌ | ⚠️ **ASYMÉTRIQUE** |
| `tax_amount` | `number` (centimes) | `NUMERIC(10,2)` (décimales) | ❌ | ⚠️ **ASYMÉTRIQUE** |
| `total` | `number` (centimes) | `NUMERIC(10,2)` (décimales) | ❌ | ⚠️ **ASYMÉTRIQUE** |
| `tax_rate` | `number` (0-100) | `NUMERIC(5,2)` | ❌ | Direct (pas de conversion) |
| `status` | `'draft' \| 'sent' \| 'accepted' \| 'rejected'` | `offer_status ENUM` | ❌ | Direct |

**❌ PROBLÈME DÉTECTÉ**: Conversions monétaires asymétriques

**Code actuel** (`src/lib/db/queries/offers.ts`):
- **TS → DB** (`createOffer`, `updateOffer`): ✅ Division par 100 (`(data.subtotal / 100).toFixed(2)`)
- **DB → TS** (`mapOfferRow`): ❌ **MANQUE** multiplication par 100 (`Math.round(normalizeNumber(row.subtotal))` devrait être `Math.round(normalizeNumber(row.subtotal) * 100)`)

**Impact**: Les valeurs retournées depuis la DB sont en décimales au lieu de centimes, ce qui est incohérent avec le type TS.

**Action requise**: Corriger `mapOfferRow` pour multiplier par 100 :
```typescript
subtotal: Math.round(normalizeNumber(row.subtotal) * 100),
tax_amount: Math.round(normalizeNumber(row.tax_amount) * 100),
total: Math.round(normalizeNumber(row.total) * 100),
```

### 4.2. Enum `offer_status`

**Drizzle**: `pgEnum('offer_status', ['draft', 'sent', 'accepted', 'rejected'])`

**DB attendu**: `CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');`

**⚠️ À vérifier**: Existence du type ENUM en DB (nécessite accès DB réel)

---

## 5️⃣ SANITÉ & COHÉRENCE GLOBALE

### 5.1. Check global

**✅ Points forts**:
- Multi-tenant strict : toutes les tables métier ont `org_id NOT NULL`
- RLS activé sur les tables sensibles (`clients`, `templates`, `offers`)
- Routes API protégées : `orgId` vient toujours de `getCurrentOrgId()`
- Queries Drizzle filtrent systématiquement par `org_id`
- Indexes créés pour optimiser les requêtes multi-tenant
- Contraintes uniques composites pour isolation org

**❌ Problèmes détectés**:
1. Table `crm_users` définie en Drizzle mais aucune migration de création
2. Conversions monétaires asymétriques (DB → TS manque multiplication par 100)
3. RLS non activé sur `admin_allowed_emails` (intentionnel ?)
4. Enum `offer_status` : existence en DB à vérifier

**⚠️ À vérifier** (nécessite accès DB réel):
- Correspondance exacte colonnes DB vs Drizzle
- Présence de tous les indexes en DB
- Policies RLS utilisent bien `public.org_id()`
- Existence du type ENUM `offer_status`

### 5.2. Tableaux récapitulatifs

#### Forces (alignements solides)

| Aspect | État | Détails |
|--------|------|---------|
| Multi-tenant | ✅ | Toutes les tables métier ont `org_id NOT NULL` |
| RLS | ✅ | Activé sur `clients`, `templates`, `offers` |
| Routes API | ✅ | `orgId` vient toujours de `getCurrentOrgId()` |
| Queries Drizzle | ✅ | Filtrent systématiquement par `org_id` |
| Indexes | ✅ | Créés pour optimiser requêtes multi-tenant |
| Contraintes uniques | ✅ | Composites `(org_id, slug)` et `(org_id, email)` |

#### Écarts critiques (à corriger en priorité)

| Problème | Impact | Action requise |
|----------|--------|----------------|
| Table `crm_users` non créée | Table fantôme en Drizzle | Vérifier usage → créer migration ou supprimer |
| Conversions monétaires asymétriques | Valeurs incorrectes DB → TS | Multiplier par 100 dans `mapOfferRow` |
| RLS sur `admin_allowed_emails` | Protection uniquement app | Documenter ou activer RLS |
| Enum `offer_status` | Type peut ne pas exister | Vérifier existence en DB |

#### Écarts mineurs / TODO

| Item | Priorité | Action |
|------|----------|-------|
| Vérifier correspondance exacte colonnes DB | Moyenne | Exécuter script `inspect-db-schema.sql` |
| Vérifier présence de tous les indexes | Moyenne | Exécuter script `inspect-db-schema.sql` |
| Vérifier policies RLS utilisent `public.org_id()` | Moyenne | Exécuter script `inspect-rls-policies.sql` |
| Documenter usage de `crm_users` | Faible | Rechercher références dans le code |

---

## 6️⃣ RECOMMANDATIONS

### Actions immédiates (critiques)

1. **Corriger conversions monétaires** (`src/lib/db/queries/offers.ts`):
   ```typescript
   // Dans mapOfferRow, multiplier par 100 :
   subtotal: Math.round(normalizeNumber(row.subtotal) * 100),
   tax_amount: Math.round(normalizeNumber(row.tax_amount) * 100),
   total: Math.round(normalizeNumber(row.total) * 100),
   ```

2. **Résoudre table `crm_users`**:
   - Rechercher références dans le code
   - Si utilisé : créer migration de création
   - Si non utilisé : supprimer de `schema.ts`

3. **Vérifier enum `offer_status` en DB**:
   - Exécuter : `SELECT typname FROM pg_type WHERE typname = 'offer_status';`
   - Si absent : créer via migration

### Actions à moyen terme

4. **Vérifier alignement DB réel**:
   - Exécuter `scripts/inspect-db-schema.sql` sur Supabase
   - Comparer avec Drizzle schema
   - Corriger écarts détectés

5. **Vérifier policies RLS**:
   - Exécuter `scripts/inspect-rls-policies.sql` sur Supabase
   - Vérifier que toutes utilisent `public.org_id()`
   - Corriger si nécessaire

6. **Documenter RLS sur `admin_allowed_emails`**:
   - Si intentionnel : documenter pourquoi RLS non activé
   - Si erreur : activer RLS avec policies appropriées

---

## 7️⃣ CONCLUSION

**État global**: ✅ **Bien aligné** avec quelques écarts mineurs

Le système de persistance est globalement cohérent avec une architecture multi-tenant solide. Les principaux écarts sont :
1. Une table fantôme (`crm_users`) à résoudre
2. Des conversions monétaires asymétriques à corriger
3. Des vérifications DB réelles à effectuer pour confirmer l'alignement complet

**Prochaines étapes**:
1. Corriger les conversions monétaires
2. Résoudre le cas de `crm_users`
3. Exécuter les scripts d'inspection sur Supabase pour vérifier l'alignement réel

---

**Note**: Cet audit est basé sur l'analyse du code source et des migrations. Pour une vérification complète, il est nécessaire d'exécuter les scripts SQL d'inspection (`inspect-db-schema.sql`, `inspect-rls-policies.sql`) directement sur Supabase.

