# DIAGNOSTIC : POLICIES RLS MANQUANTES

**Date**: 2024-12-19  
**Problème**: Policies SELECT et INSERT toujours manquantes après migration 0008

---

## 🔍 ANALYSE DES PERMISSIONS

Les permissions de table sont **correctes** :
- ✅ Rôles `anon` et `authenticated` ont tous les privilèges (SELECT, INSERT, UPDATE, DELETE)
- ✅ RLS est activé sur les tables (`rowsecurity = true`)

**Mais** : Avec RLS activé, les permissions de table ne suffisent pas. Les **policies RLS** doivent aussi exister pour autoriser l'accès.

---

## 🚨 PROBLÈME IDENTIFIÉ

Les policies RLS SELECT et INSERT sont **vraiment manquantes** :
- `clients`: SELECT ❌, INSERT ❌
- `templates`: SELECT ❌
- `offers`: SELECT ❌, INSERT ❌

**Impact** : Même si les permissions de table existent, RLS bloque l'accès car aucune policy ne correspond.

---

## 🔍 DIAGNOSTIC REQUIS

Exécuter `scripts/list-all-existing-policies.sql` dans Supabase SQL Editor pour :

1. **Voir toutes les policies existantes** (avec leurs noms exacts)
2. **Vérifier si des policies avec d'autres noms existent**
3. **Comprendre pourquoi les policies SELECT/INSERT n'ont pas été créées**

---

## ✅ SOLUTION : MIGRATION 0009

**Migration**: `drizzle/0009_force_create_missing_policies.sql`

**Approche** :
1. Supprime **TOUTES** les policies existantes d'abord
2. Recrée toutes les policies depuis zéro
3. Vérifie explicitement que RLS est activé
4. Rapporte les résultats dans les logs

**Avantages** :
- Évite les conflits de noms
- Garantit un état propre
- Plus facile à déboguer

---

## 📋 ACTIONS REQUISES

### 1. Diagnostic préalable

Exécuter `scripts/list-all-existing-policies.sql` pour voir :
- Quelles policies existent réellement
- Leurs noms exacts
- Si des policies avec d'autres noms existent

### 2. Appliquer la migration 0009

**Via Supabase SQL Editor** :
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de `drizzle/0009_force_create_missing_policies.sql`
3. Exécuter le script
4. Vérifier les messages NOTICE dans les logs

### 3. Vérifier après migration

Exécuter `scripts/verify-rls-policies-status.sql` pour confirmer :

**Résultat attendu** :
```
clients   | ✅ | ✅ | ✅ | ✅
templates | ✅ | ✅ | ✅ | ✅
offers    | ✅ | ✅ | ✅ | ✅
```

---

## 🔍 CAUSES POSSIBLES

1. **Erreur silencieuse** : Les commandes `CREATE POLICY` ont peut-être échoué sans erreur visible
2. **Conflit de noms** : Des policies avec des noms différents existent peut-être
3. **Permissions insuffisantes** : L'utilisateur qui exécute la migration n'a peut-être pas les droits
4. **RLS désactivé temporairement** : RLS peut avoir été désactivé après la migration
5. **Policies supprimées après création** : Quelque chose supprime les policies après leur création

---

## ⚠️ AVERTISSEMENT

La migration `0009_force_create_missing_policies.sql` :
- **Supprime toutes les policies existantes** avant de les recréer
- Cela signifie que UPDATE et DELETE seront temporairement indisponibles pendant quelques millisecondes
- **À exécuter pendant une fenêtre de maintenance** si possible

---

## 📝 PROCHAINES ÉTAPES

1. ✅ Exécuter `scripts/list-all-existing-policies.sql` pour diagnostic
2. ✅ Appliquer migration `0009_force_create_missing_policies.sql`
3. ✅ Vérifier avec `scripts/verify-rls-policies-status.sql`
4. ✅ Tester fonctionnellement les routes API

---

**Action immédiate**: Exécuter le diagnostic puis appliquer la migration 0009.


