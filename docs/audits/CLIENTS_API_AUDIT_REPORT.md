# 🔒 AUDIT ET RENFORCEMENT API CLIENTS

**Date** : 2024-12-19  
**Objectif** : Auditer et renforcer l'API clients selon le modèle multi-tenant sécurisé

---

## ✅ RÉSUMÉ DES AMÉLIORATIONS

L'API clients a été **auditée et renforcée** selon les exigences de sécurité multi-tenant :

1. ✅ **Sécurité multi-tenant** : Toutes les queries filtrent par `org_id` via `getCurrentOrgId()`
2. ✅ **Protection des mutations** : `requireAdmin()` sur POST/PATCH/DELETE
3. ✅ **Protection contre l'injection d'orgId** : Vérification explicite que `org_id` ne vient jamais du client
4. ✅ **Pagination et recherche** : GET `/api/clients` supporte `search`, `status`, `page`, `limit`
5. ✅ **Gestion d'erreurs** : Messages d'erreur en français cohérents
6. ✅ **Validation Zod** : Schéma complet avec tous les champs demandés

---

## 📋 DÉTAILS DES CHANGEMENTS

### 1. Queries (`src/lib/db/queries/clients.ts`)

#### ✅ Fonction `listClients()` améliorée

**Avant** : Retournait tous les clients sans pagination ni recherche

**Après** : 
- Support de pagination (`page`, `limit` avec max 100)
- Recherche textuelle sur `name`, `company`, `email` (ILIKE)
- Filtre par `status` (préparé pour futur champ)
- Retourne `{ data, page, pageSize, totalCount }`
- **TOUJOURS filtré par `orgId`** (sécurité multi-tenant)

```typescript
export interface ListClientsOptions {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedClientsResult {
  data: Client[];
  page: number;
  pageSize: number;
  totalCount: number;
}
```

#### ✅ Toutes les fonctions vérifient `orgId`

- `listClients()` : `if (!orgId) throw new Error('orgId is required')`
- `getClientById()` : Déjà présent
- `createClient()` : Déjà présent
- `updateClient()` : Déjà présent
- `deleteClient()` : Déjà présent

---

### 2. Schéma Zod (`src/lib/validations.ts`)

#### ✅ Schéma `createClientSchema` enrichi

**Champs ajoutés** :
- `address?: string`
- `city?: string`
- `zip?: string`
- `country?: string`
- `notes?: string`
- `status?: 'prospect' | 'active' | 'inactive'`

**Compatibilité** :
- Support de `company_name` (alias) et `company` (champ DB)
- Transformation automatique : `company_name` → `company` si nécessaire

**Sécurité** :
- ⚠️ **NE CONTIENT JAMAIS `org_id`** - vient toujours de `getCurrentOrgId()`

```typescript
export const createClientSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  company_name: z.string().optional(), // Alias
  company: z.string().optional(), // Champ DB réel
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['prospect', 'active', 'inactive']).optional(),
  tags: z.array(z.string()).optional(),
}).transform((data) => {
  // Normaliser company_name → company
  if (data.company_name && !data.company) {
    return { ...data, company: data.company_name };
  }
  return data;
});
```

---

### 3. Route GET `/api/clients` (`src/app/api/clients/route.ts`)

#### ✅ Pagination et recherche

**Query params supportés** :
- `search` : Recherche textuelle sur name, company, email (ILIKE)
- `status` : Filtre exact sur status (si champ présent)
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre d'éléments par page (défaut: 20, max: 100)

**Sécurité** :
- ✅ `requireSession()` pour authentification
- ✅ `orgId` vient de `getCurrentOrgId()`, jamais des query params
- ✅ Validation des paramètres de pagination

**Réponse** :
```json
{
  "data": [...],
  "page": 1,
  "pageSize": 20,
  "totalCount": 42
}
```

#### ✅ Gestion d'erreurs en français

- `400` : "Le paramètre page doit être un nombre entier positif"
- `401` : "Non autorisé"
- `500` : "Erreur serveur lors de la récupération des clients"

---

