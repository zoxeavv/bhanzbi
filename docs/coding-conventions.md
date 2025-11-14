# Conventions de code

## Nommage

### Fichiers

- **Pages** : `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **API Routes** : `route.ts`
- **Composants** : `kebab-case.tsx` (ex: `client-form.tsx`)
- **Queries** : `kebab-case.ts` (ex: `clients.ts`)
- **Types** : `domain.ts`, `types.ts`

### Fonctions

- **Queries** : `list*`, `get*ById`, `create*`, `update*`, `delete*`
- **Helpers** : `normalize*`, `firstOrError`
- **Auth** : `getSession`, `requireSession`, `getSessionFromRequest`

### Variables

- **camelCase** pour variables et fonctions
- **PascalCase** pour composants et types
- **UPPER_SNAKE_CASE** pour constantes

## Structure des queries

### Pattern standard

```typescript
// lib/db/queries/clients.ts

// Helpers de normalisation (réutilisables)
function normalizeString(str: string | null | undefined): string {
  return str ?? '';
}

function firstOrError<T>(result: T | undefined, error: string): T {
  if (!result) throw new Error(error);
  return result;
}

// Query functions
export async function listClients(orgId: string): Promise<Client[]> {
  const results = await db.select()
    .from(clients)
    .where(eq(clients.org_id, orgId))
    .orderBy(desc(clients.created_at));
  
  return results.map(transformRow);
}

export async function getClientById(id: string, orgId: string): Promise<Client> {
  const result = await db.select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.org_id, orgId)))
    .limit(1);
  
  const row = firstOrError(result[0], `Client not found: ${id}`);
  return transformRow(row);
}
```

## Types

### Domain types

- Définis dans `src/types/domain.ts`
- Types métier uniquement (pas de types UI)
- Cohérence avec le schéma Drizzle

### Inférence Drizzle

```typescript
// Utiliser l'inférence quand possible
type ClientInsert = typeof clients.$inferInsert;
type ClientSelect = typeof clients.$inferSelect;
```

## Validation Zod

### Schémas de validation

- Un schéma par entité dans `src/lib/validations.ts`
- Messages d'erreur en français (si besoin)
- Types inférés : `z.infer<typeof schema>`

### Utilisation

```typescript
// Dans API Route
import { clientSchema } from '@/lib/validations';

const body = clientSchema.parse(await request.json());
```

## Gestion d'erreurs

### Queries

- `firstOrError()` pour les résultats uniques
- Messages d'erreur explicites
- Pas de `null` silencieux (throw si erreur)

### API Routes

- Try/catch pour les erreurs inattendues
- Retour `NextResponse.json({ error: ... }, { status: 400/404/500 })`
- Ne pas exposer de détails sensibles

## Composants

### Server Components par défaut

- Pas de `"use client"` sauf besoin explicite
- Interactivité → Client Component isolé

### Props

- Types explicites (pas de `any`)
- Props optionnelles avec `?`
- Props enfants : `React.ReactNode`

## Imports

### Ordre

1. React / Next.js
2. Bibliothèques externes
3. Imports internes (`@/...`)
4. Types

### Exemple

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { clientSchema } from '@/lib/validations';
import type { Client } from '@/types/domain';
```

## Formatage

- **Indentation** : 2 espaces
- **Guillemets** : Simple quotes pour JS/TS, double pour JSX
- **Point-virgule** : Oui
- **Trailing comma** : Oui dans objets/arrays multilignes

## Commentaires

- Code auto-documenté (noms explicites)
- Commentaires pour expliquer le "pourquoi", pas le "quoi"
- TODO avec préfixe `⚠️ TODO` si action requise

