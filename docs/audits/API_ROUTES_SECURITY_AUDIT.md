# 🔒 Audit de Sécurité des Routes API d'Écriture

**Date**: 2024-12-19  
**Objectif**: Vérifier que toutes les routes API d'écriture critiques sont correctement protégées avec `requireAdmin()` ou au moins `requireSession()`.

---

## 📊 RÉSUMÉ

**État global**: ⚠️ **Plusieurs routes critiques manquent de protection**

- ✅ Routes admin-only (`clients`, `templates`, `admin-allowed-emails`) : Bien protégées avec `requireAdmin()`
- ❌ Routes `offers` : Manquent `requireSession()` ou `requireAdmin()` selon le contexte
- ❌ Routes legacy `/api/offres` : Manquent de protection
- ⚠️ Routes templates legacy : Manquent `requireAdmin()` pour PATCH

---

## 1️⃣ INVENTAIRE DES ROUTES D'ÉCRITURE

### Routes POST/PATCH/PUT/DELETE identifiées

| Route | Méthode | Ressource | Guard Actuel | Critique ? | État |
|-------|---------|-----------|--------------|------------|------|
| `/api/clients` | POST | Clients | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/clients/[id]` | PATCH | Clients | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/clients/[id]` | DELETE | Clients | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/offers` | POST | Offers | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** |
| `/api/offers/[id]` | PATCH | Offers | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** |
| `/api/offres` | POST | Offers (legacy) | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** |
| `/api/offres/[id]` | PATCH | Offers (legacy) | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** |
| `/api/templates` | POST | Templates | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/templates/[id]` | PATCH | Templates | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** |
| `/api/settings/admin-allowed-emails` | POST | Admin allowlist | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/settings/admin-allowed-emails` | DELETE | Admin allowlist | ✅ `requireAdmin()` | ✅ OUI | ✅ OK |
| `/api/pdf/generate` | POST | PDF generation | ❌ **Aucun** | ⚠️ MOYEN | ⚠️ **À vérifier** |
| `/api/offres/[id]/versions` | POST | Versions | ❌ **Aucun** | ⚠️ MOYEN | ⚠️ **À vérifier** |
| `/api/auth/register` | POST | Auth | ⚠️ **Public** | ⚠️ SPÉCIAL | ✅ OK (public intentionnel) |
| `/api/auth/webhook/user-created` | POST | Auth webhook | ⚠️ **Secret header** | ⚠️ SPÉCIAL | ✅ OK (webhook) |

---

## 2️⃣ CLASSIFICATION DES ROUTES CRITIQUES

### Routes CRITIQUES (créent/modifient/suppriment des données métier)

#### ✅ Routes bien protégées

1. **`POST /api/clients`** - Crée un client
   - Guard: ✅ `requireAdmin()`
   - Justification: Création de données métier → Admin uniquement

2. **`PATCH /api/clients/[id]`** - Modifie un client
   - Guard: ✅ `requireAdmin()`
   - Justification: Modification de données métier → Admin uniquement

3. **`DELETE /api/clients/[id]`** - Supprime un client
   - Guard: ✅ `requireAdmin()`
   - Justification: Suppression de données métier → Admin uniquement

4. **`POST /api/templates`** - Crée un template
   - Guard: ✅ `requireAdmin()`
   - Justification: Création de templates → Admin uniquement

5. **`POST /api/settings/admin-allowed-emails`** - Ajoute un email admin
   - Guard: ✅ `requireAdmin()`
   - Justification: Gestion des permissions admin → Admin uniquement

6. **`DELETE /api/settings/admin-allowed-emails`** - Supprime un email admin
   - Guard: ✅ `requireAdmin()`
   - Justification: Gestion des permissions admin → Admin uniquement

#### ❌ Routes à corriger

1. **`POST /api/offers`** - Crée une offre
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()` qui throw si pas de session)
   - Problème: Pas de vérification explicite de session
   - Fix suggéré: Ajouter `requireSession()` au minimum

