# Drizzle Migrations

Ce dossier contient les migrations SQL pour la base de données.

## Migration 0001: Ajout de `org_id` pour multi-tenancy

**Fichier**: `0001_add_org_id_to_tables.sql`

### Description

Cette migration ajoute la colonne `org_id` (non nulle) aux tables métier :
- `clients`
- `templates`
- `offers`

### Application de la migration

#### Option 1: Via psql (recommandé)

```bash
psql $DATABASE_URL -f drizzle/0001_add_org_id_to_tables.sql
```

#### Option 2: Via Supabase Dashboard

1. Ouvrir le SQL Editor dans Supabase Dashboard
2. Copier le contenu de `0001_add_org_id_to_tables.sql`
3. Exécuter la requête

### ⚠️ IMPORTANT: Données existantes

Cette migration utilise une valeur temporaire `'default-org'` pour les lignes existantes.

**AVANT de déployer en production**, vous DEVEZ :

1. Identifier les `org_id` réels depuis les métadonnées utilisateur Supabase
2. Mettre à jour les lignes existantes avec les vrais `org_id` :

```sql
-- Exemple pour clients (adapter selon votre logique)
UPDATE clients 
SET org_id = (
  SELECT user_metadata->>'org_id' 
  FROM auth.users 
  WHERE auth.users.id = clients.created_by_user_id  -- adapter selon votre schéma
)
WHERE org_id = 'default-org';

-- Répéter pour templates et offers
```

3. Vérifier qu'il n'y a plus de `'default-org'` :

```sql
SELECT COUNT(*) FROM clients WHERE org_id = 'default-org';
SELECT COUNT(*) FROM templates WHERE org_id = 'default-org';
SELECT COUNT(*) FROM offers WHERE org_id = 'default-org';
```

### Index créés

La migration crée des index sur `org_id` pour optimiser les requêtes filtrées par organisation :
- `idx_clients_org_id`
- `idx_templates_org_id`
- `idx_offers_org_id`

### Note sur le slug unique

Le schéma actuel garde `slug` unique globalement sur `templates`. 
Pour un vrai multi-tenancy, considérez rendre `slug` unique par `org_id` :

```sql
-- À faire après la migration si nécessaire
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_slug_unique;
CREATE UNIQUE INDEX idx_templates_slug_org_id ON templates(slug, org_id);
```

---

## Migration 0002: Activation de Row Level Security (RLS)

**Fichier**: `0002_enable_rls.sql`

### Description

Cette migration active Row Level Security (RLS) sur les tables métier et crée des politiques pour garantir l'isolation des données par `org_id` :

- `clients`
- `templates`
- `offers`

### Prérequis

⚠️ **IMPORTANT**: Cette migration doit être appliquée **APRÈS** la migration 0001 et **APRÈS** avoir mis à jour toutes les lignes existantes avec de vrais `org_id` (pas de `'default-org'`).

### Application de la migration

#### Option 1: Via psql (recommandé)

```bash
psql $DATABASE_URL -f drizzle/0002_enable_rls.sql
```

#### Option 2: Via Supabase Dashboard

1. Ouvrir le SQL Editor dans Supabase Dashboard
2. Copier le contenu de `0002_enable_rls.sql`
3. Exécuter la requête

### Ce que fait cette migration

1. **Active RLS** sur les trois tables métier
2. **Crée une fonction helper** `auth.org_id()` qui extrait l'`org_id` depuis le JWT de l'utilisateur authentifié
3. **Crée des politiques** pour chaque opération (SELECT, INSERT, UPDATE, DELETE) sur chaque table :
   - Les utilisateurs ne peuvent voir que les lignes avec leur `org_id`
   - Les utilisateurs ne peuvent créer/modifier/supprimer que les lignes avec leur `org_id`
   - Pour `offers`, vérifie aussi que le `client_id` référencé appartient à la même organisation

### Vérification après migration

Pour tester que RLS fonctionne correctement :

```sql
-- 1. Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'templates', 'offers');

-- 2. Vérifier les politiques créées
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('clients', 'templates', 'offers');

-- 3. Tester avec un utilisateur authentifié
-- (doit être fait depuis l'application avec un utilisateur ayant org_id dans user_metadata)
```

### Comportement attendu

- ✅ Les utilisateurs avec `org_id` dans leur JWT voient uniquement leurs données
- ✅ Les utilisateurs sans `org_id` dans leur JWT voient des résultats vides (pas d'erreur)
- ✅ Impossible de créer/modifier des lignes avec un `org_id` différent du sien
- ✅ Impossible de référencer un `client` d'une autre organisation dans une `offer`

### Dépannage

Si vous devez temporairement désactiver RLS pour maintenance :

```sql
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE offers DISABLE ROW LEVEL SECURITY;
```

⚠️ **Réactiver RLS immédiatement après la maintenance** :

```sql
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
```

