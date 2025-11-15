# 🏢 Audit : Gestion de l'orgId (Multi-tenant)

**Date** : 2025-01-27  
**Type** : Audit / Documentation (lecture seule)

---

## 📋 Table des matières

1. [Fonction getCurrentOrgId()](#1-fonction-getcurrentorgid)
2. [Vérification des queries](#2-vérification-des-queries)
3. [Conclusion](#3-conclusion)

---

## 1. Fonction getCurrentOrgId()

### 📍 Localisation

**Fichier** : `src/lib/auth/session.ts`  
**Lignes** : 211-227

### 🔍 Comment elle obtient orgId

```typescript
export async function getCurrentOrgId(): Promise<string> {
  const session = await requireSession();
  
  // 1. Priorité : orgId depuis la session utilisateur
  if (session.orgId) {
    return session.orgId;
  }
  
  // 2. Fallback : DEFAULT_ORG_ID depuis les variables d'environnement
  if (DEFAULT_ORG_ID) {
    return DEFAULT_ORG_ID;
  }
  
  // 3. Erreur si ni l'un ni l'autre
  throw new Error('Organization ID not found in session and DEFAULT_ORG_ID is not configured');
}
```

**Ordre de priorité** :
1. **`session.orgId`** : Vient de `user.user_metadata.org_id` (Supabase Auth)
2. **`DEFAULT_ORG_ID`** : Variable d'environnement (`process.env.DEFAULT_ORG_ID`)
3. **Erreur** : Si aucun des deux n'est disponible

**Source de `session.orgId`** :
- `session` vient de `requireSession()` qui appelle `getSession()`
- `getSession()` lit `user.user_metadata.org_id` depuis Supabase Auth
- Stocké dans les métadonnées utilisateur Supabase, pas dans une table DB séparée

**Configuration du fallback** :
- **Fichier** : `src/lib/config/org.ts` (ligne 29)
- **Variable** : `DEFAULT_ORG_ID` (optionnelle)
- **Usage** : Permet un fonctionnement mono-tenant en production sans définir `org_id` pour chaque utilisateur

### 🎯 Système actuel : Mono-tenant ou Multi-tenant ?

**Architecture** : **Multi-tenant strict** avec support mono-tenant via fallback

**État actuel** : **Mono-tenant en pratique, multi-tenant en architecture**

**Preuves** :
1. ✅ Toutes les tables ont un champ `org_id` (clients, templates, offers)
2. ✅ Toutes les queries filtrent sur `org_id`
3. ✅ Contraintes DB uniques incluent `org_id` (ex: `(org_id, slug)` pour templates)
4. ✅ `getCurrentOrgId()` est la seule source de vérité
5. ⚠️ Support mono-tenant via `DEFAULT_ORG_ID` (fallback optionnel)

**Documentation dans le code** :
```typescript
// src/lib/auth/session.ts, lignes 176-179
/**
 * CONTEXTE MULTI-TENANT / MONO-TENANT :
 * 
 * Le système est architecturé en multi-tenant strict avec org_id et getCurrentOrgId().
 * Cependant, en pratique produit actuelle, on n'a qu'une seule organisation et qu'un rôle ADMIN.
 */
```

**Conclusion** : Le système est **prêt pour le multi-tenant** mais fonctionne actuellement en **mono-tenant** grâce au fallback `DEFAULT_ORG_ID`.

---

## 2. Vérification des queries

### ✅ Toutes les queries filtrent sur `org_id`

#### 📁 Clients (`src/lib/db/queries/clients.ts`)

**Toutes les fonctions prennent `orgId` en paramètre et filtrent** :

| Fonction | Ligne | Filtre |
|----------|-------|--------|
| `listClients(orgId, options)` | 38-49 | `eq(clients.org_id, orgId)` |
| `getClientById(id, orgId)` | 111-115 | `and(eq(clients.id, id), eq(clients.org_id, orgId))` |
| `createClient(data)` | 134-144 | `org_id: data.orgId` (insert) |
| `updateClient(id, orgId, data)` | 166-183 | `and(eq(clients.id, id), eq(clients.org_id, orgId))` |
| `countClients(orgId)` | 200-204 | `eq(clients.org_id, orgId)` |
| `deleteClient(id, orgId)` | 208-211 | `and(eq(clients.id, id), eq(clients.org_id, orgId))` |
| `getClientsWithOffersCount(orgId)` | 219-239 | `eq(clients.org_id, orgId)` + join sur `offers.org_id` |

**Exemple concret** :
```typescript
// src/lib/db/queries/clients.ts, lignes 38-49
export async function listClients(
  orgId: string,
  options: ListClientsOptions = {}
): Promise<PaginatedClientsResult> {
  if (!orgId) throw new Error('orgId is required');
  
  const conditions = [eq(clients.org_id, orgId)]; // ← Filtre multi-tenant
  
  // ... recherche textuelle ...
  
  const results = await db
    .select()
    .from(clients)
    .where(whereClause) // ← Contient toujours le filtre org_id
    .orderBy(desc(clients.created_at));
}
```

#### 📁 Templates (`src/lib/db/queries/templates.ts`)

**Toutes les fonctions prennent `orgId` en paramètre et filtrent** :

| Fonction | Ligne | Filtre |
|----------|-------|--------|
| `listTemplates(orgId)` | 21-25 | `eq(templates.org_id, orgId)` |
| `getTemplateById(id, orgId)` | 41-45 | `and(eq(templates.id, id), eq(templates.org_id, orgId))` |
| `getTemplateBySlug(slug, orgId)` | 74-78 | `and(eq(templates.slug, slug), eq(templates.org_id, orgId))` |
| `createTemplate(data)` | 110-123 | `org_id: data.orgId` (insert) |
| `updateTemplate(id, orgId, data)` | 158-177 | `and(eq(templates.id, id), eq(templates.org_id, orgId))` |
| `countTemplates(orgId)` | 195-199 | `eq(templates.org_id, orgId)` |

**Exemple concret** :
```typescript
// src/lib/db/queries/templates.ts, lignes 21-26
export async function listTemplates(orgId: string): Promise<Template[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(templates)
    .where(eq(templates.org_id, orgId)) // ← Filtre multi-tenant
    .orderBy(desc(templates.created_at));
}
```

**Contrainte DB unique composite** :
```typescript
// src/lib/db/schema.ts, lignes 32-33
templatesOrgIdSlugUnique: uniqueIndex('templates_org_id_slug_unique')
  .on(table.org_id, table.slug)
```
Cette contrainte garantit l'unicité du slug **au niveau organisationnel**, permettant à différentes organisations d'utiliser le même slug.

#### 📁 Offers (`src/lib/db/queries/offers.ts`)

**Toutes les fonctions prennent `orgId` en paramètre et filtrent** :

| Fonction | Ligne | Filtre |
|----------|-------|--------|
| `listOffers(orgId)` | 44-48 | `eq(offers.org_id, orgId)` |
| `getOfferById(id, orgId)` | 54-58 | `and(eq(offers.id, id), eq(offers.org_id, orgId))` |
| `createOffer(data)` | 65-79 | `org_id: data.orgId` (insert) |
| `updateOffer(id, orgId, data)` | 96-117 | `and(eq(offers.id, id), eq(offers.org_id, orgId))` |
| `listOffersByClient(clientId, orgId)` | 125-130 | `and(eq(offers.org_id, orgId), eq(offers.client_id, clientId))` |
| `countOffers(orgId)` | 136-140 | `eq(offers.org_id, orgId)` |
| `getRecentOffers(orgId, limit)` | 144-148 | `eq(offers.org_id, orgId)` |

**Exemple concret** :
```typescript
// src/lib/db/queries/offers.ts, lignes 44-49
export async function listOffers(orgId: string): Promise<Offer[]> {
  if (!orgId) throw new Error('orgId is required');
  const results = await db.select()
    .from(offers)
    .where(eq(offers.org_id, orgId)) // ← Filtre multi-tenant
    .orderBy(desc(offers.created_at));
}
```

### ✅ Utilisation de getCurrentOrgId() dans les pages/API

**Tous les appels utilisent `getCurrentOrgId()`** (jamais de valeur hardcodée) :

| Fichier | Ligne | Usage |
|---------|-------|-------|
| `src/app/(dashboard)/clients/page.tsx` | 25 | `const orgId = await getCurrentOrgId();` |
| `src/app/(dashboard)/templates/page.tsx` | 11 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/clients/route.ts` | 28, 87 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/templates/route.ts` | 31, 73 | `const orgId = await getCurrentOrgId();` |
| `src/app/api/offers/route.ts` | 9, 29 | `const orgId = await getCurrentOrgId();` |

**Aucun orgId hardcodé trouvé** dans le code de production (seulement dans les tests).

### ✅ Schéma DB

**Toutes les tables ont `org_id`** :

```typescript
// src/lib/db/schema.ts
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull(), // ← Champ multi-tenant
  // ...
});

export const templates = pgTable('templates', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull(), // ← Champ multi-tenant
  // ...
});

export const offers = pgTable('offers', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull(), // ← Champ multi-tenant
  // ...
});
```

---

## 3. Conclusion

### ✅ Multi-tenant : **OK**

**Le système est correctement architecturé pour le multi-tenant** :

1. ✅ **Source de vérité unique** : `getCurrentOrgId()` est la seule fonction pour récupérer l'orgId
2. ✅ **Toutes les queries filtrent** : Clients, Templates, Offers filtrent systématiquement sur `org_id`
3. ✅ **Pas de valeurs hardcodées** : Aucun orgId hardcodé dans le code de production
4. ✅ **Schéma DB cohérent** : Toutes les tables ont un champ `org_id` obligatoire
5. ✅ **Contraintes DB multi-tenant** : Les contraintes uniques incluent `org_id` (ex: `(org_id, slug)`)
6. ✅ **Validation systématique** : Toutes les fonctions de query vérifient `if (!orgId) throw new Error('orgId is required')`

**Le système fonctionne actuellement en mono-tenant** grâce au fallback `DEFAULT_ORG_ID`, mais l'architecture est **prête pour le multi-tenant** dès qu'on assignera des `org_id` différents aux utilisateurs dans Supabase Auth.

**Pour activer le multi-tenant** :
1. Définir `org_id` dans `user_metadata` pour chaque utilisateur Supabase
2. Retirer `DEFAULT_ORG_ID` des variables d'environnement (ou le garder comme fallback de sécurité)
3. Le système fonctionnera automatiquement en multi-tenant sans modification de code

---

**Fin du document**

