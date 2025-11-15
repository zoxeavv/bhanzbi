# Application de la migration 0004 - Index sur offers.client_id

## 🚀 Méthode optimisée recommandée : Supabase Dashboard

### Étapes :

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Ouvrir le SQL Editor**
   - Menu de gauche → SQL Editor
   - Cliquer sur "New query"

3. **Copier-coller le contenu de la migration**
   ```bash
   cat drizzle/0004_add_offers_client_id_indexes.sql
   ```

4. **Exécuter la requête**
   - Coller le SQL dans l'éditeur
   - Cliquer sur "Run" ou `Cmd/Ctrl + Enter`

5. **Vérifier les index créés**
   ```sql
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename = 'offers' 
   AND indexname IN ('idx_offers_client_id', 'idx_offers_org_client')
   ORDER BY indexname;
   ```

---

## 🔧 Méthode alternative : Script Node.js

Si vous avez accès à la base de données avec les bonnes credentials :

```bash
node scripts/apply-migration.js drizzle/0004_add_offers_client_id_indexes.sql
```

**Note** : Le script nécessite que `pg` soit installé et que DATABASE_URL soit correctement configuré dans `.env.local`.

---

## ✅ Vérification post-migration

Après application, vérifiez que les index existent :

```sql
-- Vérifier les index créés
SELECT 
  indexname, 
  indexdef,
  tablename
FROM pg_indexes 
WHERE tablename = 'offers' 
AND indexname IN ('idx_offers_client_id', 'idx_offers_org_client')
ORDER BY indexname;
```

Vous devriez voir :
- `idx_offers_client_id` sur `offers(client_id)`
- `idx_offers_org_client` sur `offers(org_id, client_id)`

---

## 📊 Impact attendu

Cette migration optimise :
- ✅ `listOffersByClient(clientId, orgId)` - requête utilisée dans `/clients/[id]`
- ✅ Toutes les requêtes filtrant par `client_id`
- ✅ Requêtes combinant `org_id` et `client_id`

**Performance** : Réduction significative du temps de requête pour les pages détail client avec beaucoup d'offres.