2. **`PATCH /api/offers/[id]`** - Modifie une offre (peut changer le statut)
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()` qui throw si pas de session)
   - Problème: Permet de modifier le statut sans vérification explicite
   - Fix suggéré: Ajouter `requireSession()` au minimum, ou `requireAdmin()` si changement de statut doit être admin-only

3. **`POST /api/offres`** - Crée une offre (legacy)
   - Guard: ❌ **Aucun** (proxy vers `/api/offers`)
   - Problème: Même problème que `/api/offers`
   - Fix suggéré: Ajouter `requireSession()` dans le proxy ou corriger la route principale

4. **`PATCH /api/offres/[id]`** - Modifie une offre (legacy)
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()`)
   - Problème: Même problème que `/api/offers/[id]`
   - Fix suggéré: Ajouter `requireSession()` au minimum

5. **`PATCH /api/templates/[id]`** - Modifie un template (legacy)
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()`)
   - Problème: Modification de templates devrait être admin-only
   - Fix suggéré: Ajouter `requireAdmin()`

#### ⚠️ Routes à vérifier

1. **`POST /api/pdf/generate`** - Génère un PDF et change le statut à "sent"
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()`)
   - Problème: Change le statut de l'offre à "sent" sans vérification
   - Fix suggéré: Ajouter `requireSession()` au minimum

2. **`POST /api/offres/[id]/versions`** - Crée une version d'offre
   - Guard: ❌ **Aucun** (seulement `getCurrentOrgId()`)
   - Problème: Création de données sans vérification explicite
   - Fix suggéré: Ajouter `requireSession()` au minimum

---

## 3️⃣ VÉRIFICATION DÉTAILLÉE PAR ROUTE

### ❌ Routes à corriger en priorité

#### 1. `POST /api/offers` - Crée une offre

**Fichier**: `src/app/api/offers/route.ts`  
**Ligne**: 56-126

**Code actuel**:
```typescript
export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireSession() explicite
    // ...
  }
}
```

**Problème**: `getCurrentOrgId()` appelle `requireSession()` en interne, mais ce n'est pas explicite. Si `requireSession()` change, la route pourrait devenir vulnérable.

**Fix suggéré**:
```typescript
export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ Vérification explicite
    const orgId = await getCurrentOrgId();
    // ...
  }
}
```

**Priorité**: 🔴 **HAUTE** - Route critique qui crée des données métier

---

#### 2. `PATCH /api/offers/[id]` - Modifie une offre

**Fichier**: `src/app/api/offers/[id]/route.ts`  
**Ligne**: 60-136

**Code actuel**:
```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireSession() explicite
    // ...
    if (body.status !== undefined) {
      updateData.status = body.status; // ⚠️ Permet de changer le statut sans vérification
    }
    // ...
  }
}
```

**Problème**: 
- Pas de vérification explicite de session
- Permet de changer le statut sans vérification admin

**Fix suggéré**:
```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); // ✅ Vérification explicite
    const { id } = await params;
    const orgId = await getCurrentOrgId();
    const body = await request.json();
    
    // Si changement de statut, vérifier les permissions admin
    if (body.status !== undefined) {
      await requireAdmin(); // ✅ Vérification admin pour changement de statut
    }
    // ...
  }
}
```

**Priorité**: 🔴 **HAUTE** - Route critique qui modifie des données métier et peut changer le statut

---

#### 3. `PATCH /api/templates/[id]` - Modifie un template (legacy)

**Fichier**: `src/app/api/templates/[id]/route.ts`  
**Ligne**: 69-125

**Code actuel**:
```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession(); // ⚠️ Pas de vérification d'erreur
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireAdmin()
    // ...
  }
}
```

**Problème**: 
- Route legacy mais toujours accessible
- Modification de templates devrait être admin-only
- `getSession()` ne throw pas si pas de session, donc pas de protection

**Fix suggéré**:
```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); // ✅ Vérification admin pour modification de templates
    const orgId = await getCurrentOrgId();
    // ...
  }
}
```

**Priorité**: 🟡 **MOYENNE** - Route legacy mais toujours accessible

---

#### 4. `POST /api/offres` - Crée une offre (legacy)

**Fichier**: `src/app/api/offres/route.ts`  
**Ligne**: 41-46

**Code actuel**:
```typescript
export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(request);
  if (rateLimitError) return rateLimitError;
  
  return postOffer(request); // ❌ Proxy vers route non protégée
}
```

**Problème**: Proxy vers `/api/offers` qui n'a pas de protection explicite

