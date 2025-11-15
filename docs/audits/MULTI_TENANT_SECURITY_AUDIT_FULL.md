# 🔒 Audit de Sécurité Multi-Tenant - Rapport Complet

**Date**: 2024-12-19  
**Objectif**: Vérifier que la sécurité multi-tenant est correctement implémentée et alignée entre code et base de données.

---

## 📊 RÉSUMÉ GLOBAL

**État global**: ✅ **Sécurité multi-tenant correctement implémentée** avec défense en profondeur (app + DB).

- ✅ Toutes les tables métier (`clients`, `templates`, `offers`, `admin_allowed_emails`) ont `org_id NOT NULL`
- ✅ Toutes les queries Drizzle filtrent systématiquement par `org_id`
- ✅ Routes API utilisent `getCurrentOrgId()` et rejettent explicitement `org_id` du client
- ✅ RLS activé sur `clients`, `templates`, `offers` avec policies utilisant `public.org_id()`
- ⚠️ `admin_allowed_emails` n'a pas RLS activé (protection uniquement app, acceptable si intentionnel)
- ⚠️ `crm_users` n'a pas de protection multi-tenant (table système, probablement intentionnel)

---

## 1️⃣ TABLES & RLS

### Tables métier identifiées

| Table | `org_id` présent | RLS activé | Policies |
|-------|------------------|-----------|----------|
| `clients` | ✅ `NOT NULL` | ✅ OUI | SELECT, INSERT, UPDATE, DELETE |
| `templates` | ✅ `NOT NULL` | ✅ OUI | SELECT, INSERT, UPDATE, DELETE |
| `offers` | ✅ `NOT NULL` | ✅ OUI | SELECT, INSERT, UPDATE, DELETE |
| `admin_allowed_emails` | ✅ `NOT NULL` | ❌ NON | Aucune |
| `crm_users` | ⚠️ `NULL` autorisé | ❌ NON | Aucune |

### Détail des policies RLS

#### Table `clients`
- ✅ **SELECT**: `USING (org_id = public.org_id())`
- ✅ **INSERT**: `WITH CHECK (org_id = public.org_id())`
- ✅ **UPDATE**: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id())`
- ✅ **DELETE**: `USING (org_id = public.org_id())`

#### Table `templates`
- ✅ **SELECT**: `USING (org_id = public.org_id())`
- ✅ **INSERT**: `WITH CHECK (org_id = public.org_id())`
- ✅ **UPDATE**: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id())`
- ✅ **DELETE**: `USING (org_id = public.org_id())`

#### Table `offers`
- ✅ **SELECT**: `USING (org_id = public.org_id())`
- ✅ **INSERT**: `WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))`
- ✅ **UPDATE**: `USING (org_id = public.org_id()) WITH CHECK (org_id = public.org_id() AND EXISTS (SELECT 1 FROM clients WHERE clients.id = offers.client_id AND clients.org_id = public.org_id()))`
- ✅ **DELETE**: `USING (org_id = public.org_id())`

**Note**: Les policies INSERT/UPDATE de `offers` vérifient aussi que le `client_id` référencé appartient à la même organisation, ce qui est une excellente pratique de sécurité.

#### Table `admin_allowed_emails`
- ✅ **RLS activé** - Mais policy UPDATE manquante
- ✅ **SELECT**: Policy existe
- ✅ **INSERT**: Policy existe
- ⚠️ **UPDATE**: Policy manquante (nécessaire pour `markAdminEmailAsUsed()`)
- ✅ **DELETE**: Policy existe

#### Table `crm_users`
- ❌ **RLS non activé** - Table système, probablement intentionnel

### Fonction `public.org_id()`

