# 🔒 Audit Routes API - Résumé Exécutif

**Date**: 2024-12-19

---

## 📊 RÉSUMÉ (3-6 lignes)

⚠️ **Plusieurs routes critiques manquent de protection explicite**. Les routes admin-only (`clients`, `templates` POST, `admin-allowed-emails`) sont bien protégées avec `requireAdmin()`. Cependant, les routes `offers` (POST, PATCH) et certaines routes legacy manquent de vérification explicite de session ou admin. **Actions requises** : Ajouter `requireSession()` au minimum pour toutes les routes d'écriture critiques, et `requireAdmin()` pour les actions sensibles (changement de statut d'offre, modification de templates legacy).

---

## 📋 TABLEAU RÉCAPITULATIF

| Route | Méthode | Guard | Critique ? | État | Priorité |
|-------|---------|-------|-----------|------|-----------|
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

---

## 🔧 CORRECTIONS REQUISES EN PRIORITÉ

### 🔴 Priorité HAUTE

#### 1. `POST /api/offers` - Ajouter `requireSession()`
**Fichier**: `src/app/api/offers/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ AJOUTER
    const orgId = await getCurrentOrgId();
    // ...
  }
}
```

#### 2. `PATCH /api/offers/[id]` - Ajouter `requireSession()` + `requireAdmin()` pour changement de statut
**Fichier**: `src/app/api/offers/[id]/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';
import { requireAdmin } from '@/lib/auth/permissions';

export async function PATCH(...) {
  try {
    await requireSession(); // ✅ AJOUTER
    // ...
    if (body.status !== undefined) {
      await requireAdmin(); // ✅ AJOUTER pour changement de statut
      updateData.status = body.status;
    }
    // ...
  }
}
```

### 🟡 Priorité MOYENNE

#### 3. `PATCH /api/templates/[id]` - Ajouter `requireAdmin()`
**Fichier**: `src/app/api/templates/[id]/route.ts`

```typescript
import { requireAdmin } from '@/lib/auth/permissions';

export async function PATCH(...) {
  try {
    await requireAdmin(); // ✅ AJOUTER
    // ...
  }
}
```

#### 4. `POST /api/pdf/generate` - Ajouter `requireSession()`
**Fichier**: `src/app/api/pdf/generate/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    await requireSession(); // ✅ AJOUTER
    // ...
  }
}
```

#### 5. `PATCH /api/offres/[id]` - Ajouter `requireSession()`
**Fichier**: `src/app/api/offres/[id]/route.ts`

```typescript
import { requireSession } from '@/lib/auth/session';

export async function PATCH(...) {
  try {
    await requireSession(); // ✅ AJOUTER
    // ...
  }
}
```

---

## 🧪 DOUBLE CHECK - Ressource `offers`

### Routes API `offers`

| Route | Méthode | Guard Actuel | Guard Requis | État |
|-------|---------|--------------|--------------|------|
| `/api/offers` | POST | ❌ Aucun | ✅ `requireSession()` | ❌ **À corriger** |
| `/api/offers/[id]` | PATCH | ❌ Aucun | ✅ `requireSession()` + `requireAdmin()` pour statut | ❌ **À corriger** |
| `/api/offres` | POST | ❌ Aucun | ✅ `requireSession()` (via proxy) | ❌ **À corriger** |
| `/api/offres/[id]` | PATCH | ❌ Aucun | ✅ `requireSession()` | ❌ **À corriger** |

### Alignement UI

- ✅ Pages protégées par middleware
- ✅ Composants appellent les routes après authentification
- ⚠️ Mais les routes API devraient quand même vérifier la session pour défense en profondeur

---

## 📝 RÉSUMÉ DES ACTIONS

### Routes bien protégées ✅
- `/api/clients` (POST, PATCH, DELETE) - `requireAdmin()`
- `/api/templates` (POST) - `requireAdmin()`
- `/api/settings/admin-allowed-emails` (POST, DELETE) - `requireAdmin()`

### Routes à corriger ❌
1. 🔴 `/api/offers` POST - Ajouter `requireSession()`
2. 🔴 `/api/offers/[id]` PATCH - Ajouter `requireSession()` + `requireAdmin()` pour statut
3. 🟡 `/api/templates/[id]` PATCH - Ajouter `requireAdmin()`
4. 🟡 `/api/pdf/generate` POST - Ajouter `requireSession()`
5. 🟡 `/api/offres/[id]` PATCH - Ajouter `requireSession()`

---

## 🎯 CONCLUSION

**État global**: ⚠️ **Plusieurs routes critiques manquent de protection explicite**

**Recommandation**: Ajouter `requireSession()` au minimum pour toutes les routes d'écriture critiques, et `requireAdmin()` pour les actions sensibles (changement de statut, modification de templates).

**Priorité**: Commencer par les routes `offers` (priorité haute) car elles manipulent des données métier critiques.

