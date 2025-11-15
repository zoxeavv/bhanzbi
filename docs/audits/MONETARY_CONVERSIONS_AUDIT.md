# 💰 Audit des Conversions Monétaires DB ↔ TypeScript

**Date**: 2024-12-19  
**Objectif**: Vérifier la cohérence et la symétrie des conversions entre DB (NUMERIC/DECIMAL) et TypeScript (number, centimes).

---

## 📊 RÉSUMÉ

**État global**: ❌ **ASYMÉTRIE CRITIQUE DÉTECTÉE**

- ✅ **TS → DB**: Conversions correctes (division par 100 pour centimes → euros)
- ❌ **DB → TS**: Conversions manquantes (pas de multiplication par 100 pour euros → centimes)
- ⚠️ **Impact**: Les valeurs retournées depuis la DB sont 100x trop petites (ex: 123.45€ au lieu de 12345 centimes)

---

## 1️⃣ DÉTECTION DES COLONNES MONÉTAIRES

### Table `offers`

| Colonne | Type DB | Type TS | Unité TS | Unité DB | Commentaire |
|---------|---------|---------|----------|----------|-------------|
| `subtotal` | `NUMERIC(10,2)` | `number` | **Centimes** | **Euros** | Montant en centimes en TS, euros en DB |
| `tax_rate` | `NUMERIC(5,2)` | `number` | **Pourcentage** | **Pourcentage** | Pas de conversion nécessaire |
| `tax_amount` | `NUMERIC(10,2)` | `number` | **Centimes** | **Euros** | Montant en centimes en TS, euros en DB |
| `total` | `NUMERIC(10,2)` | `number` | **Centimes** | **Euros** | Montant en centimes en TS, euros en DB |

### Table `offers.items` (JSONB)

| Champ | Type TS | Unité TS | Commentaire |
|-------|---------|----------|-------------|
| `unit_price` | `number` | **Centimes** | Prix unitaire en centimes |
| `total` | `number` | **Centimes** | Total de la ligne en centimes |

**Note**: Les champs dans `items` (JSONB) ne sont pas convertis car ils restent en JSON, mais ils doivent être cohérents avec les autres valeurs monétaires.

---

## 2️⃣ ANALYSE DES CONVERSIONS

### ✅ Conversions TS → DB (Écriture)

#### `createOffer()` - Ligne 70-73
```typescript
subtotal: (data.subtotal / 100).toFixed(2),      // ✅ Centimes → Euros
tax_rate: data.tax_rate.toFixed(2),               // ✅ Pourcentage (pas de conversion)
tax_amount: (data.tax_amount / 100).toFixed(2),   // ✅ Centimes → Euros
total: (data.total / 100).toFixed(2),            // ✅ Centimes → Euros
```

**État**: ✅ **CORRECT** - Division par 100 pour convertir centimes → euros

#### `updateOffer()` - Ligne 95-98
```typescript
if (data.subtotal !== undefined) updateData.subtotal = (data.subtotal / 100).toFixed(2);
if (data.tax_rate !== undefined) updateData.tax_rate = data.tax_rate.toFixed(2);
if (data.tax_amount !== undefined) updateData.tax_amount = (data.tax_amount / 100).toFixed(2);
if (data.total !== undefined) updateData.total = (data.total / 100).toFixed(2);
```

**État**: ✅ **CORRECT** - Division par 100 pour convertir centimes → euros

---

### ❌ Conversions DB → TS (Lecture)

#### `mapOfferRow()` - Ligne 20-23
```typescript
subtotal: Math.round(normalizeNumber(row.subtotal)),      // ❌ MANQUE × 100
tax_rate: normalizeNumber(row.tax_rate),                  // ✅ Correct (pourcentage)
tax_amount: Math.round(normalizeNumber(row.tax_amount)), // ❌ MANQUE × 100
total: Math.round(normalizeNumber(row.total)),           // ❌ MANQUE × 100
```

**État**: ❌ **INCORRECT** - Pas de multiplication par 100 pour convertir euros → centimes

**Problème**: Les valeurs retournées sont en euros au lieu de centimes, ce qui cause une incohérence avec le reste de l'application qui s'attend à recevoir des centimes.