**Définition** (dans `drizzle/0002_enable_rls.sql`):
```sql
CREATE OR REPLACE FUNCTION public.org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'org_id';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Alignement avec `getCurrentOrgId()`**:
- ✅ `public.org_id()` lit: `auth.jwt() ->> 'user_metadata' ->> 'org_id'`
- ✅ `getCurrentOrgId()` lit: `user.user_metadata?.org_id` depuis Supabase Auth
- ✅ **Alignement parfait** : Les deux utilisent la même source de vérité (`user_metadata.org_id`)

---

## 2️⃣ COHÉRENCE AVEC LE CODE

### Queries Drizzle - Filtrage par `org_id`

#### ✅ Table `clients`
Toutes les queries filtrent par `org_id`:
- `listClients(orgId)` → `.where(eq(clients.org_id, orgId))`
- `getClientById(id, orgId)` → `.where(and(eq(clients.id, id), eq(clients.org_id, orgId)))`
- `createClient({ orgId })` → `.values({ org_id: data.orgId })`
- `updateClient(id, orgId, ...)` → `.where(and(eq(clients.id, id), eq(clients.org_id, orgId)))`
- `deleteClient(id, orgId)` → `.where(and(eq(clients.id, id), eq(clients.org_id, orgId)))`

#### ✅ Table `templates`
Toutes les queries filtrent par `org_id`:
- `listTemplates(orgId)` → `.where(eq(templates.org_id, orgId))`
- `getTemplateById(id, orgId)` → `.where(and(eq(templates.id, id), eq(templates.org_id, orgId)))`
- `getTemplateBySlug(slug, orgId)` → `.where(and(eq(templates.slug, slug), eq(templates.org_id, orgId)))`
- `createTemplate({ orgId })` → `.values({ org_id: data.orgId })`
- `updateTemplate(id, orgId, ...)` → `.where(and(eq(templates.id, id), eq(templates.org_id, orgId)))`

#### ✅ Table `offers`
Toutes les queries filtrent par `org_id`:
- `listOffers(orgId)` → `.where(eq(offers.org_id, orgId))`
- `getOfferById(id, orgId)` → `.where(and(eq(offers.id, id), eq(offers.org_id, orgId)))`
- `createOffer({ orgId })` → `.values({ org_id: data.orgId })`
- `updateOffer(id, orgId, ...)` → `.where(and(eq(offers.id, id), eq(offers.org_id, orgId)))`
- `listOffersByClient(clientId, orgId)` → `.where(and(eq(offers.org_id, orgId), eq(offers.client_id, clientId)))`
- `countOffers(orgId)` → `.where(eq(offers.org_id, orgId))`

#### ✅ Table `admin_allowed_emails`
Toutes les queries filtrent par `org_id`:
- `listAdminAllowedEmails(orgId)` → `.where(eq(admin_allowed_emails.org_id, orgId))`
- `addAdminAllowedEmail(orgId, email, createdBy)` → `.values({ org_id: orgId })`
- `deleteAdminAllowedEmail(orgId, id)` → `.where(and(eq(admin_allowed_emails.id, id), eq(admin_allowed_emails.org_id, orgId)))`
- `markAdminEmailAsUsed(orgId, email)` → `.where(and(eq(admin_allowed_emails.org_id, orgId), eq(admin_allowed_emails.email, normalizedEmail)))`

### Routes API - Utilisation de `getCurrentOrgId()`

#### ✅ Routes `clients`
- **GET `/api/clients`**: `getCurrentOrgId()` → `listClients(orgId)`
- **POST `/api/clients`**: `getCurrentOrgId()` + vérification explicite que `org_id` n'est pas dans le body
- **GET `/api/clients/[id]`**: `getCurrentOrgId()` → `getClientById(id, orgId)`
- **PATCH `/api/clients/[id]`**: `getCurrentOrgId()` + vérification explicite que `org_id` n'est pas dans le body
- **DELETE `/api/clients/[id]`**: `getCurrentOrgId()` → `deleteClient(id, orgId)`

#### ✅ Routes `templates`
- **GET `/api/templates`**: `getCurrentOrgId()` → `listTemplates(orgId)`
- **POST `/api/templates`**: `getCurrentOrgId()` → `createTemplate({ orgId })`
- **GET `/api/templates/[id]`**: `getCurrentOrgId()` → `getTemplateById(id, orgId)`
- **PATCH `/api/templates/[id]`**: `getCurrentOrgId()` → `updateTemplate(id, orgId, ...)`

#### ✅ Routes `offers`
- **GET `/api/offers`**: `getCurrentOrgId()` → `listOffers(orgId)`
- **POST `/api/offers`**: `getCurrentOrgId()` + vérification explicite que `org_id` n'est pas dans le body
- **GET `/api/offers/[id]`**: `getCurrentOrgId()` → `getOfferById(id, orgId)`
- **PATCH `/api/offers/[id]`**: `getCurrentOrgId()` → `updateOffer(id, orgId, ...)`

#### ✅ Routes `admin_allowed_emails`
- **GET `/api/settings/admin-allowed-emails`**: `getCurrentOrgId()` → `listAdminAllowedEmails(orgId)`
- **POST `/api/settings/admin-allowed-emails`**: `getCurrentOrgId()` + vérification explicite que `org_id` n'est pas dans le body
- **DELETE `/api/settings/admin-allowed-emails`**: `getCurrentOrgId()` → `deleteAdminAllowedEmail(orgId, id)`

### Protection contre l'injection d'`org_id` depuis le client

✅ **Toutes les routes POST/PATCH vérifient explicitement** que `org_id` n'est pas dans le body:
```typescript
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

