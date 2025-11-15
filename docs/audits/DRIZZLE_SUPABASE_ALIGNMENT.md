# VÉRIFICATION ALIGNEMENT DRIZZLE ↔ SUPABASE

**Date**: 2024-12-19  
**Méthode**: Analyse du code Drizzle + migrations SQL (vérification DB réelle requise)

---

## 📋 RÉSUMÉ EXÉCUTIF

**État**: ⚠️ **À vérifier via DB réelle** - Analyse basée sur code/migrations montre alignement théorique correct avec quelques points à confirmer.

**Tables Drizzle**: 5 (`clients`, `templates`, `offers`, `crm_users`, `admin_allowed_emails`)  
**Tables créées par migrations**: 4 (`clients`, `templates`, `offers`, `admin_allowed_emails`)

**Points critiques**:
- ✅ Tables métier principales alignées (clients, templates, offers, admin_allowed_emails)
- ❌ Table `crm_users` définie en Drizzle mais **aucune migration de création** (table fantôme)
- ⚠️ Enum `offer_status` : existence en DB à vérifier
- ⚠️ Vérification colonnes/indexes nécessite exécution SQL sur Supabase

---

## 1️⃣ INVENTAIRE

### Tables définies en Drizzle (`src/lib/db/schema.ts`)

| Table | Colonnes | PK | FK | Uniques | Indexes |
|-------|----------|----|----|---------|---------|
| `clients` | 9 | `id` | - | - | `idx_clients_org_id`, `idx_clients_created_at` |
| `templates` | 10 | `id` | - | `(org_id, slug)` | `idx_templates_org_id`, `idx_templates_created_at` |
| `offers` | 13 | `id` | `client_id`, `template_id` | - | 6 indexes |
| `crm_users` | 5 | `id` | - | `email` | - |
| `admin_allowed_emails` | 6 | `id` | - | `(org_id, email)` | 2 indexes |

### Tables créées par migrations SQL

**Migration 0000**: `templates` (création initiale)  
**Migration 0001**: `org_id` ajouté à `clients`, `templates`, `offers`  
**Migration 0002**: RLS activé  
**Migration 0003**: Indexes créés  
**Migration 0004**: Indexes `offers.client_id`  
**Migration 0005**: Contrainte unique `(org_id, slug)` sur `templates`  
**Migration 0006**: Colonne `template_kind` ajoutée à `templates`  
**Migration 0007**: Table `admin_allowed_emails` créée

**Tables créées**: `clients`, `templates`, `offers`, `admin_allowed_emails`

---

## 2️⃣ COMPARAISON TABLE PAR TABLE

### Table `clients`

**Drizzle**:
- Colonnes: `id`, `org_id`, `name`, `company`, `email`, `phone`, `tags`, `created_at`, `updated_at`
- Types: `text` (sauf `tags: jsonb`, `created_at/updated_at: timestamp`)
- PK: `id`
- Indexes: `idx_clients_org_id`, `idx_clients_created_at`

**Migrations**:
- ✅ Créée/modifiée par migrations 0001, 0003
- ✅ `org_id NOT NULL` ajouté (0001)
- ✅ Indexes créés (0003)

**État**: ✅ **Aligné** (selon migrations)

**À vérifier en DB**:
- Présence de toutes les colonnes avec types corrects
- Présence des indexes `idx_clients_org_id`, `idx_clients_created_at`

---

### Table `templates`

**Drizzle**:
- Colonnes: `id`, `org_id`, `title`, `slug`, `content`, `template_kind`, `category`, `tags`, `created_at`, `updated_at`
- Types: `text` (sauf `slug: varchar(255)`, `template_kind: varchar(50)`, `tags: jsonb`)
- PK: `id`
- Unique: `(org_id, slug)` → `templates_org_id_slug_unique`
- Indexes: `idx_templates_org_id`, `idx_templates_created_at`