---

## 3️⃣ ASYMÉTRIES DÉTECTÉES

### ❌ ASYMÉTRIE CRITIQUE : `subtotal`, `tax_amount`, `total`

**Problème**:
- **Écriture (TS → DB)**: Division par 100 ✅
- **Lecture (DB → TS)**: Pas de multiplication par 100 ❌

**Impact**:
- Les valeurs retournées depuis la DB sont 100x trop petites
- Exemple: DB stocke `123.45` (euros), TS reçoit `123` (au lieu de `12345` centimes)
- Le frontend divise par 100 pour afficher, donc affiche `1.23€` au lieu de `123.45€`

**Fonctions affectées**:
- `listOffers()` → utilise `mapOfferRow()`
- `getOfferById()` → utilise `mapOfferRow()`
- `listOffersByClient()` → utilise `mapOfferRow()`
- `getRecentOffers()` → utilise `mapOfferRow()`
- `updateOffer()` → retourne via `mapOfferRow()`
- `createOffer()` → retourne via `mapOfferRow()`

---

## 🧪 DOUBLE CHECK - Exemple Concret

### Scénario: `total = 12345 centimes` (123.45€)

#### 1. TS → DB (Écriture)
```typescript
// Input TS
const offerData = {
  subtotal: 10000,    // 100.00€ en centimes
  tax_rate: 20,        // 20%
  tax_amount: 2000,    // 20.00€ en centimes
  total: 12000         // 120.00€ en centimes
};

// Conversion dans createOffer()
subtotal: (10000 / 100).toFixed(2)    // → "100.00" ✅
tax_rate: (20).toFixed(2)             // → "20.00" ✅
tax_amount: (2000 / 100).toFixed(2)   // → "20.00" ✅
total: (12000 / 100).toFixed(2)       // → "120.00" ✅

// Valeur stockée en DB
// subtotal = "100.00" (NUMERIC)
// tax_rate = "20.00" (NUMERIC)
// tax_amount = "20.00" (NUMERIC)
// total = "120.00" (NUMERIC)
```

#### 2. DB → TS (Lecture)
```typescript
// Valeur lue depuis DB
row.subtotal = "100.00"    // string depuis NUMERIC
row.tax_rate = "20.00"     // string depuis NUMERIC
row.tax_amount = "20.00"   // string depuis NUMERIC
row.total = "120.00"       // string depuis NUMERIC

// Conversion actuelle dans mapOfferRow() (INCORRECTE)
subtotal: Math.round(normalizeNumber("100.00"))    // → 100 ❌ (devrait être 10000)
tax_rate: normalizeNumber("20.00")                 // → 20 ✅
tax_amount: Math.round(normalizeNumber("20.00"))   // → 20 ❌ (devrait être 2000)
total: Math.round(normalizeNumber("120.00"))       // → 120 ❌ (devrait être 12000)

// Valeur retournée à l'application
// subtotal = 100 (au lieu de 10000)
// tax_amount = 20 (au lieu de 2000)
// total = 120 (au lieu de 12000)
```

#### 3. Impact sur le Frontend
```typescript
// Frontend reçoit total = 120 (au lieu de 12000)
// Frontend divise par 100 pour afficher
const displayValue = 120 / 100;  // → 1.20€ ❌ (devrait être 120.00€)
```

---

## 📋 LISTE DES CONVERSIONS

### ✅ Conversions OK

| Champ | TS → DB | DB → TS | État |
|-------|---------|---------|------|
| `tax_rate` | ✅ `toFixed(2)` | ✅ `normalizeNumber()` | ✅ **Correct** |

### ❌ Conversions à Corriger

| Champ | TS → DB | DB → TS | État | Fix Requis |
|-------|---------|---------|------|------------|
| `subtotal` | ✅ `/100` | ❌ Pas de `×100` | ❌ **Asymétrique** | Multiplier par 100 |
| `tax_amount` | ✅ `/100` | ❌ Pas de `×100` | ❌ **Asymétrique** | Multiplier par 100 |
| `total` | ✅ `/100` | ❌ Pas de `×100` | ❌ **Asymétrique** | Multiplier par 100 |

