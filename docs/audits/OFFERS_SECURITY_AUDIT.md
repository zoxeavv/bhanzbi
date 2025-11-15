# Audit de Sécurité - Offres (Offers)
## État des lieux factuel des protections

**Date**: 2024  
**Méthodologie**: Analyse statique du code source uniquement  
**Scope**: Routes API, queries DB, server actions, pages liées aux offres

---

## Résumé Exécutif

Analyse de tous les endpoints et actions liés aux offres pour vérifier la protection des opérations de modification et suppression. Constat : aucune route de modification ou suppression d'offre n'utilise `requireAdmin()`. Toutes les routes utilisent uniquement `getCurrentOrgId()` pour le filtrage multi-tenant, mais aucune vérification de rôle admin n'est effectuée. Les queries DB filtrent correctement par orgId.

---

## Routes API - Détail par Endpoint

### 1. GET /api/offers/[id]

**Fichier**: `src/app/api/offers/[id]/route.ts`  
**Lignes**: 10-58  
**Méthode**: GET  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(id, orgId)` ligne 18)  
**Opération**: Lecture d'une offre

**Code**:
```typescript
export async function GET(...) {
  const orgId = await getCurrentOrgId();
  const offer = await getOfferById(id, orgId);
  // ...
}
```

---

### 2. PATCH /api/offers/[id]

**Fichier**: `src/app/api/offers/[id]/route.ts`  
**Lignes**: 60-136  
**Méthode**: PATCH  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`updateOffer(id, orgId, updateData)` ligne 121)  
**Opération**: Modification d'une offre (title, items, tax_rate, status, etc.)

**Code**:
```typescript
export async function PATCH(...) {
  const orgId = await getCurrentOrgId();
  await getOfferById(id, orgId); // Vérification existence
  const updatedOffer = await updateOffer(id, orgId, updateData);
  // ...
}
```

**Constats**:
- ❌ Pas de `requireAdmin()` avant modification
- ✅ orgId filtré dans la query
- ✅ Vérification existence avant modification

---

### 3. GET /api/offres

**Fichier**: `src/app/api/offres/route.ts`  
**Lignes**: 7-25  
**Méthode**: GET  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`listOffers(orgId)` ligne 10)  
**Opération**: Liste toutes les offres

**Code**:
```typescript
export async function GET() {
  const orgId = await getCurrentOrgId();
  const offers = await listOffers(orgId);
  // ...
}
```

---

### 4. POST /api/offres

**Fichier**: `src/app/api/offres/route.ts`  
**Lignes**: 27-68  
**Méthode**: POST  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`createOffer({ orgId, ... })` ligne 33)  
**Opération**: Création d'une nouvelle offre

**Code**:
```typescript
export async function POST(request: Request) {
  const orgId = await getCurrentOrgId();
  const offer = await createOffer({
    orgId,
    // ...
  });
  // ...
}
```

**Constats**:
- ❌ Pas de `requireAdmin()` avant création
- ✅ orgId filtré dans la query

---

### 5. GET /api/offres/[id]

**Fichier**: `src/app/api/offres/[id]/route.ts`  
**Lignes**: 7-27  
**Méthode**: GET  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(id, orgId)` ligne 15)  
**Opération**: Lecture d'une offre

**Code**:
```typescript
export async function GET(...) {
  const orgId = await getCurrentOrgId();
  const offer = await getOfferById(id, orgId);
  // ...
}
```

---

### 6. PATCH /api/offres/[id]

**Fichier**: `src/app/api/offres/[id]/route.ts`  
**Lignes**: 29-58  
**Méthode**: PATCH  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`updateOffer(id, orgId, validatedData)` ligne 40)  
**Opération**: Modification d'une offre

**Code**:
```typescript
export async function PATCH(...) {
  const orgId = await getCurrentOrgId();
  const offer = await updateOffer(id, orgId, validatedData);
  // ...
}
```

**Constats**:
- ❌ Pas de `requireAdmin()` avant modification
- ✅ orgId filtré dans la query

---

### 7. GET /api/offres/[id]/versions

