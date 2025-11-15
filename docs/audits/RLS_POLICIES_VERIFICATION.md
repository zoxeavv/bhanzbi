# VÉRIFICATION POST-MIGRATION 0008

**Date**: 2024-12-19  
**Migration appliquée**: `drizzle/0008_fix_missing_rls_policies.sql`

---

## ✅ MIGRATION APPLIQUÉE

La migration `0008_fix_missing_rls_policies.sql` a été appliquée avec succès.

---

## 📋 VÉRIFICATION REQUISE

Exécuter le script suivant dans **Supabase SQL Editor** pour vérifier que toutes les policies sont présentes :

```sql
-- Vérification rapide des policies RLS
SELECT 
  'clients' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'clients'

UNION ALL

SELECT 
  'templates' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'templates'

UNION ALL

SELECT 
  'offers' AS table_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'SELECT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_select,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'INSERT') = 1 THEN '✅'
    ELSE '❌'
  END AS has_insert,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'UPDATE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_update,
  CASE 
    WHEN COUNT(*) FILTER (WHERE cmd = 'DELETE') = 1 THEN '✅'
    ELSE '❌'
  END AS has_delete
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'offers';
```

**Résultat attendu** :
```
clients   | ✅ | ✅ | ✅ | ✅
templates | ✅ | ✅ | ✅ | ✅
offers    | ✅ | ✅ | ✅ | ✅
```

---

## ✅ CHECKLIST POST-MIGRATION

- [x] Migration `0008_fix_missing_rls_policies.sql` appliquée
- [ ] Script de vérification exécuté dans Supabase SQL Editor
- [ ] Toutes les tables ont 4 policies (SELECT, INSERT, UPDATE, DELETE)
- [ ] RLS activé sur `clients`, `templates`, `offers`
- [ ] Fonction `public.org_id()` existe (déjà vérifié ✅)
- [ ] Tests fonctionnels passent :
  - [ ] `GET /api/clients` retourne les clients
  - [ ] `POST /api/clients` crée un client
  - [ ] `GET /api/templates` retourne les templates
  - [ ] `POST /api/offers` crée une offre

---

## 🧪 TESTS FONCTIONNELS

Après vérification SQL, tester les routes API :

### Test 1 : Lecture des clients
```bash
curl -X GET http://localhost:3000/api/clients \
  -H "Cookie: sb-xxx-auth-token=..."
```
**Attendu**: Liste des clients de l'organisation

### Test 2 : Création d'un client
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{"name": "Test Client", "company": "Test Co"}'
```
**Attendu**: Client créé avec succès (201)

### Test 3 : Lecture des templates
```bash
curl -X GET http://localhost:3000/api/templates \
  -H "Cookie: sb-xxx-auth-token=..."
```
**Attendu**: Liste des templates de l'organisation

### Test 4 : Création d'une offre
```bash
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{"client_id": "...", "title": "Test Offer", ...}'
```
**Attendu**: Offre créée avec succès (201)

---

## 📝 RÉSULTAT ATTENDU

Après application de la migration, toutes les tables métier devraient avoir :

| Table | SELECT | INSERT | UPDATE | DELETE | RLS |
|-------|--------|--------|--------|--------|-----|
| `clients` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `templates` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `offers` | ✅ | ✅ | ✅ | ✅ | ✅ |

**État**: ✅ **Migration appliquée avec succès**

---

## 🔍 EN CAS DE PROBLÈME

Si certaines policies sont encore manquantes :

1. Vérifier les logs de la migration dans Supabase
2. Ré-exécuter la migration (elle est idempotente)
3. Vérifier que la fonction `public.org_id()` existe
4. Vérifier que RLS est activé sur les tables

**Script de diagnostic**: `scripts/verify-rls-policies-status.sql`