**Fix suggéré**: Corriger la route principale `/api/offers` (voir fix #1)

**Priorité**: 🟡 **MOYENNE** - Route legacy, mais devrait être corrigée

---

#### 5. `PATCH /api/offres/[id]` - Modifie une offre (legacy)

**Fichier**: `src/app/api/offres/[id]/route.ts`  
**Ligne**: 29-58

**Code actuel**:
```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireSession() explicite
    // ...
  }
}
```

**Problème**: Même problème que `/api/offers/[id]`

**Fix suggéré**: Même fix que `/api/offers/[id]` (voir fix #2)

**Priorité**: 🟡 **MOYENNE** - Route legacy, mais devrait être corrigée

---

#### 6. `POST /api/pdf/generate` - Génère un PDF et change le statut

**Fichier**: `src/app/api/pdf/generate/route.ts`  
**Ligne**: 8-60

**Code actuel**:
```typescript
export async function POST(request: Request) {
  try {
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireSession() explicite
    // ...
    await updateOffer(offreId, orgId, { status: "sent" }); // ⚠️ Change le statut sans vérification
    // ...
  }
}
```

**Problème**: Change le statut de l'offre à "sent" sans vérification

**Fix suggéré**:
```typescript
export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ Vérification explicite
    const orgId = await getCurrentOrgId();
    // ...
  }
}
```

**Priorité**: 🟡 **MOYENNE** - Change le statut mais c'est une action métier normale

---

#### 7. `POST /api/offres/[id]/versions` - Crée une version

**Fichier**: `src/app/api/offres/[id]/versions/route.ts`  
**Ligne**: 28-61

**Code actuel**:
```typescript
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const orgId = await getCurrentOrgId(); // ❌ Pas de requireSession() explicite
    // ...
  }
}
```

**Problème**: Création de données sans vérification explicite

**Fix suggéré**:
```typescript
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); // ✅ Vérification explicite
    const orgId = await getCurrentOrgId();
    // ...
  }
}
```

**Priorité**: 🟢 **BASSE** - Route TODO, pas encore migrée vers Drizzle

---

## 🧪 DOUBLE CHECK - Ressource `offers`

### Routes API `offers`

| Route | Méthode | Guard | État |
|-------|---------|-------|------|
| `/api/offers` | GET | ✅ `getCurrentOrgId()` (implicite) | ✅ OK (lecture) |
| `/api/offers` | POST | ❌ **Aucun explicite** | ❌ **À corriger** |
| `/api/offers/[id]` | GET | ✅ `getCurrentOrgId()` (implicite) | ✅ OK (lecture) |
| `/api/offers/[id]` | PATCH | ❌ **Aucun explicite** | ❌ **À corriger** |
| `/api/offres` | GET | ✅ Proxy vers `/api/offers` | ✅ OK (lecture) |
| `/api/offres` | POST | ❌ Proxy vers route non protégée | ❌ **À corriger** |
| `/api/offres/[id]` | GET | ✅ `getCurrentOrgId()` (implicite) | ✅ OK (lecture) |
| `/api/offres/[id]` | PATCH | ❌ **Aucun explicite** | ❌ **À corriger** |

### Pages / Server Components

- ✅ Pages protégées par middleware (vérification de session)
- ✅ Pas d'accès direct aux routes API depuis les pages sans authentification

### Composants client

- ✅ Les composants appellent les routes API après authentification
- ⚠️ Mais les routes API devraient quand même vérifier la session pour défense en profondeur

### Routes legacy

- ⚠️ Routes `/api/offres` et `/api/templates/[id]` sont marquées comme legacy mais toujours accessibles
- ⚠️ Devraient être protégées même si legacy

---

## 📋 TABLEAU RÉCAPITULATIF

| Route | Méthode | Guard | Critique ? | État | Priorité Fix |
|-------|---------|-------|------------|------|--------------|
| `/api/clients` | POST | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/clients/[id]` | PATCH | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/clients/[id]` | DELETE | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/offers` | POST | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** | 🔴 HAUTE |
| `/api/offers/[id]` | PATCH | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** | 🔴 HAUTE |
| `/api/offres` | POST | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** | 🟡 MOYENNE |
| `/api/offres/[id]` | PATCH | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** | 🟡 MOYENNE |
| `/api/templates` | POST | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/templates/[id]` | PATCH | ❌ **Aucun** | ✅ OUI | ❌ **À corriger** | 🟡 MOYENNE |
| `/api/settings/admin-allowed-emails` | POST | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/settings/admin-allowed-emails` | DELETE | ✅ `requireAdmin()` | ✅ OUI | ✅ OK | - |
| `/api/pdf/generate` | POST | ❌ **Aucun** | ⚠️ MOYEN | ⚠️ **À vérifier** | 🟡 MOYENNE |
| `/api/offres/[id]/versions` | POST | ❌ **Aucun** | ⚠️ MOYEN | ⚠️ **À vérifier** | 🟢 BASSE |

---

## 🔧 CORRECTIONS REQUISES

### Fix 1: Ajouter `requireSession()` à `POST /api/offers`

**Fichier**: `src/app/api/offers/route.ts`

```typescript
export async function POST(request: Request) {
  // Rate limiting
  const rateLimitResult = await limitRequest(request, 'offers');
  if (!rateLimitResult.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  try {
    await requireSession(); // ✅ AJOUTER CETTE LIGNE
    const orgId = await getCurrentOrgId();
    // ... reste du code
  }
}
```

---

### Fix 2: Ajouter `requireSession()` et vérifier admin pour changement de statut dans `PATCH /api/offers/[id]`

**Fichier**: `src/app/api/offers/[id]/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/permissions';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); // ✅ AJOUTER CETTE LIGNE
    const { id } = await params;
    const orgId = await getCurrentOrgId();
    const body = await request.json();

    // Vérifier que l'offre existe
    await getOfferById(id, orgId);

    // Préparer les données de mise à jour
    const updateData: { ... } = {};

    // ... autres champs ...

    if (body.status !== undefined) {
      await requireAdmin(); // ✅ AJOUTER CETTE LIGNE pour changement de statut
      updateData.status = body.status;
    }

    const updatedOffer = await updateOffer(id, orgId, updateData);
    return NextResponse.json(updatedOffer);
  }
}
```

---

### Fix 3: Ajouter `requireAdmin()` à `PATCH /api/templates/[id]`

**Fichier**: `src/app/api/templates/[id]/route.ts`

```typescript
import { requireAdmin } from '@/lib/auth/permissions';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); // ✅ AJOUTER CETTE LIGNE
    const orgId = await getCurrentOrgId();
    // ... reste du code
  }
}
```

---

### Fix 4: Ajouter `requireSession()` à `POST /api/pdf/generate`

**Fichier**: `src/app/api/pdf/generate/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ AJOUTER CETTE LIGNE
    const orgId = await getCurrentOrgId();
    // ... reste du code
  }
}
```

---

### Fix 5: Ajouter `requireSession()` à `PATCH /api/offres/[id]`

**Fichier**: `src/app/api/offres/[id]/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); // ✅ AJOUTER CETTE LIGNE
    const orgId = await getCurrentOrgId();
    // ... reste du code
  }
}
```

---

### Fix 6: Ajouter `requireSession()` à `POST /api/offres/[id]/versions`

**Fichier**: `src/app/api/offres/[id]/versions/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession(); // ✅ AJOUTER CETTE LIGNE
    const orgId = await getCurrentOrgId();
    // ... reste du code
  }
}
```

---

## 📝 RÉSUMÉ DES ACTIONS

### Routes à corriger en priorité HAUTE

1. ✅ **`POST /api/offers`** - Ajouter `requireSession()`
2. ✅ **`PATCH /api/offers/[id]`** - Ajouter `requireSession()` + `requireAdmin()` pour changement de statut

### Routes à corriger en priorité MOYENNE

3. ✅ **`PATCH /api/templates/[id]`** - Ajouter `requireAdmin()`
4. ✅ **`POST /api/pdf/generate`** - Ajouter `requireSession()`
5. ✅ **`PATCH /api/offres/[id]`** - Ajouter `requireSession()`

### Routes à corriger en priorité BASSE

6. ✅ **`POST /api/offres/[id]/versions`** - Ajouter `requireSession()` (route TODO)

---

## 🎯 CONCLUSION

**État global**: ⚠️ **Plusieurs routes critiques manquent de protection explicite**

**Routes bien protégées**: Routes admin-only (`clients`, `templates` POST, `admin-allowed-emails`)

**Routes à corriger**: Routes `offers` et routes legacy qui manquent de vérification explicite de session ou admin.

**Recommandation**: Ajouter `requireSession()` au minimum pour toutes les routes d'écriture, et `requireAdmin()` pour les actions sensibles (changement de statut, modification de templates).

