# VÉRIFICATION ALIGNEMENT DRIZZLE ↔ SUPABASE

**Date**: 2024-12-19

---

## 📋 RÉSUMÉ (5-8 lignes)

Analyse basée sur code Drizzle + migrations SQL montre **alignement théorique correct** pour les 4 tables métier principales (`clients`, `templates`, `offers`, `admin_allowed_emails`). **Table `crm_users` définie en Drizzle mais absente des migrations** (table fantôme, non utilisée dans le code). **Enum `offer_status` nécessite vérification en DB**. Vérification complète colonnes/indexes requiert exécution SQL sur Supabase via `scripts/inspect-db-schema.sql`. **Actions immédiates** : supprimer `crm_users` de `schema.ts`, vérifier enum `offer_status` en DB, exécuter scripts d'inspection pour confirmation finale.

---

## 📊 TABLEAU ALIGNÉ / DIVERGENT / FANTÔME

| Table | État | Détails | Action |
|-------|------|---------|--------|
| `clients` | ✅ **Aligné** | Toutes colonnes présentes selon migrations, indexes créés | Aucune (vérifier colonnes en DB) |
| `templates` | ✅ **Aligné** | Toutes colonnes présentes, contrainte unique `(org_id, slug)` créée | Aucune (vérifier colonnes en DB) |
| `offers` | ⚠️ **Partiel** | Colonnes présentes mais enum `offer_status` non vérifié en DB | Vérifier enum en DB, créer migration si absent |
| `admin_allowed_emails` | ✅ **Aligné** | Toutes colonnes présentes, contrainte unique créée | Aucune (vérifier colonnes en DB) |
| `crm_users` | ❌ **Fantôme** | Définie en Drizzle mais aucune migration de création, non utilisée | **Supprimer de `schema.ts`** |

---

## 🔧 PROPOSITIONS DE CORRECTION

### ❌ Table fantôme : `crm_users`

**Problème**: Définie en Drizzle mais absente des migrations et non utilisée dans le code.

**Correction**: Supprimer de `src/lib/db/schema.ts` (lignes 59-65)

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

### ⚠️ Enum `offer_status` non vérifié

**Problème**: Drizzle définit `pgEnum('offer_status', [...])` mais existence en DB non vérifiée.

**Vérification requise**:
```sql
SELECT typname FROM pg_type WHERE typname = 'offer_status';
```

**Correction si absent**: Créer migration `drizzle/0008_create_offer_status_enum.sql`:
```sql
CREATE TYPE offer_status AS ENUM ('draft', 'sent', 'accepted', 'rejected');
```

---

### ⚠️ Vérification complète colonnes/indexes

**Action requise**: Exécuter `scripts/inspect-db-schema.sql` sur Supabase pour vérifier :
- Types exacts des colonnes
- Nullability (`NOT NULL` vs nullable)
- Defaults
- Présence de tous les indexes
- Présence des contraintes uniques

**Correction**: Créer migrations pour corriger écarts détectés.

---

## ✅ ACTIONS IMMÉDIATES

1. ✅ **Supprimer `crm_users` de `schema.ts`**
2. ⚠️ **Vérifier enum `offer_status` en DB** (SQL ci-dessus)
3. ⚠️ **Exécuter `scripts/inspect-db-schema.sql` sur Supabase**
4. ⚠️ **Comparer résultats avec Drizzle et corriger écarts si nécessaire**


