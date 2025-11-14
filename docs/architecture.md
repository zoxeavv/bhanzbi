# Architecture MGRH

## Stack technique

- **Framework** : Next.js 14+ (App Router)
- **Langage** : TypeScript strict
- **ORM** : Drizzle ORM
- **Base de données** : PostgreSQL (via Supabase)
- **Auth** : Supabase Auth
- **UI** : shadcn/ui + Tailwind CSS
- **Validation** : Zod

## Structure du projet

```
src/
├── app/                    # Routes Next.js App Router
│   ├── (dashboard)/       # Routes protégées (groupes de routes)
│   ├── api/               # API Routes (Server Actions)
│   └── authentication/    # Pages d'auth
├── lib/
│   ├── auth/              # Session & auth helpers
│   ├── db/
│   │   ├── index.ts       # Instance Drizzle
│   │   ├── schema.ts      # Schéma Drizzle
│   │   └── queries/       # Couche d'accès aux données
│   ├── supabase/          # Client Supabase
│   └── validations.ts     # Schémas Zod
├── components/            # Composants React réutilisables
│   └── ui/                # Composants shadcn/ui
└── types/                 # Types TypeScript
    └── domain.ts          # Types métier
```

## Principes d'architecture

### 1. Server Components par défaut

- Les pages sont des Server Components sauf besoin explicite de client-side
- Pas de `"use client"` sauf pour interactivité (forms, modals, etc.)

### 2. Couche queries

- Toutes les opérations DB dans `lib/db/queries/*`
- Une fonction par opération : `list*`, `get*ById`, `create*`, `update*`
- Pas de logique métier dans les queries (uniquement CRUD)
- Normalisation des données (null → '', array → [])

### 3. API Routes

- Routes API dans `app/api/*/route.ts`
- Validation Zod obligatoire côté serveur
- Vérification de session via `requireSession()`
- Retour JSON standardisé

### 4. Pas de data-store en mémoire

- ❌ Pas de store global en mémoire (Redux, Zustand, etc.)
- ✅ Données via Server Components ou API Routes
- ✅ Cache Next.js uniquement (revalidate, cache)

## Flux de données

```
Page (Server Component)
  ↓
API Route / Query Function
  ↓
Drizzle Query
  ↓
PostgreSQL (Supabase)
```

## Middleware

- Protection des routes dans `middleware.ts`
- Validation session Supabase via `getSessionFromRequest()`
- Redirection automatique si non authentifié

