# Guide d'Inspection des RLS Policies

## Problème

MCP Supabase ne permet pas d'inspecter directement les RLS (Row Level Security) policies via `read_records`. Pour vérifier l'état des RLS, il faut utiliser du SQL direct.

## Solution : Script SQL

Un script SQL complet est disponible : `scripts/inspect-rls-policies.sql`

### Comment l'utiliser

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet (`ldarwvflrqoxjcrnehwm` ou `bofkyolkmaxouwjzlnwa`)

2. **Ouvrez SQL Editor**
   - Cliquez sur "SQL Editor" dans le menu de gauche
   - Cliquez sur "New query"

3. **Copiez-collez le script**
   - Ouvrez `scripts/inspect-rls-policies.sql`
   - Copiez tout le contenu
   - Collez-le dans l'éditeur SQL

4. **Exécutez le script**
   - Cliquez sur "Run" ou appuyez sur `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows/Linux)
   - Les résultats s'afficheront dans plusieurs onglets

### Ce que le script vérifie

Le script `inspect-rls-policies.sql` vérifie :

1. **État RLS par table** : Si RLS est activé ou désactivé
2. **Policies définies** : Liste complète des policies avec leurs conditions
3. **Conditions USING/WITH CHECK** : Vérifie que les conditions sont bien définies
4. **Fonction `public.org_id()`** : Vérifie qu'elle existe et est utilisée dans les policies
5. **Vérification des relations** : Vérifie si les policies vérifient les relations (ex: offers → clients)
6. **Comparaison avec attentes** : Compare avec ce qui est attendu selon la migration `0002_enable_rls.sql`

### Résultats attendus

Selon la migration `0002_enable_rls.sql`, vous devriez voir :

| Table | RLS Activé | Policies Attendues |
|-------|------------|-------------------|
| `clients` | ✅ Oui | 4 policies (SELECT, INSERT, UPDATE, DELETE) |
| `templates` | ✅ Oui | 4 policies (SELECT, INSERT, UPDATE, DELETE) |
| `offers` | ✅ Oui | 4 policies (SELECT, INSERT, UPDATE, DELETE) |
| `admin_allowed_emails` | ❌ Non | Aucune policy (RLS non activé dans migration 0007) |

### Exemple de résultats

#### 1. État RLS par table

```
tablename              | rls_enabled | status
------------------------+-------------+------------------
admin_allowed_emails   | f           | ❌ RLS désactivé
clients                | t           | ✅ RLS activé
offers                 | t           | ✅ RLS activé
templates              | t           | ✅ RLS activé
```

#### 2. Policies par table

```
tablename | policyname                                    | command | using_expression
----------+-----------------------------------------------+---------+------------------
clients   | Users can view clients from their organization| SELECT  | (org_id = public.org_id())
clients   | Users can insert clients for their org       | INSERT  | (org_id = public.org_id())
...
```

#### 3. Vérification de `public.org_id()`

```
routine_name | security_type | security_status
-------------+---------------+----------------------------------
org_id       | DEFINER       | ✅ SECURITY DEFINER (peut accéder à auth.jwt())
```

## Alternative : Script TypeScript

Un script TypeScript est aussi disponible (`scripts/inspect-rls-policies.ts`) mais il a des limitations :

- ❌ Ne peut pas lire les policies directement
- ⚠️ Peut seulement tester si RLS bloque les requêtes
- ✅ Utile pour tester rapidement si RLS est activé

**Usage** :
```bash
npx tsx scripts/inspect-rls-policies.ts
```

## Intégration dans l'audit

Une fois que vous avez exécuté le script SQL et obtenu les résultats, vous pouvez :

1. **Comparer avec l'audit de persistance** (`docs/audits/PERSISTENCE_AUDIT_COMPLETE.md`)
2. **Vérifier les écarts** :
   - RLS activé sur `admin_allowed_emails` ? (attendu : non)
   - Toutes les policies utilisent `public.org_id()` ? (attendu : oui)
   - Les policies `offers` vérifient les relations avec `clients` ? (attendu : oui)

3. **Mettre à jour l'audit** avec les résultats réels de la DB

## Commandes SQL utiles (extraits du script)

### Vérifier si RLS est activé

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails');
```

### Lister toutes les policies

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('clients', 'templates', 'offers', 'admin_allowed_emails');
```

### Vérifier la fonction `public.org_id()`

```sql
SELECT routine_name, security_type, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'org_id';
```

## Notes importantes

⚠️ **Limitation MCP Supabase** : 
- `mcp_supabase_read_records` ne peut pas lire les métadonnées RLS
- Il faut utiliser du SQL direct pour inspecter les policies

✅ **Recommandation** :
- Utilisez le script SQL dans Supabase Dashboard pour une inspection complète
- Exécutez-le régulièrement pour vérifier que les RLS policies sont toujours correctes
- Documentez les résultats dans l'audit de persistance

---

Pour toute question ou problème, consultez :
- `docs/audits/PERSISTENCE_AUDIT_COMPLETE.md` - Audit complet de persistance
- `drizzle/0002_enable_rls.sql` - Migration RLS originale

