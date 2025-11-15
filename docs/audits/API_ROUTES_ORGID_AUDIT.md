# Audit des Routes API - Gestion de l'orgId
## État des lieux factuel : routes acceptant un body JSON

**Date**: 2024  
**Méthodologie**: Analyse statique du code source uniquement  
**Scope**: Toutes les routes API POST, PATCH, DELETE acceptant un body JSON

---

## Résumé Exécutif

Analyse de toutes les routes API qui acceptent un body JSON (POST, PATCH, DELETE) pour vérifier que l'orgId n'est jamais accepté depuis le client. Constat : la majorité des routes utilisent `getCurrentOrgId()` pour obtenir l'orgId. Certaines routes vérifient explicitement l'interdiction de `org_id` ou `orgId` dans le body, d'autres non. Aucune route n'utilise un orgId envoyé par le client.

---

## Routes Analysées

### 1. POST /api/clients

**Fichier**: `src/app/api/clients/route.ts`  
**Lignes**: 83-137  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 89)  
**org_id/orgId interdits explicitement**: ✅ Oui (lignes 92-96)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 87)  
**Code de vérification**:
```typescript
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Constats**:
- ✅ Body parsé
- ✅ Vérification explicite d'interdiction de `org_id` et `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `createClient({ orgId, ... })` ligne 103

---

### 2. PATCH /api/clients/[id]

**Fichier**: `src/app/api/clients/[id]/route.ts`  
**Lignes**: 70-142  
**Méthode**: PATCH  
**Body parsé**: ✅ Oui (`await request.json()` ligne 88)  
**org_id/orgId interdits explicitement**: ✅ Oui (lignes 91-95)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 77)  
**Code de vérification**:
```typescript
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Constats**:
- ✅ Body parsé
- ✅ Vérification explicite d'interdiction de `org_id` et `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `updateClient(id, orgId, {...})` ligne 105

---

### 3. DELETE /api/clients/[id]

**Fichier**: `src/app/api/clients/[id]/route.ts`  
**Lignes**: 157-207  
**Méthode**: DELETE  
**Body parsé**: ❌ Non (pas de body JSON, seulement params)  
**org_id/orgId interdits explicitement**: N/A (pas de body)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 164)  
**Constats**:
- ✅ Pas de body JSON (DELETE avec params uniquement)
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `deleteClient(id, orgId)` ligne 185

---

### 4. POST /api/templates

**Fichier**: `src/app/api/templates/route.ts`  
**Lignes**: 73-118  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 83)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 79)  
**Validation**: `createTemplateSchema.parse(body)` ligne 84

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `createTemplate({ orgId, ... })` ligne 86
- ⚠️ Le schéma Zod pourrait rejeter `org_id`/`orgId` si non défini dans le schéma, mais pas de vérification explicite

---

### 5. PATCH /api/templates/[id]

**Fichier**: `src/app/api/templates/[id]/route.ts`  
**Lignes**: 69-125  
**Méthode**: PATCH  
**Body parsé**: ✅ Oui (`await request.json()` ligne 80)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 75)  
**Validation**: `createTemplateSchema.partial().parse(body)` ligne 83

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `updateTemplate(id, orgId, validatedData)` ligne 107
- ⚠️ Le schéma Zod pourrait rejeter `org_id`/`orgId` si non défini dans le schéma, mais pas de vérification explicite

---

### 6. POST /api/settings/admin-allowed-emails

**Fichier**: `src/app/api/settings/admin-allowed-emails/route.ts`  
**Lignes**: 57-117  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 64)  
**org_id/orgId interdits explicitement**: ✅ Oui (lignes 67-71)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 62)  
**Code de vérification**:
```typescript
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Constats**:
- ✅ Body parsé
- ✅ Vérification explicite d'interdiction de `org_id` et `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `addAdminAllowedEmail(orgId, normalizedEmail, session.user.id)` ligne 87

---

### 7. DELETE /api/settings/admin-allowed-emails

**Fichier**: `src/app/api/settings/admin-allowed-emails/route.ts`  
**Lignes**: 131-182  
**Méthode**: DELETE  
**Body parsé**: ✅ Oui (`await request.json()` ligne 137)  
**org_id/orgId interdits explicitement**: ✅ Oui (lignes 140-144)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 135)  
**Code de vérification**:
```typescript
if ('org_id' in body || 'orgId' in body) {
  return NextResponse.json(
    { error: 'Le champ org_id ne peut pas être fourni dans la requête' },
    { status: 400 }
  );
}
```