**Fichier**: `src/app/api/offres/[id]/versions/route.ts`  
**Lignes**: 5-26  
**Méthode**: GET  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(id, orgId)` ligne 13)  
**Opération**: Liste les versions d'une offre

**Code**:
```typescript
export async function GET(...) {
  const orgId = await getCurrentOrgId();
  await getOfferById(id, orgId);
  // ...
}
```

---

### 8. POST /api/offres/[id]/versions

**Fichier**: `src/app/api/offres/[id]/versions/route.ts`  
**Lignes**: 28-61  
**Méthode**: POST  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(id, orgId)` ligne 36)  
**Opération**: Création d'une version d'offre

**Code**:
```typescript
export async function POST(...) {
  const orgId = await getCurrentOrgId();
  const offer = await getOfferById(id, orgId);
  // Création version (TODO: pas encore migré vers Drizzle)
  // ...
}
```

**Constats**:
- ❌ Pas de `requireAdmin()` avant création de version
- ✅ orgId filtré dans la query

---

### 9. POST /api/pdf/generate

**Fichier**: `src/app/api/pdf/generate/route.ts`  
**Lignes**: 8-60  
**Méthode**: POST  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(offreId, orgId)` ligne 17, `updateOffer(offreId, orgId, { status: "sent" })` ligne 41)  
**Opération**: Génération PDF + modification du statut de l'offre en "sent"

**Code**:
```typescript
export async function POST(request: Request) {
  const orgId = await getCurrentOrgId();
  const offer = await getOfferById(offreId, orgId);
  // Génération PDF...
  await updateOffer(offreId, orgId, { status: "sent" });
  // ...
}
```

**Constats**:
- ❌ Pas de `requireAdmin()` avant modification du statut
- ✅ orgId filtré dans les queries
- ⚠️ Modifie le statut de l'offre (opération critique)

---

### 10. GET /api/generate-pdf/[id]

**Fichier**: `src/app/api/generate-pdf/[id]/route.ts`  
**Lignes**: 7-45  
**Méthode**: GET  
**Guard utilisé**: Aucun (`getCurrentOrgId()` uniquement)  
**orgId filtré**: ✅ Oui (`getOfferById(id, orgId)` ligne 15)  
**Opération**: Génération PDF (lecture seule, pas de modification)

**Code**:
```typescript
export async function GET(...) {
  const orgId = await getCurrentOrgId();
  const offer = await getOfferById(id, orgId);
  // Génération PDF...
}
```

---

## Queries DB - Détail par Fonction

### 1. listOffers(orgId: string)

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 44-52  
**orgId filtré**: ✅ Oui (WHERE `eq(offers.org_id, orgId)` ligne 48)  
**Opération**: Lecture

---

### 2. getOfferById(id: string, orgId: string)

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 54-63  
**orgId filtré**: ✅ Oui (WHERE `and(eq(offers.id, id), eq(offers.org_id, orgId))` ligne 58)  
**Opération**: Lecture

---

### 3. createOffer(data: { orgId: string, ... })

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 65-94  
**orgId filtré**: ✅ Oui (`org_id: data.orgId` ligne 79)  
**Opération**: Création

---

### 4. updateOffer(id: string, orgId: string, data: {...})

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 96-123  
**orgId filtré**: ✅ Oui (WHERE `and(eq(offers.id, id), eq(offers.org_id, orgId))` ligne 117)  
**Opération**: Modification

---

### 5. listOffersByClient(clientId: string, orgId: string)

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 125-134  
**orgId filtré**: ✅ Oui (WHERE `and(eq(offers.org_id, orgId), eq(offers.client_id, clientId))` ligne 130)  
**Opération**: Lecture

---

### 6. countOffers(orgId: string)

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 136-142  
**orgId filtré**: ✅ Oui (WHERE `eq(offers.org_id, orgId)` ligne 140)  
**Opération**: Lecture

---

### 7. getRecentOffers(orgId: string, limit: number)

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 144-153  
**orgId filtré**: ✅ Oui (WHERE `eq(offers.org_id, orgId)` ligne 148)  
**Opération**: Lecture

---

### 8. getLastUsedAtByTemplateIds(orgId: string, templateIds: string[])

**Fichier**: `src/lib/db/queries/offers.ts`  
**Lignes**: 170-221  
**orgId filtré**: ✅ Oui (WHERE `and(eq(offers.org_id, orgId), ...)` ligne 191)  
**Opération**: Lecture

---

## Server Actions

**Constats**: Aucune server action identifiée pour les offres dans le code analysé.

---

## Pages

### 1. /offres (page.tsx)

**Fichier**: `src/app/(dashboard)/offres/page.tsx`  
**Type**: Client Component  
**Opérations**: Lecture uniquement (fetch `/api/offres`)  
**Protection**: Dépend du middleware pour l'authentification

---

### 2. /offres/[id] (page.tsx)

**Fichier**: `src/app/(dashboard)/offres/[id]/page.tsx`  
**Type**: Server Component  
**Opérations**: Lecture uniquement (`getOfferById(id, orgId)`)  
**Protection**: Utilise `getCurrentOrgId()` (ligne 37), dépend du middleware pour l'authentification

---

## Composants Clients

### 1. OfferEditFormWrapper

**Fichier**: `src/components/offres/OfferEditFormWrapper.tsx`  
**Opérations**: Appelle `PATCH /api/offers/${offerId}` (ligne 30)  
**Protection**: Aucune vérification côté client, dépend de la protection API

---

## Tableau Récapitulatif

| Endpoint/Action | Méthode | Guard | orgId filtré | Opération |
|----------------|---------|-------|--------------|-----------|
| GET /api/offers/[id] | GET | Aucun | ✅ | Lecture |
| PATCH /api/offers/[id] | PATCH | Aucun | ✅ | Modification |
| GET /api/offres | GET | Aucun | ✅ | Lecture |
| POST /api/offres | POST | Aucun | ✅ | Création |
| GET /api/offres/[id] | GET | Aucun | ✅ | Lecture |
| PATCH /api/offres/[id] | PATCH | Aucun | ✅ | Modification |
| GET /api/offres/[id]/versions | GET | Aucun | ✅ | Lecture |
| POST /api/offres/[id]/versions | POST | Aucun | ✅ | Création version |
| POST /api/pdf/generate | POST | Aucun | ✅ | Modification statut |
| GET /api/generate-pdf/[id] | GET | Aucun | ✅ | Lecture |
| createOffer() | Query | N/A | ✅ | Création |
| updateOffer() | Query | N/A | ✅ | Modification |

---

## Constats Finaux

### Points Positifs

1. ✅ **Toutes les queries DB filtrent par orgId** : Toutes les fonctions de query utilisent orgId dans les clauses WHERE
2. ✅ **orgId jamais accepté du client** : Toutes les routes utilisent `getCurrentOrgId()` qui extrait orgId depuis la session
3. ✅ **Vérification existence avant modification** : La route `PATCH /api/offers/[id]` vérifie l'existence de l'offre avant modification

### Points d'Attention

1. ❌ **Aucune route de modification n'utilise `requireAdmin()`** :
   - `PATCH /api/offers/[id]` : Modification sans vérification admin
   - `PATCH /api/offres/[id]` : Modification sans vérification admin
   - `POST /api/pdf/generate` : Modification du statut sans vérification admin

2. ❌ **Aucune route de création n'utilise `requireAdmin()`** :
   - `POST /api/offres` : Création sans vérification admin
   - `POST /api/offres/[id]/versions` : Création de version sans vérification admin

3. ⚠️ **Routes de lecture sans `requireSession()` explicite** :
   - Toutes les routes GET dépendent uniquement du middleware pour l'authentification
   - Pas de vérification explicite de session dans les routes API

### Résumé

**Routes de modification/suppression protégées par `requireAdmin()`** : 0 / 3
- `PATCH /api/offers/[id]` : ❌ Non protégée
- `PATCH /api/offres/[id]` : ❌ Non protégée
- `POST /api/pdf/generate` : ❌ Non protégée (modifie le statut)

**Routes de création protégées par `requireAdmin()`** : 0 / 2
- `POST /api/offres` : ❌ Non protégée
- `POST /api/offres/[id]/versions` : ❌ Non protégée

**orgId filtré** : ✅ 100% des routes et queries

---

**Fin de l'audit**