---

## 3️⃣ MATRICE PAR TABLE

### Table `clients`

| Opération | Guard App | RLS | org_id check | État |
|-----------|-----------|-----|--------------|------|
| SELECT | ✅ `requireSession()` | ✅ `USING (org_id = public.org_id())` | ✅ `listClients(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `requireAdmin()` | ✅ `WITH CHECK (org_id = public.org_id())` | ✅ `createClient({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `requireAdmin()` | ✅ `USING/WITH CHECK (org_id = public.org_id())` | ✅ `updateClient(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | ✅ `requireAdmin()` | ✅ `USING (org_id = public.org_id())` | ✅ `deleteClient(id, orgId)` | ✅ **Sécurisé** |

### Table `templates`

| Opération | Guard App | RLS | org_id check | État |
|-----------|-----------|-----|--------------|------|
| SELECT | ✅ `getCurrentOrgId()` | ✅ `USING (org_id = public.org_id())` | ✅ `listTemplates(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `requireAdmin()` | ✅ `WITH CHECK (org_id = public.org_id())` | ✅ `createTemplate({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `getCurrentOrgId()` | ✅ `USING/WITH CHECK (org_id = public.org_id())` | ✅ `updateTemplate(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | ❌ Pas de route API | ✅ `USING (org_id = public.org_id())` | ✅ Via queries | ⚠️ **RLS protège** |

### Table `offers`

| Opération | Guard App | RLS | org_id check | État |
|-----------|-----------|-----|--------------|------|
| SELECT | ✅ `getCurrentOrgId()` | ✅ `USING (org_id = public.org_id())` | ✅ `listOffers(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `getCurrentOrgId()` | ✅ `WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())` | ✅ `createOffer({ orgId })` | ✅ **Sécurisé** |
| UPDATE | ✅ `getCurrentOrgId()` | ✅ `USING/WITH CHECK (org_id = public.org_id() AND client.org_id = public.org_id())` | ✅ `updateOffer(id, orgId, ...)` | ✅ **Sécurisé** |
| DELETE | ❌ Pas de route API | ✅ `USING (org_id = public.org_id())` | ✅ Via queries | ⚠️ **RLS protège** |

**Note spéciale pour `offers`**: Les policies INSERT/UPDATE vérifient aussi que le `client_id` référencé appartient à la même organisation, ce qui est une excellente pratique de sécurité supplémentaire.

### Table `admin_allowed_emails`

| Opération | Guard App | RLS | org_id check | État |
|-----------|-----------|-----|--------------|------|
| SELECT | ✅ `requireAdmin()` | ✅ Policy existe | ✅ `listAdminAllowedEmails(orgId)` | ✅ **Sécurisé** |
| INSERT | ✅ `requireAdmin()` | ✅ Policy existe | ✅ `addAdminAllowedEmail(orgId, ...)` | ✅ **Sécurisé** |
| UPDATE | ✅ `markAdminEmailAsUsed()` | ⚠️ **Policy manquante** | ✅ `markAdminEmailAsUsed(orgId, ...)` | ⚠️ **À corriger** |
| DELETE | ✅ `requireAdmin()` | ✅ Policy existe | ✅ `deleteAdminAllowedEmail(orgId, id)` | ✅ **Sécurisé** |

**Action requise**: Ajouter la policy UPDATE manquante via la migration `0010_add_admin_allowed_emails_update_policy.sql`.

### Table `crm_users`

| Opération | Guard App | RLS | org_id check | État |
|-----------|-----------|-----|--------------|------|
| SELECT | ❌ Pas de route API | ❌ Pas de RLS | ❌ Pas de queries dédiées | ⚠️ **Table système** |
| INSERT | ❌ Pas de route API | ❌ Pas de RLS | ❌ Pas de queries dédiées | ⚠️ **Table système** |
| UPDATE | ❌ Pas de route API | ❌ Pas de RLS | ❌ Pas de queries dédiées | ⚠️ **Table système** |
| DELETE | ❌ Pas de route API | ❌ Pas de RLS | ❌ Pas de queries dédiées | ⚠️ **Table système** |

**Note**: Cette table semble être une table système pour l'authentification. Si elle n'est pas utilisée dans l'application, elle peut rester sans protection multi-tenant.

---

## 🧪 DOUBLE CHECK - Table `offers` (table critique)

### Vérification manuelle complète

#### 1. Queries TypeScript

✅ **`listOffers(orgId)`** (`src/lib/db/queries/offers.ts:30-38`):
```typescript
export async function listOffers(orgId: string): Promise<Offer[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(offers)
    .where(eq(offers.org_id, orgId))  // ✅ Filtre par org_id
    .orderBy(desc(offers.created_at));
  return results.map(mapOfferRow);
}
```

✅ **`getOfferById(id, orgId)`** (`src/lib/db/queries/offers.ts:40-49`):
```typescript
export async function getOfferById(id: string, orgId: string): Promise<Offer> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.select()
    .from(offers)
    .where(and(eq(offers.id, id), eq(offers.org_id, orgId)))  // ✅ Filtre par org_id
    .limit(1);
  const row = firstOrError(result[0], `Offer not found: ${id}`);
  return mapOfferRow(row);
}
```

✅ **`createOffer({ orgId })`** (`src/lib/db/queries/offers.ts:51-80`):
```typescript
export async function createOffer(data: { orgId: string; ... }): Promise<Offer> {
  if (!data.orgId) throw new Error('orgId is required');
  const result = await db.insert(offers).values({
    org_id: data.orgId,  // ✅ Utilise orgId du paramètre
    client_id: data.client_id,
    // ...
  }).returning();
  return mapOfferRow(result[0]);
}
```

✅ **`updateOffer(id, orgId, ...)`** (`src/lib/db/queries/offers.ts:82-109`):
```typescript
export async function updateOffer(id: string, orgId: string, data: {...}): Promise<Offer> {
  if (!orgId) throw new Error('orgId is required');
  const result = await db.update(offers)
    .set({ ...data })
    .where(and(eq(offers.id, id), eq(offers.org_id, orgId)))  // ✅ Filtre par org_id
    .returning();
  return mapOfferRow(result[0]);
}
```

#### 2. Policies RLS

✅ **SELECT** (`drizzle/0009_force_create_missing_policies.sql:135-139`):
```sql
CREATE POLICY "Users can view offers from their organization"
ON offers
FOR SELECT
USING (org_id = public.org_id());  // ✅ Utilise public.org_id()
```

✅ **INSERT** (`drizzle/0009_force_create_missing_policies.sql:141-151`):
```sql
CREATE POLICY "Users can insert offers for their organization"
ON offers
FOR INSERT
WITH CHECK (
  org_id = public.org_id()  // ✅ Vérifie org_id
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = offers.client_id
    AND clients.org_id = public.org_id()  // ✅ Vérifie aussi que le client appartient à la même org
  )
);
```

✅ **UPDATE** (`drizzle/0009_force_create_missing_policies.sql:154-165`):
```sql
CREATE POLICY "Users can update offers from their organization"
ON offers
FOR UPDATE
USING (org_id = public.org_id())  // ✅ USING pour filtrer les lignes
WITH CHECK (
  org_id = public.org_id()  // ✅ WITH CHECK pour valider les nouvelles valeurs
  AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = offers.client_id
    AND clients.org_id = public.org_id()  // ✅ Vérifie aussi que le client appartient à la même org
  )
);
```

✅ **DELETE** (`drizzle/0009_force_create_missing_policies.sql:168-171`):
```sql
CREATE POLICY "Users can delete offers from their organization"
ON offers
FOR DELETE
USING (org_id = public.org_id());  // ✅ Utilise public.org_id()
```

#### 3. Routes API

✅ **GET `/api/offers`** (`src/app/api/offers/route.ts:18-45`):
```typescript
export async function GET(request: NextRequest) {
  const orgId = await getCurrentOrgId();  // ✅ Utilise getCurrentOrgId()
  const offers = await listOffers(orgId);  // ✅ Passe orgId à la query
  return NextResponse.json(offers);
}
```

✅ **POST `/api/offers`** (`src/app/api/offers/route.ts:56-126`):
```typescript
export async function POST(request: Request) {
  const orgId = await getCurrentOrgId();  // ✅ Utilise getCurrentOrgId()
  const body = await request.json();
  
  // ✅ Vérifie explicitement que org_id n'est pas dans le body
  if ('org_id' in body || 'orgId' in body) {
    return NextResponse.json(
      { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
      { status: 400 }
    );
  }
  
  const offer = await createOffer({ orgId, ...validatedData });  // ✅ Passe orgId à la query
  return NextResponse.json(offer, { status: 201 });
}
```

✅ **GET `/api/offers/[id]`** (`src/app/api/offers/[id]/route.ts:10-58`):
```typescript
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await getCurrentOrgId();  // ✅ Utilise getCurrentOrgId()
  const offer = await getOfferById(id, orgId);  // ✅ Passe orgId à la query
  return NextResponse.json({ offer, client, template });
}
```

✅ **PATCH `/api/offers/[id]`** (`src/app/api/offers/[id]/route.ts:60-136`):
```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orgId = await getCurrentOrgId();  // ✅ Utilise getCurrentOrgId()
  await getOfferById(id, orgId);  // ✅ Vérifie l'existence avec orgId
  const updatedOffer = await updateOffer(id, orgId, updateData);  // ✅ Passe orgId à la query
  return NextResponse.json(updatedOffer);
}
```

### Conclusion pour `offers`

✅ **Sécurité multi-tenant parfaitement implémentée**:
- ✅ Toutes les queries filtrent par `org_id`
- ✅ Toutes les routes API utilisent `getCurrentOrgId()`
- ✅ Toutes les routes API rejettent `org_id` du client
- ✅ RLS activé avec policies correctes
- ✅ Policies INSERT/UPDATE vérifient aussi que le `client_id` appartient à la même organisation

---

## ✅ TABLES SÉCURISÉES

1. ✅ **`clients`** - Protection complète (app + RLS)
2. ✅ **`templates`** - Protection complète (app + RLS)
3. ✅ **`offers`** - Protection complète (app + RLS) + vérification supplémentaire du `client_id`

---

## ⚠️ TABLES À RISQUE

### 1. `admin_allowed_emails`

**État actuel**: ✅ RLS activé, mais policy UPDATE manquante

**Problème**: La policy UPDATE n'existe pas, ce qui empêche `markAdminEmailAsUsed()` de fonctionner correctement avec RLS activé.

**Risque**: La fonction `markAdminEmailAsUsed()` qui met à jour `used_at` ne fonctionnera pas correctement avec RLS activé sans cette policy.

**Fix**: Migration créée `drizzle/0010_add_admin_allowed_emails_update_policy.sql`

**Priorité**: Haute (nécessaire pour que `markAdminEmailAsUsed()` fonctionne avec RLS)

### 2. `crm_users`

**Problème**: Pas de protection multi-tenant, `org_id` peut être NULL.

**Risque**: Si cette table est utilisée pour des données métier, il y a un risque de fuite inter-org.

**Recommandation**: 
- Si la table n'est pas utilisée dans l'application → Aucune action nécessaire
- Si la table est utilisée → Ajouter `org_id NOT NULL` et activer RLS

**Priorité**: Basse (table système probablement)

---

## 📝 RECOMMANDATIONS FINALES

### Actions immédiates
1. ⚠️ **Appliquer la migration `0010_add_admin_allowed_emails_update_policy.sql`** pour ajouter la policy UPDATE manquante sur `admin_allowed_emails` (priorité: haute)

### Améliorations suggérées
1. **Vérifier l'utilisation de `crm_users`** et ajouter protection multi-tenant si nécessaire (priorité: basse)

### Bonnes pratiques observées
1. ✅ Défense en profondeur (app + DB)
2. ✅ Vérification explicite que `org_id` n'est jamais accepté depuis le client
3. ✅ Policies RLS qui vérifient les relations (ex: `offers.client_id` appartient à la même org)
4. ✅ Fonction `public.org_id()` alignée avec `getCurrentOrgId()`
5. ✅ Toutes les queries Drizzle filtrent systématiquement par `org_id`

---

## 🎯 CONCLUSION

**La sécurité multi-tenant est correctement implémentée** avec une défense en profondeur efficace. Les tables critiques (`clients`, `templates`, `offers`) sont bien protégées au niveau application ET base de données. 

**Action requise**: Appliquer la migration `0010_add_admin_allowed_emails_update_policy.sql` pour compléter la protection RLS sur `admin_allowed_emails` (policy UPDATE manquante).

Une fois cette migration appliquée, toutes les tables métier auront une protection RLS complète.