**Constats**:
- ✅ Body parsé
- ✅ Vérification explicite d'interdiction de `org_id` et `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `deleteAdminAllowedEmail(orgId, id.trim())` ligne 157

---

### 8. POST /api/offres

**Fichier**: `src/app/api/offres/route.ts`  
**Lignes**: 27-68  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 30)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 29)  
**Validation**: `createOfferSchema.parse(body)` ligne 31

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `createOffer({ orgId, ... })` ligne 33
- ⚠️ Le schéma Zod pourrait rejeter `org_id`/`orgId` si non défini dans le schéma, mais pas de vérification explicite

---

### 9. PATCH /api/offres/[id]

**Fichier**: `src/app/api/offres/[id]/route.ts`  
**Lignes**: 29-58  
**Méthode**: PATCH  
**Body parsé**: ✅ Oui (`await request.json()` ligne 36)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 34)  
**Validation**: `createOfferSchema.partial().parse(body)` ligne 38

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `updateOffer(id, orgId, validatedData)` ligne 40
- ⚠️ Le schéma Zod pourrait rejeter `org_id`/`orgId` si non défini dans le schéma, mais pas de vérification explicite

---

### 10. PATCH /api/offers/[id]

**Fichier**: `src/app/api/offers/[id]/route.ts`  
**Lignes**: 60-136  
**Méthode**: PATCH  
**Body parsé**: ✅ Oui (`await request.json()` ligne 67)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 66)  
**Validation**: Pas de validation Zod, extraction manuelle des champs (lignes 83-119)

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `updateOffer(id, orgId, updateData)` ligne 121
- ⚠️ Pas de validation Zod, extraction manuelle des champs du body

---

### 11. POST /api/offres/[id]/versions

**Fichier**: `src/app/api/offres/[id]/versions/route.ts`  
**Lignes**: 28-61  
**Méthode**: POST  
**Body parsé**: ❌ Non (pas de body JSON utilisé, seulement params)  
**org_id/orgId interdits explicitement**: N/A (pas de body)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 33)  
**Constats**:
- ✅ Pas de body JSON utilisé (seulement params)
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `getOfferById(id, orgId)` ligne 36
- ⚠️ Route retourne un objet mock (TODO: pas encore migré vers Drizzle)

---

### 12. POST /api/pdf/generate

**Fichier**: `src/app/api/pdf/generate/route.ts`  
**Lignes**: 8-60  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 11)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getCurrentOrgId()` (ligne 10)  
**Body utilisé**: `{ offreId }` extrait ligne 11

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getCurrentOrgId()`
- ✅ orgId utilisé dans `getOfferById(offreId, orgId)` ligne 17 et `updateOffer(offreId, orgId, { status: "sent" })` ligne 41
- ⚠️ Le body contient seulement `offreId`, pas de champ `org_id`/`orgId` attendu, mais pas de vérification explicite

---

### 13. POST /api/auth/register

**Fichier**: `src/app/api/auth/register/route.ts`  
**Lignes**: 26-147  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 28)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getRequiredDefaultOrgId()` (ligne 45)  
**Body utilisé**: `{ email, password, display_name }` extrait ligne 29

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getRequiredDefaultOrgId()` (pas depuis le client)
- ✅ orgId utilisé dans `user_metadata` ligne 86 et 118
- ⚠️ Route d'inscription publique, orgId vient de la config serveur, pas du client

---

### 14. POST /api/auth/exchange

