# ÉTAT ACTUEL DES POLICIES RLS

**Date**: 2024-12-19  
**Dernière vérification**: Après migration 0008

---

## ✅ CONFIRMÉ

- ✅ **RLS activé** sur `clients`, `templates`, `offers`
- ✅ **Fonction `public.org_id()`** existe
- ✅ **Permissions de table** correctes (anon, authenticated ont tous les privilèges)

---

## ❌ PROBLÈME CONFIRMÉ

Les policies RLS SELECT et INSERT sont **toujours manquantes** :

| Table | SELECT | INSERT | UPDATE | DELETE | RLS |
|-------|--------|--------|--------|--------|-----|
| `clients` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `templates` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `offers` | ❌ | ❌ | ✅ | ✅ | ✅ |

**Impact** :
- ❌ Les utilisateurs **ne peuvent pas lire** les données (SELECT manquant)
- ❌ Les utilisateurs **ne peuvent pas créer** de nouvelles données (INSERT manquant)
- ✅ Seules UPDATE et DELETE fonctionnent

---

## 🔍 CAUSE PROBABLE

La migration `0008_fix_missing_rls_policies.sql` a été appliquée mais les policies SELECT et INSERT n'ont pas été créées. Causes possibles :

1. **Erreur silencieuse** lors de la création des policies
2. **Conflit de noms** avec des policies existantes
3. **Permissions insuffisantes** pour créer les policies
4. **Policies supprimées** après création (par un autre script ou processus)

---

## ✅ SOLUTION : MIGRATION 0009

**Migration**: `drizzle/0009_force_create_missing_policies.sql`

**Approche** :
1. ✅ Supprime **TOUTES** les policies existantes d'abord
2. ✅ Recrée toutes les policies depuis zéro
3. ✅ Vérifie explicitement que RLS est activé
4. ✅ Rapporte les résultats dans les logs (NOTICE)

**Avantages** :
- Évite les conflits de noms
- Garantit un état propre
- Plus facile à déboguer

---

## 📋 ACTIONS REQUISES

### 1. Diagnostic (optionnel mais recommandé)

Exécuter `scripts/list-all-existing-policies.sql` pour voir :
- Quelles policies existent réellement
- Leurs noms exacts
- Si des policies avec d'autres noms existent

### 2. Appliquer la migration 0009

**Via Supabase SQL Editor** :
1. Ouvrir Supabase Dashboard → SQL Editor
2. Copier le contenu de `drizzle/0009_force_create_missing_policies.sql`
3. Exécuter le script
4. **Vérifier les messages NOTICE** dans les logs pour confirmer la création

### 3. Vérifier après migration

Exécuter `scripts/verify-rls-policies-status.sql` pour confirmer :

**Résultat attendu** :
```
clients   | ✅ | ✅ | ✅ | ✅
templates | ✅ | ✅ | ✅ | ✅
offers    | ✅ | ✅ | ✅ | ✅
```

---

## ⚠️ AVERTISSEMENT

La migration `0009_force_create_missing_policies.sql` :
- **Supprime toutes les policies existantes** avant de les recréer
- Cela signifie que UPDATE et DELETE seront temporairement indisponibles pendant quelques millisecondes
- **À exécuter pendant une fenêtre de maintenance** si possible

---

## 🧪 TESTS POST-MIGRATION

Après application de la migration 0009, tester :

1. ✅ `GET /api/clients` (doit retourner les clients)
2. ✅ `POST /api/clients` (doit créer un client)
3. ✅ `GET /api/templates` (doit retourner les templates)
4. ✅ `POST /api/offers` (doit créer une offre)

---

## 📝 RÉSUMÉ

**État actuel** :
- ✅ RLS activé
- ✅ Fonction org_id() existe
- ✅ Permissions de table correctes
- ❌ Policies SELECT et INSERT manquantes

**Solution** :
- ✅ Migration 0009 prête à être appliquée
- ✅ Scripts de vérification disponibles

**Action immédiate**: Appliquer la migration `0009_force_create_missing_policies.sql` pour restaurer toutes les policies RLS.

