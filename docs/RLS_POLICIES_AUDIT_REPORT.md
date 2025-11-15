# Rapport d'Audit RLS Policies - Double Check DB Réelle ↔ Code

**Date**: 2024  
**Méthodologie**: Comparaison résultats DB réelle (via SQL) ↔ Code (migration 0002_enable_rls.sql)  
**Scope**: Vérification complète des RLS policies sur toutes les tables métier

---

## Résumé Exécutif

**Problème critique détecté** : Des policies RLS dupliquées existent en base de données réelle. Les tables `clients`, `templates` et `offers` ont plus de policies que prévu selon la migration `0002_enable_rls.sql`. Les policies UPDATE et DELETE sont correctes, mais SELECT et INSERT ont des doublons.

---

## Comparaison DB Réelle ↔ Code

### Table `clients`

| Opération | DB Réelle | Attendu (0002_enable_rls.sql) | Écart |
|-----------|-----------|-------------------------------|-------|
| SELECT | 2 policies | 1 policy | ❌ **+1 doublon** |
| INSERT | 2 policies | 1 policy | ❌ **+1 doublon** |
| UPDATE | 1 policy | 1 policy | ✅ OK |
| DELETE | 1 policy | 1 policy | ✅ OK |
| **Total** | **6 policies** | **4 policies** | ⚠️ **+2 doublons** |

**Policy attendue (selon code)** :
- SELECT: `"Users can view clients from their organization"`
- INSERT: `"Users can insert clients for their organization"`
- UPDATE: `"Users can update clients from their organization"`
- DELETE: `"Users can delete clients from their organization"`

### Table `templates`

| Opération | DB Réelle | Attendu (0002_enable_rls.sql) | Écart |
|-----------|-----------|-------------------------------|-------|
| SELECT | 2 policies | 1 policy | ❌ **+1 doublon** |
| INSERT | 1 policy | 1 policy | ✅ OK |
| UPDATE | 1 policy | 1 policy | ✅ OK |
| DELETE | 1 policy | 1 policy | ✅ OK |
| **Total** | **5 policies** | **4 policies** | ⚠️ **+1 doublon** |

**Policy attendue (selon code)** :
- SELECT: `"Users can view templates from their organization"`
- INSERT: `"Users can insert templates for their organization"`
- UPDATE: `"Users can update templates from their organization"`
- DELETE: `"Users can delete templates from their organization"`

### Table `offers`

| Opération | DB Réelle | Attendu (0002_enable_rls.sql) | Écart |
|-----------|-----------|-------------------------------|-------|
| SELECT | 2 policies | 1 policy | ❌ **+1 doublon** |
| INSERT | 2 policies | 1 policy | ❌ **+1 doublon** |
| UPDATE | 1 policy | 1 policy | ✅ OK |
| DELETE | 1 policy | 1 policy | ✅ OK |
| **Total** | **6 policies** | **4 policies** | ⚠️ **+2 doublons** |

**Policy attendue (selon code)** :
- SELECT: `"Users can view offers from their organization"`
- INSERT: `"Users can insert offers for their organization"` (avec vérification relation clients)
- UPDATE: `"Users can update offers from their organization"` (avec vérification relation clients)
- DELETE: `"Users can delete offers from their organization"`

### Table `admin_allowed_emails`

| Opération | DB Réelle | Attendu (0007_create_admin_allowed_emails.sql) | Écart |
|-----------|-----------|-----------------------------------------------|-------|
| SELECT | N/A | 0 policies (RLS non activé) | ✅ OK |
| INSERT | N/A | 0 policies (RLS non activé) | ✅ OK |
| UPDATE | N/A | 0 policies (RLS non activé) | ✅ OK |
| DELETE | N/A | 0 policies (RLS non activé) | ✅ OK |

**Note** : RLS non activé sur cette table selon la migration 0007 (comportement attendu mais peut être un risque de sécurité).

---

## Problèmes Détectés

### 1. Policies SELECT dupliquées

**Tables affectées** :
- `clients` : 2 policies SELECT au lieu de 1
- `templates` : 2 policies SELECT au lieu de 1
- `offers` : 2 policies SELECT au lieu de 1

