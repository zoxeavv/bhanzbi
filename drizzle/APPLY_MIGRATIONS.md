# Guide d'application des migrations Templates

## État actuel

✅ **Table `templates` existe mais est vide** (0 lignes)
✅ **Structure identifiée** : colonnes existantes confirmées
✅ **Colonnes manquantes** : `slug` (requis), `tags` (optionnel mais recommandé)

## Ordre d'application des migrations

### Étape 1 : Adapter la table (ajouter colonnes manquantes)

```bash
psql $DATABASE_URL -f drizzle/0000_adapt_templates_table.sql
```

**Ce que fait cette migration** :
- ✅ Ajoute la colonne `slug` (VARCHAR(255) NOT NULL)
- ✅ Ajoute la colonne `tags` (JSONB NOT NULL DEFAULT '[]')
- ✅ Migre `organization_id` → `org_id` si nécessaire (pas de données donc pas d'impact)
- ✅ Met à jour les index pour utiliser `org_id`

**Vérification après** :
```sql
-- Vérifier que slug existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
  AND column_name IN ('slug', 'tags', 'org_id')
ORDER BY column_name;
```

### Étape 2 : Vérifier qu'il n'y a pas de doublons

```sql
-- Cette requête devrait retourner 0 lignes (table vide)
SELECT org_id, slug, COUNT(*) as count
FROM templates
GROUP BY org_id, slug
HAVING COUNT(*) > 1;
```

### Étape 3 : Appliquer la contrainte unique composite

```bash
psql $DATABASE_URL -f drizzle/0005_add_templates_org_id_slug_unique.sql
```

**Ce que fait cette migration** :
- ✅ Supprime l'ancienne contrainte unique sur `slug` seul (si elle existe)
- ✅ Crée la contrainte unique composite `(org_id, slug)`

**Vérification après** :
```sql
-- Vérifier que la nouvelle contrainte existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'templates' 
  AND indexname = 'templates_org_id_slug_unique';
```

## Résultat attendu

Après les migrations, la table `templates` aura :

### Colonnes requises (Drizzle schema)
- ✅ `id` (uuid, PRIMARY KEY)
- ✅ `org_id` (text, NOT NULL)
- ✅ `title` (varchar, NOT NULL)
- ✅ `slug` (varchar(255), NOT NULL) ← **AJOUTÉ**
- ✅ `content` (text, NOT NULL)
- ✅ `category` (varchar, nullable)
- ✅ `tags` (jsonb, NOT NULL DEFAULT '[]') ← **AJOUTÉ**
- ✅ `created_at` (timestamp, NOT NULL)
- ✅ `updated_at` (timestamp, NOT NULL)

### Colonnes supplémentaires (conservées)
- `organization_id` (uuid) - peut être supprimée plus tard si non utilisée
- `created_by_profile_id` (uuid)
- `is_draft` (boolean)
- `preview_image_url` (text)
- `metadata` (jsonb)

### Contraintes
- ✅ PRIMARY KEY sur `id`
- ✅ UNIQUE composite sur `(org_id, slug)` ← **NOUVELLE**

## Test de la contrainte

Une fois les migrations appliquées, testez la contrainte :

```sql
-- Test 1: Deux organisations peuvent avoir le même slug (devrait réussir)
INSERT INTO templates (org_id, slug, title, content) 
VALUES ('org-1', 'test-slug', 'Test 1', '{}');

INSERT INTO templates (org_id, slug, title, content) 
VALUES ('org-2', 'test-slug', 'Test 2', '{}');

-- Test 2: Même organisation, même slug (devrait échouer)
INSERT INTO templates (org_id, slug, title, content) 
VALUES ('org-1', 'test-slug', 'Test 3', '{}');
-- Erreur attendue: duplicate key value violates unique constraint "templates_org_id_slug_unique"
```

## Notes importantes

1. **Table vide** : Comme la table est vide, la migration est sans risque
2. **Slug auto-généré** : Pour les futures insertions, le code applicatif génère les slugs depuis les titres
3. **Tags** : La colonne `tags` est initialisée à `[]` par défaut
4. **Index** : Les index existants sont mis à jour pour utiliser `org_id` (text) au lieu de `organization_id` (uuid)

## Rollback (si nécessaire)

Si vous devez annuler les migrations :

```sql
-- Supprimer la contrainte unique composite
DROP INDEX IF EXISTS templates_org_id_slug_unique;

-- Supprimer les colonnes ajoutées (ATTENTION: perte de données)
ALTER TABLE templates DROP COLUMN IF EXISTS slug;
ALTER TABLE templates DROP COLUMN IF EXISTS tags;
```

