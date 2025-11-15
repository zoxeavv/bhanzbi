# Instructions pour appliquer les migrations Templates

## Option 1 : Via le script Node.js (recommandé si DATABASE_URL est disponible)

### Étape 1 : Définir DATABASE_URL

```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# ou
export DATABASE_URL="postgresql://postgres:password@localhost:5432/mydb"
```

### Étape 2 : Appliquer les migrations

```bash
# Migration 1: Ajouter colonnes slug et tags
node scripts/apply-migration.js drizzle/0000_adapt_templates_table.sql

# Migration 2: Ajouter contrainte unique composite (org_id, slug)
node scripts/apply-migration.js drizzle/0005_add_templates_org_id_slug_unique.sql
```

## Option 2 : Via Supabase Dashboard (si vous utilisez Supabase)

1. Ouvrez votre projet Supabase
2. Allez dans **SQL Editor**
3. Copiez le contenu de `drizzle/0000_adapt_templates_table.sql`
4. Collez et exécutez dans le SQL Editor
5. Répétez pour `drizzle/0005_add_templates_org_id_slug_unique.sql`

## Option 3 : Via psql (si installé localement)

```bash
# Définir DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Appliquer les migrations
psql $DATABASE_URL -f drizzle/0000_adapt_templates_table.sql
psql $DATABASE_URL -f drizzle/0005_add_templates_org_id_slug_unique.sql
```

## Option 4 : Via votre IDE/outil de gestion de base de données

1. Connectez-vous à votre base de données PostgreSQL
2. Ouvrez le fichier `drizzle/0000_adapt_templates_table.sql`
3. Exécutez le script SQL
4. Répétez pour `drizzle/0005_add_templates_org_id_slug_unique.sql`

## Ordre d'application

⚠️ **IMPORTANT** : Appliquez les migrations dans cet ordre :

1. **D'abord** : `drizzle/0000_adapt_templates_table.sql`
   - Ajoute les colonnes `slug` et `tags`
   - Met à jour les index

2. **Ensuite** : `drizzle/0005_add_templates_org_id_slug_unique.sql`
   - Crée la contrainte unique composite `(org_id, slug)`

## Vérification après migration

Après avoir appliqué les deux migrations, vérifiez :

```sql
-- 1. Vérifier que slug et tags existent
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'templates'
  AND column_name IN ('slug', 'tags')
ORDER BY column_name;

-- 2. Vérifier que la contrainte unique composite existe
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'templates' 
  AND indexname = 'templates_org_id_slug_unique';

-- 3. Tester la contrainte (si la table n'est pas vide)
SELECT org_id, slug, COUNT(*) as count
FROM templates
GROUP BY org_id, slug
HAVING COUNT(*) > 1;
-- Devrait retourner 0 lignes
```

## Résultat attendu

Après les migrations :
- ✅ Colonne `slug` ajoutée (VARCHAR(255) NOT NULL)
- ✅ Colonne `tags` ajoutée (JSONB NOT NULL DEFAULT '[]')
- ✅ Contrainte unique composite `(org_id, slug)` créée
- ✅ Index mis à jour pour utiliser `org_id` (text)

## En cas d'erreur

Si vous rencontrez une erreur, vérifiez :
1. Que `DATABASE_URL` est correctement défini
2. Que vous avez les permissions nécessaires sur la base de données
3. Que la table `templates` existe
4. Les logs d'erreur pour plus de détails

