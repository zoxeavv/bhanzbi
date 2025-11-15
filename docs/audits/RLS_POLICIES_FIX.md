# CORRECTION DES POLICIES RLS MANQUANTES

**Date**: 2024-12-19  
**Problème détecté**: Policies RLS manquantes en DB réelle

---

## 🚨 PROBLÈME DÉTECTÉ

Vérification en DB réelle via `scripts/inspect-rls-policies.sql` a révélé des policies manquantes :

| Table | SELECT | INSERT | UPDATE | DELETE | État |
|-------|--------|--------|--------|--------|------|
| `clients` | ❌ | ❌ | ✅ | ✅ | **CRITIQUE** |
| `templates` | ❌ | ✅ | ✅ | ✅ | **CRITIQUE** |
| `offers` | ❌ | ❌ | ✅ | ✅ | **CRITIQUE** |
| `admin_allowed_emails` | ⚠️ | ⚠️ | ⚠️ | ⚠️ | Attendu (RLS non activé) |

**Impact**:
- ❌ **Les utilisateurs ne peuvent pas lire les données** (SELECT manquant)
- ❌ **Les utilisateurs ne peuvent pas créer de nouvelles données** (INSERT manquant sur `clients` et `offers`)
- ⚠️ **Seules les opérations UPDATE et DELETE fonctionnent** (sur les données existantes)

**Cause probable**:
- Script de nettoyage (`cleanup-duplicate-rls-policies.sql`) a peut-être supprimé des policies par erreur
- Migration incomplète ou rollback partiel
- Policies jamais créées correctement

---

## ✅ SOLUTION

**Migration créée**: `drizzle/0008_fix_missing_rls_policies.sql`

Cette migration :
1. ✅ Recrée toutes les policies manquantes (SELECT et INSERT)
2. ✅ Recrée aussi UPDATE et DELETE pour garantir leur existence
3. ✅ Utilise `DROP POLICY IF EXISTS` + `CREATE POLICY` pour être idempotente
4. ✅ Vérifie que toutes les policies existent après création

**Policies recréées**:

### Table `clients`
- ✅ SELECT: `USING (org_id = public.org_id())`
- ✅ INSERT: `WITH CHECK (org_id = public.org_id())`
- ✅ UPDATE: `USING/WITH CHECK (org_id = public.org_id())`
- ✅ DELETE: `USING (org_id = public.org_id())`

### Table `templates`
- ✅ SELECT: `USING (org_id = public.org_id())`
- ✅ INSERT: `WITH CHECK (org_id = public.org_id())`
- ✅ UPDATE: `USING/WITH CHECK (org_id = public.org_id())`
- ✅ DELETE: `USING (org_id = public.org_id())`

### Table `offers`
- ✅ SELECT: `USING (org_id = public.org_id())`
- ✅ INSERT: `WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))`
- ✅ UPDATE: `USING/WITH CHECK (org_id = public.org_id() AND EXISTS (...))`
- ✅ DELETE: `USING (org_id = public.org_id())`

---

## 📋 ACTIONS REQUISES

### 1. Appliquer la migration

```bash
# Exécuter la migration sur Supabase
# Via Supabase SQL Editor ou via script
psql $DATABASE_URL -f drizzle/0008_fix_missing_rls_policies.sql
```

### 2. Vérifier après migration

Exécuter `scripts/inspect-rls-policies.sql` pour vérifier que toutes les policies existent :

```sql
SELECT 
  tablename,
  CASE WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅' ELSE '❌' END AS has_select,
  CASE WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅' ELSE '❌' END AS has_insert,
  CASE WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅' ELSE '❌' END AS has_update,
  CASE WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅' ELSE '❌' END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'templates', 'offers')
GROUP BY tablename
ORDER BY tablename;
```

**Résultat attendu**:
```
clients   | ✅ | ✅ | ✅ | ✅
templates | ✅ | ✅ | ✅ | ✅
offers    | ✅ | ✅ | ✅ | ✅
```

### 3. Tester fonctionnellement

Après migration, tester :
- ✅ Lecture de clients (`GET /api/clients`)
- ✅ Création de client (`POST /api/clients`)
- ✅ Lecture de templates (`GET /api/templates`)
- ✅ Création d'offre (`POST /api/offers`)

---

## 🔍 ANALYSE DE LA CAUSE

**Hypothèses**:
1. **Script de nettoyage trop agressif**: `cleanup-duplicate-rls-policies.sql` a peut-être supprimé des policies légitimes
2. **Migration partielle**: Migration 0002 n'a peut-être pas été appliquée complètement
3. **Rollback partiel**: Un rollback a peut-être supprimé certaines policies

**Recommandation**: 
- Vérifier l'historique des migrations appliquées
- Ajouter des tests d'intégration pour vérifier l'existence des policies RLS
- Documenter pourquoi certaines policies étaient manquantes

---

## ✅ VÉRIFICATION POST-MIGRATION

Après avoir appliqué la migration, vérifier :

1. **Policies existent**:
```sql
SELECT tablename, cmd, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'templates', 'offers')
ORDER BY tablename, cmd;
```

2. **RLS activé**:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'templates', 'offers');
```

3. **Fonction `public.org_id()` existe**:
```sql
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'org_id';
```

---

## 📝 NOTES

- La migration est **idempotente** : elle peut être exécutée plusieurs fois sans problème
- Toutes les policies utilisent `public.org_id()` pour le filtrage multi-tenant
- Les policies `offers` vérifient aussi que `client.org_id` correspond (sécurité supplémentaire)

---

**Migration**: `drizzle/0008_fix_missing_rls_policies.sql`  
**Script de vérification**: `scripts/inspect-rls-policies.sql`