### 4. Route POST `/api/clients` (`src/app/api/clients/route.ts`)

#### ✅ Protection admin

**Avant** : Pas de vérification de rôle

**Après** :
- ✅ `requireAdmin()` avant toute création
- ✅ Vérification explicite que `org_id` n'est pas dans le body
- ✅ `orgId` vient de `getCurrentOrgId()`, jamais du body

**Sécurité** :
```typescript
// Vérifier les permissions admin
await requireAdmin();
const orgId = await getCurrentOrgId();

// SÉCURITÉ : Vérifier explicitement qu'org_id n'est pas dans le body
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Gestion d'erreurs** :
- `400` : "Données invalides" + détails Zod
- `401` : "Non autorisé"
- `500` : "Erreur serveur lors de la création du client"

---

### 5. Route GET `/api/clients/[id]` (`src/app/api/clients/[id]/route.ts`)

#### ✅ Sécurité renforcée

**Améliorations** :
- ✅ `requireSession()` pour authentification
- ✅ Validation de l'ID (non vide, string valide)
- ✅ Filtrage par `orgId` (déjà présent dans `getClientById()`)
- ✅ Messages d'erreur en français

**Gestion d'erreurs** :
- `400` : "ID de client invalide"
- `401` : "Non autorisé"
- `404` : "Client introuvable" (pas de leak d'info inter-org)
- `500` : "Erreur serveur lors de la récupération du client"

---

### 6. Route PATCH `/api/clients/[id]` (`src/app/api/clients/[id]/route.ts`)

#### ✅ Protection admin + vérification existence

**Avant** : Pas de vérification de rôle, pas de vérification d'existence

**Après** :
- ✅ `requireAdmin()` avant toute modification
- ✅ Vérification explicite que `org_id` n'est pas dans le body
- ✅ Vérification de l'existence du client avant mise à jour
- ✅ Validation de l'ID

**Sécurité** :
```typescript
// Vérifier les permissions admin
await requireAdmin();
const orgId = await getCurrentOrgId();

// Vérifier l'existence du client avant mise à jour
await getClientById(id, orgId);

// Mettre à jour le client
const client = await updateClient(id, orgId, validatedData);
```

**Gestion d'erreurs** :
- `400` : "Données invalides" ou "ID de client invalide"
- `401` : "Non autorisé"
- `404` : "Client introuvable"
- `500` : "Erreur serveur lors de la mise à jour du client"

---

### 7. Route DELETE `/api/clients/[id]` (`src/app/api/clients/[id]/route.ts`)

#### ✅ Protection admin + TODO soft delete

**Avant** : Pas de vérification de rôle

**Après** :
- ✅ `requireAdmin()` avant toute suppression
- ✅ Vérification de l'existence du client avant suppression
- ✅ TODO commenté pour soft delete (si `is_archived` ou `deleted_at` ajouté)

**Sécurité** :
```typescript
// Vérifier les permissions admin
await requireAdmin();
const orgId = await getCurrentOrgId();

// Vérifier l'existence du client avant suppression
await getClientById(id, orgId);

// Hard delete pour l'instant
await deleteClient(id, orgId);