**Migrations**:
- ✅ Créée par migration 0000
- ✅ `org_id` ajouté (0001)
- ✅ `template_kind` ajouté (0006)
- ✅ Contrainte unique `(org_id, slug)` créée (0005)
- ✅ Indexes créés (0003)

**État**: ✅ **Aligné** (selon migrations)

**À vérifier en DB**:
- Présence de `template_kind VARCHAR(50) NOT NULL DEFAULT 'GENERIC'`
- Présence de la contrainte unique `templates_org_id_slug_unique`
- Présence des indexes

---

### Table `offers`

**Drizzle**:
- Colonnes: `id`, `org_id`, `client_id`, `template_id`, `title`, `items`, `subtotal`, `tax_rate`, `tax_amount`, `total`, `status`, `created_at`, `updated_at`
- Types: `text` (sauf `items: jsonb`, montants `numeric(10,2)` ou `numeric(5,2)`, `status: offer_status`)
- PK: `id`
- FK: `client_id → clients.id`, `template_id → templates.id`
- Indexes: 6 indexes (org_id, created_at, composites)

**Migrations**:
- ✅ `org_id` ajouté (0001)
- ✅ Indexes créés (0003, 0004)
- ⚠️ Enum `offer_status` : pas de migration explicite de création

**État**: ⚠️ **Partiellement aligné** - Enum à vérifier

**À vérifier en DB**:
- Existence du type ENUM `offer_status` avec valeurs `['draft', 'sent', 'accepted', 'rejected']`
- Présence de toutes les colonnes avec types corrects
- Présence des 6 indexes attendus
- Foreign keys vers `clients` et `templates`

---

### Table `admin_allowed_emails`

**Drizzle**:
- Colonnes: `id`, `org_id`, `email`, `created_by`, `created_at`, `used_at`
- Types: `text` (sauf `created_at/used_at: timestamptz`)
- PK: `id`
- Unique: `(org_id, email)` → `admin_allowed_emails_org_id_email_unique`
- Indexes: `idx_admin_allowed_emails_org_id`, `idx_admin_allowed_emails_email`

**Migrations**:
- ✅ Créée par migration 0007
- ✅ Toutes les colonnes créées
- ✅ Contrainte unique créée
- ✅ Indexes créés

**État**: ✅ **Aligné** (selon migrations)

**À vérifier en DB**:
- Présence de toutes les colonnes
- Type `TIMESTAMPTZ` pour `created_at` et `used_at` (pas `TIMESTAMP`)
- Présence de la contrainte unique et des indexes

---

### Table `crm_users`

**Drizzle**:
- Colonnes: `id`, `email`, `org_id`, `created_at`, `updated_at`
- Types: `text` (sauf `created_at/updated_at: timestamp`)
- PK: `id`
- Unique: `email`

**Migrations**:
- ❌ **AUCUNE migration de création**

**État**: ❌ **TABLE FANTÔME** - Définie en Drizzle mais non créée en DB

**Action requise**:
- Vérifier si utilisée dans le code
- Si non utilisée : supprimer de `schema.ts`
- Si utilisée : créer migration de création

---

## 3️⃣ TABLEAU RÉCAPITULATIF

| Table | Existe en DB | Colonnes alignées | PK/FK alignés | Indexes alignés | État |
|-------|--------------|-------------------|---------------|-----------------|------|
| `clients` | ✅ (migration) | ✅ (théorique) | ✅ | ✅ (théorique) | ✅ Aligné |
| `templates` | ✅ (migration) | ✅ (théorique) | ✅ | ✅ (théorique) | ✅ Aligné |
| `offers` | ✅ (migration) | ⚠️ (enum à vérifier) | ✅ | ✅ (théorique) | ⚠️ Partiel |
| `admin_allowed_emails` | ✅ (migration) | ✅ (théorique) | ✅ | ✅ (théorique) | ✅ Aligné |
| `crm_users` | ❌ (pas de migration) | N/A | N/A | N/A | ❌ Fantôme |

