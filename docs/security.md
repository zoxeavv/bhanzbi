# Sécurité

## Authentification

### Supabase Auth

- **Provider** : Supabase Auth (JWT)
- **Session** : Gérée via cookies (`sb-<project-ref>-auth-token`)
- **Middleware** : Validation automatique dans `middleware.ts`
- **Helpers** : `getSession()`, `requireSession()`, `getSessionFromRequest()`

### Routes protégées

- Toutes les routes `/dashboard/*`, `/clients/*`, `/offers/*`, `/templates/*` nécessitent une session valide
- Redirection automatique vers `/authentication/login` si non authentifié

## Multi-tenancy

### Principe

- Chaque utilisateur appartient à une organisation (`org_id`)
- Toutes les données sont isolées par `org_id`
- Un utilisateur ne peut accéder qu'aux données de son organisation

### Implémentation

1. **Session** : `org_id` stocké dans `user.user_metadata.org_id`
2. **Queries** : Filtrage systématique par `org_id` dans toutes les queries DB
3. **RLS** : Row Level Security activée côté Supabase (à configurer)

### Pattern de query sécurisée

```typescript
// ❌ MAUVAIS (pas de filtre org_id)
export async function listClients() {
  return db.select().from(clients);
}

// ✅ BON (filtre org_id obligatoire)
export async function listClients(orgId: string) {
  return db.select()
    .from(clients)
    .where(eq(clients.org_id, orgId));
}
```

## Protection IDOR

### Insecure Direct Object Reference

- **Risque** : Accès à une ressource via son ID sans vérifier l'ownership
- **Solution** : Vérifier systématiquement `org_id` avant toute opération

### Pattern de vérification

```typescript
// Dans une API Route
const session = await requireSession();
const client = await getClientById(id);

if (client.org_id !== session.orgId) {
  throw new Error('Forbidden');
}
```

## Validation des inputs

### Zod obligatoire

- Tous les inputs API doivent être validés avec Zod
- Schémas dans `src/lib/validations.ts`
- Validation côté serveur uniquement (pas de confiance côté client)

### Exemple

```typescript
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

// Dans API Route
const body = createClientSchema.parse(await request.json());
```

## RLS (Row Level Security)

### Supabase RLS

- **État** : À activer côté Supabase
- **Politiques** : Chaque table doit avoir des policies basées sur `org_id`
- **Exemple** : `SELECT * FROM clients WHERE org_id = auth.jwt() ->> 'org_id'`

## Checklist sécurité

- [ ] Auth obligatoire sur toutes les routes protégées
- [ ] `org_id` présent dans toutes les tables métier
- [ ] Filtrage `org_id` dans toutes les queries
- [ ] Validation Zod sur tous les inputs API
- [ ] Vérification ownership avant modification/suppression
- [ ] RLS activée côté Supabase
- [ ] Pas d'exposition de données sensibles dans les erreurs