**Impact** :
- PostgreSQL évalue toutes les policies avec un OR logique
- Si une policy est permissive, l'accès est autorisé
- Les doublons peuvent créer de la confusion lors de la maintenance
- Performance légèrement dégradée (évaluation de plusieurs policies)

### 2. Policies INSERT dupliquées

**Tables affectées** :
- `clients` : 2 policies INSERT au lieu de 1
- `offers` : 2 policies INSERT au lieu de 1

**Impact** :
- Même impact que pour SELECT
- Risque de comportement inattendu si les policies ont des conditions différentes

### 3. Cause probable

Les doublons peuvent être dus à :
1. Exécution multiple de la migration `0002_enable_rls.sql` (bien que `DROP POLICY IF EXISTS` devrait éviter ça)
2. Exécution du script `fix-missing-rls-policies.sql` après que les policies existaient déjà
3. Création manuelle de policies supplémentaires dans Supabase Dashboard

---

## Actions de Correction

### Étape 1 : Identifier les doublons

Exécutez dans Supabase SQL Editor :
```sql
-- scripts/list-all-rls-policies.sql
```

Ce script liste toutes les policies avec leurs noms et conditions pour identifier les doublons.

### Étape 2 : Nettoyer les doublons

Exécutez dans Supabase SQL Editor :
```sql
-- scripts/cleanup-duplicate-rls-policies.sql
```

**IMPORTANT** :
1. Exécutez d'abord la **section 1** pour voir quelles policies seront supprimées
2. Vérifiez que seules les policies avec des noms différents de ceux attendus seront supprimées
3. **Décommentez la section 2** pour supprimer les doublons
4. Exécutez la **section 3** pour vérifier le résultat final

### Étape 3 : Vérification finale

Après nettoyage, chaque table devrait avoir exactement **4 policies** :
- 1 SELECT
- 1 INSERT
- 1 UPDATE
- 1 DELETE

Réexécutez `scripts/inspect-rls-policies.sql` pour confirmer.

---

## Vérification via Code

Le script `scripts/compare-rls-with-code.ts` compare automatiquement :
- Les résultats réels de la DB
- Les attentes selon la migration `0002_enable_rls.sql`

**Usage** :
```bash
npx tsx scripts/compare-rls-with-code.ts
```

---

## Noms de Policies Attendus

Selon `drizzle/0002_enable_rls.sql`, les noms exacts attendus sont :

### `clients`
- `"Users can view clients from their organization"`
- `"Users can insert clients for their organization"`
- `"Users can update clients from their organization"`
- `"Users can delete clients from their organization"`

### `templates`
- `"Users can view templates from their organization"`
- `"Users can insert templates for their organization"`
- `"Users can update templates from their organization"`
- `"Users can delete templates from their organization"`

### `offers`
- `"Users can view offers from their organization"`
- `"Users can insert offers for their organization"`
- `"Users can update offers from their organization"`
- `"Users can delete offers from their organization"`

**Toute policy avec un nom différent doit être supprimée** (sauf si elle a été créée intentionnellement pour une raison spécifique).

---

## Checklist de Vérification

- [ ] Exécuté `scripts/list-all-rls-policies.sql` pour voir toutes les policies
- [ ] Identifié les policies dupliquées
- [ ] Vérifié les noms des policies (doivent correspondre à ceux de la migration)
- [ ] Exécuté `scripts/cleanup-duplicate-rls-policies.sql` section 1 (liste des policies à supprimer)
- [ ] Vérifié que seules les policies non attendues seront supprimées
- [ ] Décommenté et exécuté section 2 (suppression des doublons)
- [ ] Exécuté section 3 (vérification finale)
- [ ] Confirmé que chaque table a exactement 4 policies
- [ ] Vérifié que toutes les policies utilisent `public.org_id()`

---

## Résultat Attendu Après Correction

| Table | SELECT | INSERT | UPDATE | DELETE | Total |
|-------|--------|--------|--------|--------|-------|
| `clients` | 1 | 1 | 1 | 1 | 4 |
| `templates` | 1 | 1 | 1 | 1 | 4 |
| `offers` | 1 | 1 | 1 | 1 | 4 |
| `admin_allowed_emails` | 0 | 0 | 0 | 0 | 0 (RLS non activé) |

---

**Fin du rapport**

