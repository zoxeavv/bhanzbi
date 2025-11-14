# 🔍 Audit de Validation - Dashboard

**Date** : 2024-12-19  
**Type** : Validation fonctionnelle (pas de refactor)  
**Objectif** : Vérifier la cohérence Backend/API/UI et identifier les risques de crash

---

## 📊 Résultats par Couche

### ✅ Backend (Queries) : **OK**

**Fichiers analysés :**
- `src/lib/db/queries/clients.ts`
- `src/lib/db/queries/templates.ts`
- `src/lib/db/queries/offers.ts`

**Points vérifiés :**
- ✅ Toutes les fonctions vérifient `orgId` avec `if (!orgId) throw new Error('orgId is required')`
- ✅ `countClients`, `countTemplates`, `countOffers` retournent bien `Promise<number>`
- ✅ `getRecentOffers` retourne bien `Promise<Offer[]>` avec `total` et `created_at`
- ✅ Formatage cohérent avec les autres queries (normalizeNumber, normalizeString)
- ✅ Gestion des valeurs nulles avec `?? 0` pour les counts

**Verdict :** Backend solide, aucune anomalie détectée.

---

### ⚠️ API Summary : **PAS OK** (2 problèmes)

**Fichier analysé :** `src/app/api/dashboard/summary/route.ts`

#### Problème 1 : Risque de crash si `recentOffers` est undefined/null
**Ligne ~27** : `recentOffers.map(async (offer) => {`
- **Problème** : Si `getRecentOffers` retourne `undefined` ou `null` (peu probable mais possible), `.map()` va crasher
- **Suggestion** : Ajouter `const recentOffers = recentOffers ?? []` avant le map

#### Problème 2 : Pas de vérification des valeurs retournées
**Lignes ~19-24** : Les résultats de `Promise.all()` ne sont pas vérifiés
- **Problème** : Si une fonction retourne `undefined`, les counts seront `undefined` et la page va afficher "undefined"
- **Suggestion** : Ajouter des valeurs par défaut : `const clientsCount = clientsCount ?? 0`

**Points positifs :**
- ✅ Utilise `getCurrentOrgId()` qui garantit l'orgId (throw si manquant)
- ✅ Gestion d'erreur pour les clients supprimés (try/catch ligne ~29)
- ✅ Retourne bien `total` et `created_at` comme attendu par l'UI
- ✅ Gestion d'erreur HTTP appropriée (401, 500)

**Verdict :** API fonctionnelle mais fragile face aux cas limites.

---

### ❌ UI Dashboard : **PAS OK** (4 problèmes critiques)

**Fichier analysé :** `src/app/dashboard/page.tsx`

#### Problème 1 : Typage faible avec `any`
**Ligne 23** : `data.recentOffers.map((offer: any) => ({`
- **Problème** : Utilisation de `any` masque les erreurs de typage
- **Suggestion** : Créer une interface `DashboardSummaryResponse` et typer `data`

#### Problème 2 : Pas de vérification avant `.map()`
**Ligne 23** : `data.recentOffers.map(...)`
- **Problème** : Si `data.recentOffers` est `undefined` ou `null`, crash immédiat
- **Suggestion** : `const recentOffers = (data.recentOffers ?? []).map(...)`

#### Problème 3 : Pas de vérification des counts
**Lignes 42, 47, 52** : `value={data.clientsCount}`, `value={data.templatesCount}`, `value={data.offersCount}`
- **Problème** : Si un count est `undefined`, StatsCard affichera "undefined"
- **Suggestion** : `value={data.clientsCount ?? 0}`

#### Problème 4 : Pas de gestion d'erreur
**Ligne 20** : `const data = await getDashboardData();`
- **Problème** : Si l'API échoue (500, réseau, etc.), la page va crasher avec une erreur non gérée
- **Suggestion** : Ajouter un try/catch avec affichage d'erreur ou redirection

**Points positifs :**
- ✅ `RecentOffersList` gère bien le cas `offers.length === 0` (ligne 44)
- ✅ Structure Server Component correcte
- ✅ Layout responsive avec grille

**Verdict :** UI fragile, plusieurs cas de crash possibles.

---

### ✅ Sécurité Multi-tenant : **OK**

**Points vérifiés :**
- ✅ API utilise `getCurrentOrgId()` qui throw si pas de session ou pas d'orgId
- ✅ Toutes les queries vérifient `orgId` avec assertions
- ✅ Filtrage systématique par `org_id` dans toutes les queries
- ✅ Protection IDOR : même avec un ID d'un autre org, les queries retournent "not found"

**Verdict :** Sécurité multi-tenant solide, isolation garantie.

---

## 🔗 Cohérence Backend/API/UI

### ✅ Cohérence des données
- ✅ API retourne `total` et `created_at` comme attendu par `RecentOffersList`
- ✅ Les counts sont bien passés aux `StatsCard`
- ✅ Format des données cohérent entre les couches

### ⚠️ Typage
- ❌ Pas de type partagé entre API et UI
- ❌ Utilisation de `any` dans la page dashboard
- **Suggestion** : Créer un type `DashboardSummaryResponse` partagé

---

## 🚨 Cas de Crash Identifiés

### Crash garanti :
1. **Si l'API retourne une erreur** → Page crash (pas de try/catch)
2. **Si `data.recentOffers` est `undefined`** → Crash sur `.map()`
3. **Si `data.recentOffers` est `null`** → Crash sur `.map()`

### Affichage incorrect (pas de crash mais UX dégradée) :
1. **Si un count est `undefined`** → Affiche "undefined" dans StatsCard
2. **Si `recentOffers` est un array vide** → OK, géré par `RecentOffersList`

### Cas edge non gérés :
1. **Org sans données** → Devrait fonctionner (counts à 0, liste vide)
2. **Offre avec `total` null** → `formatTotal` va afficher "NaN €" ou crasher
3. **Offre avec `created_at` invalide** → `formatDate` va afficher "Invalid Date"

---

## 📋 Résumé des Problèmes

### Critiques (à corriger avant production) :
1. ❌ **UI Dashboard ligne 20** : Pas de gestion d'erreur API
2. ❌ **UI Dashboard ligne 23** : Pas de vérification avant `.map()` sur `recentOffers`
3. ❌ **UI Dashboard lignes 42, 47, 52** : Pas de valeurs par défaut pour les counts
4. ⚠️ **API Summary ligne 27** : Risque si `recentOffers` est undefined

### Recommandés (amélioration) :
5. ⚠️ **UI Dashboard ligne 23** : Typage faible avec `any`
6. ⚠️ **RecentOffersList ligne 60** : Pas de vérification si `total` est null/undefined
7. ⚠️ **RecentOffersList ligne 63** : Pas de vérification si `created_at` est valide

---

## ✅ Conclusion

### Verdict : **❌ Corrige les problèmes critiques avant de continuer**

**Actions prioritaires :**
1. **Ajouter gestion d'erreur dans `page.tsx`** (ligne ~20)
2. **Ajouter vérification avant `.map()`** (ligne 23)
3. **Ajouter valeurs par défaut pour les counts** (lignes 42, 47, 52)
4. **Ajouter vérification dans l'API** pour `recentOffers` (ligne ~27)

**Après ces corrections :**
- ✅ Backend : OK
- ✅ API : OK (avec vérifications ajoutées)
- ✅ UI : OK (avec gestion d'erreur et valeurs par défaut)
- ✅ Sécurité : OK

**Le dashboard sera alors prêt pour la production.**

---

**Fin de l'audit**