**Fichier**: `src/app/api/auth/exchange/route.ts`  
**Lignes**: 28-109  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 30)  
**org_id/orgId interdits explicitement**: N/A (route d'échange de tokens, pas d'orgId utilisé)  
**orgId utilisé obtenu via**: N/A (pas d'orgId utilisé dans cette route)  
**Body utilisé**: `{ access_token, refresh_token }` extrait ligne 31

**Constats**:
- ✅ Body parsé
- N/A Pas d'orgId utilisé dans cette route (échange de tokens uniquement)

---

### 15. POST /api/auth/webhook/user-created

**Fichier**: `src/app/api/auth/webhook/user-created/route.ts`  
**Lignes**: 63-219  
**Méthode**: POST  
**Body parsé**: ✅ Oui (`await request.json()` ligne 82)  
**org_id/orgId interdits explicitement**: ❌ Non (pas de vérification explicite)  
**orgId utilisé obtenu via**: `getRequiredDefaultOrgId()` (ligne 142)  
**Body utilisé**: Payload webhook Supabase (formats multiples supportés lignes 88-102)

**Constats**:
- ✅ Body parsé
- ❌ Pas de vérification explicite d'interdiction de `org_id` ou `orgId`
- ✅ orgId obtenu via `getRequiredDefaultOrgId()` (pas depuis le client)
- ✅ orgId utilisé dans `user_metadata` ligne 184
- ⚠️ Route webhook appelée par Supabase, pas par le client directement

---

## Tableau Récapitulatif

| Route | Méthode | Body parsé | org_id/orgId interdits | orgId obtenu via | orgId utilisé |
|-------|---------|------------|------------------------|------------------|---------------|
| POST /api/clients | POST | ✅ | ✅ | `getCurrentOrgId()` | ✅ |
| PATCH /api/clients/[id] | PATCH | ✅ | ✅ | `getCurrentOrgId()` | ✅ |
| DELETE /api/clients/[id] | DELETE | N/A | N/A | `getCurrentOrgId()` | ✅ |
| POST /api/templates | POST | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| PATCH /api/templates/[id] | PATCH | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| POST /api/settings/admin-allowed-emails | POST | ✅ | ✅ | `getCurrentOrgId()` | ✅ |
| DELETE /api/settings/admin-allowed-emails | DELETE | ✅ | ✅ | `getCurrentOrgId()` | ✅ |
| POST /api/offres | POST | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| PATCH /api/offres/[id] | PATCH | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| PATCH /api/offers/[id] | PATCH | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| POST /api/offres/[id]/versions | POST | N/A | N/A | `getCurrentOrgId()` | ✅ |
| POST /api/pdf/generate | POST | ✅ | ❌ | `getCurrentOrgId()` | ✅ |
| POST /api/auth/register | POST | ✅ | ❌ | `getRequiredDefaultOrgId()` | ✅ |
| POST /api/auth/exchange | POST | ✅ | N/A | N/A | N/A |
| POST /api/auth/webhook/user-created | POST | ✅ | ❌ | `getRequiredDefaultOrgId()` | ✅ |

---

## Constats Finaux

### Points Positifs

1. ✅ **Toutes les routes utilisent `getCurrentOrgId()` ou `getRequiredDefaultOrgId()`** : Aucune route n'extrait l'orgId depuis le body de la requête
2. ✅ **orgId toujours obtenu côté serveur** : Toutes les routes obtiennent l'orgId depuis la session ou la configuration serveur
3. ✅ **Routes critiques protégées** : Les routes `/api/clients` et `/api/settings/admin-allowed-emails` vérifient explicitement l'interdiction de `org_id`/`orgId`

### Points d'Attention

1. ⚠️ **Routes sans vérification explicite** :
   - `POST /api/templates` : Pas de vérification explicite
   - `PATCH /api/templates/[id]` : Pas de vérification explicite
   - `POST /api/offres` : Pas de vérification explicite
   - `PATCH /api/offres/[id]` : Pas de vérification explicite
   - `PATCH /api/offers/[id]` : Pas de vérification explicite
   - `POST /api/pdf/generate` : Pas de vérification explicite
   - `POST /api/auth/register` : Pas de vérification explicite (mais orgId vient de config serveur)
   - `POST /api/auth/webhook/user-created` : Pas de vérification explicite (mais orgId vient de config serveur)

2. ⚠️ **Validation Zod** : Certaines routes utilisent des schémas Zod (`createClientSchema`, `createTemplateSchema`, `createOfferSchema`) qui pourraient rejeter `org_id`/`orgId` si non définis dans le schéma, mais ce n'est pas une vérification explicite d'interdiction

### Conclusion

**✅ Aucune route n'utilise un orgId envoyé par le client**

Toutes les routes obtiennent l'orgId depuis :
- `getCurrentOrgId()` : Extrait depuis la session utilisateur
- `getRequiredDefaultOrgId()` : Extrait depuis la configuration serveur

**Routes avec vérification explicite** : 5 / 15 routes (33%)
- Routes clients : ✅ Vérification explicite
- Routes settings : ✅ Vérification explicite
- Routes templates : ❌ Pas de vérification explicite
- Routes offres : ❌ Pas de vérification explicite
- Routes auth : ❌ Pas de vérification explicite (mais orgId vient de config serveur)

**Risque résiduel** : Faible. Même sans vérification explicite, les routes n'utilisent pas l'orgId du body car elles utilisent systématiquement `getCurrentOrgId()` ou `getRequiredDefaultOrgId()`. Cependant, une vérification explicite renforcerait la sécurité et la clarté du code.

---

**Fin de l'audit**