---

## 🔧 CORRECTIONS REQUISES

### Fix 1: Corriger `mapOfferRow()` dans `src/lib/db/queries/offers.ts`

**Fichier**: `src/lib/db/queries/offers.ts`  
**Ligne**: 13-28

**Code actuel (INCORRECT)**:
```typescript
function mapOfferRow(row: typeof offers.$inferSelect): Offer {
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal)),      // ❌ MANQUE × 100
    tax_rate: normalizeNumber(row.tax_rate),                  // ✅ Correct
    tax_amount: Math.round(normalizeNumber(row.tax_amount)), // ❌ MANQUE × 100
    total: Math.round(normalizeNumber(row.total)),           // ❌ MANQUE × 100
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
```

**Code corrigé**:
```typescript
function mapOfferRow(row: typeof offers.$inferSelect): Offer {
  return {
    id: row.id,
    client_id: row.client_id,
    template_id: row.template_id ?? null,
    title: normalizeString(row.title),
    items: normalizeArray(row.items),
    subtotal: Math.round(normalizeNumber(row.subtotal) * 100),      // ✅ Multiplier par 100
    tax_rate: normalizeNumber(row.tax_rate),                         // ✅ Correct (pas de conversion)
    tax_amount: Math.round(normalizeNumber(row.tax_amount) * 100),  // ✅ Multiplier par 100
    total: Math.round(normalizeNumber(row.total) * 100),              // ✅ Multiplier par 100
    status: row.status as 'draft' | 'sent' | 'accepted' | 'rejected',
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
```

**Explication**:
- `normalizeNumber(row.subtotal)` convertit la string "100.00" en number `100.00`
- Multiplier par 100 convertit `100.00` euros → `10000` centimes
- `Math.round()` garantit un entier (centimes)

---

## 🧪 VÉRIFICATION POST-CORRECTION

### Scénario: `total = 12345 centimes` (123.45€)

#### 1. TS → DB (Écriture)
```typescript
// Input TS
total: 12345  // centimes

// Conversion
total: (12345 / 100).toFixed(2)  // → "123.45"

// DB stocke
total = "123.45"  // NUMERIC(10,2)
```

#### 2. DB → TS (Lecture) - APRÈS CORRECTION
```typescript
// DB retourne
row.total = "123.45"  // string depuis NUMERIC

// Conversion corrigée
total: Math.round(normalizeNumber("123.45") * 100)
     = Math.round(123.45 * 100)
     = Math.round(12345)
     = 12345  // ✅ Retourne bien 12345 centimes
```

#### 3. Vérification de symétrie
```
TS: 12345 centimes
  ↓ (÷100)
DB: 123.45 euros
  ↓ (×100)
TS: 12345 centimes  ✅ SYMÉTRIQUE
```

---

## 📝 RÉSUMÉ DES ACTIONS

### ✅ Conversions OK
- `tax_rate`: Pas de conversion nécessaire (pourcentage dans les deux sens)

### ❌ Conversions à Corriger
1. **`subtotal`**: Ajouter `× 100` dans `mapOfferRow()`
2. **`tax_amount`**: Ajouter `× 100` dans `mapOfferRow()`
3. **`total`**: Ajouter `× 100` dans `mapOfferRow()`

### Impact
- **Fonctions affectées**: Toutes les fonctions qui utilisent `mapOfferRow()`
- **Priorité**: 🔴 **HAUTE** - Bug critique qui cause des valeurs incorrectes dans toute l'application

---

## 🎯 CONCLUSION

**Problème identifié**: Asymétrie critique dans les conversions monétaires. Les valeurs écrites en DB sont correctes (centimes → euros), mais les valeurs lues depuis la DB ne sont pas reconverties (euros → centimes), causant des valeurs 100x trop petites.

**Solution**: Ajouter la multiplication par 100 dans `mapOfferRow()` pour `subtotal`, `tax_amount`, et `total`.

**Impact**: Une fois corrigé, toutes les valeurs monétaires seront cohérentes et symétriques entre TS et DB.

