# Migration 0005: Contrainte unique composite (org_id, slug) sur templates

## Objectif

Changer la contrainte unique sur `templates.slug` d'une unicité globale à une unicité par organisation `(org_id, slug)`.

## Contexte

- **Avant** : Le slug était unique globalement (contrainte unique sur `slug` seul)
- **Après** : Le slug est unique par organisation (contrainte unique composite sur `(org_id, slug)`)
- **Raison** : Aligner la contrainte DB avec la logique multi-tenant utilisée dans tout le code applicatif

## Changements

### 1. Schéma Drizzle (`src/lib/db/schema.ts`)

- ✅ Retiré `.unique()` sur la colonne `slug`
- ✅ Ajouté contrainte unique composite via `uniqueIndex('templates_org_id_slug_unique').on(table.org_id, table.slug)`

### 2. Migration SQL (`drizzle/0005_add_templates_org_id_slug_unique.sql`)

- ✅ Drop dynamique de l'ancienne contrainte unique sur `slug`
- ✅ Création de la nouvelle contrainte unique composite `(org_id, slug)`
- ✅ Vérification automatique de la migration

### 3. Code applicatif

- ✅ Commentaires mis à jour dans `src/lib/db/queries/templates.ts` pour refléter la nouvelle contrainte
- ✅ Le code existant est déjà cohérent (toutes les vérifications utilisent `orgId`)

## Vérification avant migration

### 1. Vérifier que la table templates existe et a toutes les colonnes nécessaires

**⚠️ IMPORTANT** : Si vous obtenez l'erreur `column "slug" does not exist`, la table `templates` n'a probablement pas toutes les colonnes requises.

Exécutez d'abord le script de diagnostic :

```bash
psql $DATABASE_URL -f drizzle/CHECK_TEMPLATES_SCHEMA.sql
```

Ou manuellement :

```sql
-- Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'templates'
) AS table_exists;

-- Lister les colonnes existantes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
ORDER BY ordinal_position;
```

**Si la colonne `slug` n'existe pas**, appliquez d'abord la migration `0000_adapt_templates_table.sql` :

```bash
psql $DATABASE_URL -f drizzle/0000_adapt_templates_table.sql
```

Cette migration :
- Ajoute la colonne `slug` (générée depuis `title` pour les données existantes)
- Migre les données de `organization_id` (uuid) vers `org_id` (text) si nécessaire
- Ajoute la colonne `tags` (extrait de `metadata` si possible)
- Met à jour les index pour utiliser `org_id` au lieu de `organization_id`

### 2. Vérifier qu'il n'y a pas de doublons `(org_id, slug)`

Une fois que la table a toutes les colonnes :

```sql
SELECT org_id, slug, COUNT(*) as count
FROM templates
GROUP BY org_id, slug
HAVING COUNT(*) > 1;
```

Si des doublons existent, les résoudre avant d'appliquer la migration 0005.

## Application de la migration

```bash
# Option 1: Via Drizzle Kit (recommandé)
npm run db:migrate

# Option 2: Application manuelle
psql $DATABASE_URL -f drizzle/0005_add_templates_org_id_slug_unique.sql
```

## Vérification après migration

```sql
-- Vérifier que la nouvelle contrainte existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'templates' 
  AND indexname = 'templates_org_id_slug_unique';

-- Vérifier que l'ancienne contrainte n'existe plus
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'templates'::regclass
  AND contype = 'u'
  AND array_length(conkey, 1) = 1;
```

## Test de la contrainte

```sql
-- Test 1: Deux organisations peuvent avoir le même slug (devrait réussir)
INSERT INTO templates (org_id, slug, title) VALUES ('org-1', 'test-slug', 'Test 1');
INSERT INTO templates (org_id, slug, title) VALUES ('org-2', 'test-slug', 'Test 2');

-- Test 2: Même organisation, même slug (devrait échouer)
INSERT INTO templates (org_id, slug, title) VALUES ('org-1', 'test-slug', 'Test 3');
-- Erreur attendue: duplicate key value violates unique constraint "templates_org_id_slug_unique"
```

## Rollback (si nécessaire)

```sql
-- Supprimer la nouvelle contrainte
DROP INDEX IF EXISTS templates_org_id_slug_unique;

-- Recréer l'ancienne contrainte (si nécessaire)
ALTER TABLE templates ADD CONSTRAINT templates_slug_key UNIQUE (slug);
```

## Impact

- ✅ **Aucun impact sur le code applicatif** : toutes les fonctions utilisent déjà `orgId` pour vérifier l'unicité
- ✅ **Amélioration de la cohérence** : la contrainte DB reflète maintenant la logique applicative
- ✅ **Meilleure isolation multi-tenant** : différentes organisations peuvent utiliser le même slug

## Notes

- La migration est idempotente (utilise `IF NOT EXISTS` et `IF EXISTS`)
- Les Server Actions (`createTemplateFromParsedDocx`, `duplicateTemplate`) vérifient déjà l'unicité avec `getTemplateBySlug(slug, orgId)` avant insertion
- En cas de race condition, la contrainte DB protégera contre les doublons