---

## 4️⃣ DIVERGENCES DÉTECTÉES

### ❌ Table fantôme : `crm_users`

**Problème**: Définie en Drizzle mais aucune migration de création.

**Vérification code**:
- ✅ Aucune référence dans les queries (`src/lib/db/queries/`)
- ✅ Aucune référence dans les routes API
- ✅ Seulement définie dans `schema.ts`

**Action**: **Supprimer de `schema.ts`** (table non utilisée)

---

### ⚠️ Enum `offer_status` non vérifié

**Problème**: Drizzle définit `pgEnum('offer_status', [...])` mais aucune migration explicite de création du type ENUM.

**Vérification requise en DB**:
```sql
SELECT typname, typtype 
FROM pg_type 
WHERE typname = 'offer_status';
```

**Action si absent**: Créer migration :
```sql
CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
```

---

### ⚠️ Vérifications colonnes/indexes nécessaires

**Script SQL à exécuter sur Supabase**:
```bash
# Utiliser scripts/inspect-db-schema.sql
```

**Points à vérifier**:
- Types exacts des colonnes (ex: `VARCHAR(255)` vs `TEXT`)
- Nullability (`NOT NULL` vs nullable)
- Defaults (ex: `'GENERIC'` vs `'GENERIC'::character varying`)
- Présence de tous les indexes
- Présence des contraintes uniques

---

## 5️⃣ PROPOSITIONS DE CORRECTION

### Correction 1 : Supprimer table `crm_users`

**Fichier**: `src/lib/db/schema.ts`  
**Action**: Supprimer lignes 59-65

```typescript
// SUPPRIMER :
export const crm_users = pgTable('crm_users', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  email: text('email').notNull().unique(),
  org_id: text('org_id'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
```

---

### Correction 2 : Vérifier/créer enum `offer_status`

**Script SQL à exécuter**:
```sql
-- Vérifier existence
SELECT typname FROM pg_type WHERE typname = 'offer_status';

-- Si absent, créer :
CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
```

**Migration à créer si nécessaire**: `drizzle/0008_create_offer_status_enum.sql`

---

### Correction 3 : Vérifier alignement colonnes (nécessite DB)

**Script à exécuter**: `scripts/inspect-db-schema.sql` sur Supabase

**Comparer avec Drizzle**:
- Types exacts
- Nullability
- Defaults
- Indexes

**Corriger via migration** si divergences détectées.

---

## 6️⃣ ACTIONS RECOMMANDÉES

### Immédiat

1. ✅ **Supprimer `crm_users` de `schema.ts`** (table non utilisée)
2. ⚠️ **Vérifier enum `offer_status` en DB** (exécuter SQL ci-dessus)
3. ⚠️ **Exécuter `scripts/inspect-db-schema.sql`** sur Supabase pour vérification complète

### À moyen terme

4. Comparer résultats SQL avec Drizzle schema
5. Créer migrations pour corriger écarts détectés
6. Vérifier indexes et contraintes uniques

---

## 7️⃣ CONCLUSION

**État global**: ✅ **Bien aligné théoriquement** avec quelques points à vérifier en DB réelle.

**Tables métier principales** (`clients`, `templates`, `offers`, `admin_allowed_emails`) sont alignées selon les migrations. La table `crm_users` est une table fantôme à supprimer. L'enum `offer_status` nécessite une vérification en DB.

**Prochaines étapes**:
1. Supprimer `crm_users` de `schema.ts`
2. Exécuter les scripts SQL d'inspection sur Supabase
3. Comparer résultats avec Drizzle et corriger écarts si nécessaire

---

**Note**: Cette analyse est basée sur le code source et les migrations. Une vérification directe en DB est nécessaire pour confirmer l'alignement complet. Utiliser `scripts/inspect-db-schema.sql` et `scripts/inspect-rls-policies.sql` pour la vérification finale.