// TODO: Si un champ is_archived ou deleted_at est ajouté au schéma clients,
// implémenter un soft delete au lieu d'un hard delete
```

**Gestion d'erreurs** :
- `400` : "ID de client invalide"
- `401` : "Non autorisé"
- `404` : "Client introuvable"
- `500` : "Erreur serveur lors de la suppression du client"

---

## 🔒 POINTS DE SÉCURITÉ VÉRIFIÉS

### ✅ Multi-tenant

1. **`orgId` vient TOUJOURS de `getCurrentOrgId()`**
   - ✅ Jamais depuis le body (POST/PATCH)
   - ✅ Jamais depuis les query params (GET)
   - ✅ Jamais depuis les headers
   - ✅ Vérification explicite dans POST/PATCH

2. **Toutes les queries filtrent par `org_id`**
   - ✅ `listClients(orgId, options)`
   - ✅ `getClientById(id, orgId)`
   - ✅ `createClient({ orgId, ... })`
   - ✅ `updateClient(id, orgId, data)`
   - ✅ `deleteClient(id, orgId)`

3. **Assertions `orgId` obligatoire**
   - ✅ Toutes les fonctions vérifient `if (!orgId) throw new Error('orgId is required')`

### ✅ Autorisations

1. **GET** : `requireSession()` (utilisateurs authentifiés)
2. **POST** : `requireAdmin()` (admins uniquement)
3. **PATCH** : `requireAdmin()` (admins uniquement)
4. **DELETE** : `requireAdmin()` (admins uniquement)

### ✅ Protection IDOR

1. **GET `/api/clients/[id]`** : Filtre par `id` + `orgId` → 404 si non trouvé
2. **PATCH `/api/clients/[id]`** : Vérifie existence avant mise à jour → 404 si non trouvé
3. **DELETE `/api/clients/[id]`** : Vérifie existence avant suppression → 404 si non trouvé

**Choix de sécurité** : Ne pas différencier entre "client n'existe pas" et "client dans autre org" pour éviter les leaks d'information.

---

## 📝 NOTES IMPORTANTES

### Champs non persistés (pour l'instant)

Les champs suivants sont acceptés dans le schéma Zod mais **ne sont pas encore persistés** dans la DB :
- `address`
- `city`
- `zip`
- `country`
- `notes`
- `status`

**Raison** : Le schéma DB actuel (`src/lib/db/schema.ts`) ne contient pas ces champs. Ils seront ignorés lors de la création/mise à jour jusqu'à ce qu'une migration soit créée.

**Action future** : Créer une migration Drizzle pour ajouter ces champs si nécessaire.

### Soft delete

La route DELETE implémente un **hard delete** pour l'instant. Un TODO est présent pour implémenter un soft delete si les champs `is_archived` ou `deleted_at` sont ajoutés au schéma.

---

## 🧪 TESTS RECOMMANDÉS

1. **Test multi-tenant** :
   - Créer un client dans org1
   - Essayer de le récupérer avec org2 → doit retourner 404

2. **Test permissions** :
   - GET avec utilisateur non authentifié → 401
   - POST avec utilisateur USER (non admin) → 401
   - POST avec utilisateur ADMIN → 201

3. **Test injection orgId** :
   - POST avec `{ "name": "Test", "org_id": "evil-org" }` → 400
   - PATCH avec `{ "org_id": "evil-org" }` → 400

4. **Test pagination** :
   - GET `/api/clients?page=1&limit=10` → vérifier structure de réponse
   - GET `/api/clients?page=0` → 400
   - GET `/api/clients?limit=200` → 400 (max 100)

5. **Test recherche** :
   - GET `/api/clients?search=test` → vérifier filtrage sur name, company, email

---

## ✅ CHECKLIST FINALE

- [x] Toutes les queries filtrent par `org_id = orgId`
- [x] Aucune route n'accepte `orgId` depuis le client (body, query, headers)
- [x] POST/PATCH/DELETE utilisent `requireAdmin()`
- [x] GET utilise `requireSession()` mais filtré par `orgId`
- [x] GET `/api/clients` supporte pagination (`page`, `limit`)
- [x] GET `/api/clients` supporte recherche (`search` sur name, company, email)
- [x] GET `/api/clients` supporte filtre `status` (préparé pour futur)
- [x] GET `/api/clients/[id]` retourne 404 JSON propre si non trouvé
- [x] POST `/api/clients` valide avec Zod (tous les champs demandés)
- [x] POST `/api/clients` retourne 201 + client créé
- [x] PATCH `/api/clients/[id]` utilise `.partial()` sur le schéma Zod
- [x] PATCH `/api/clients/[id]` vérifie existence avant mise à jour
- [x] DELETE `/api/clients/[id]` protégé par `requireAdmin()`
- [x] DELETE `/api/clients/[id]` TODO pour soft delete commenté
- [x] Gestion d'erreurs en français cohérentes (400, 404, 500)
- [x] Aucun `any` dans le code TypeScript
- [x] Code clair et bien typé

---

**Fin du rapport d'audit**

