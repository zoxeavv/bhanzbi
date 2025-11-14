# Modèle de domaine

## Entités principales

### User

- **Table** : `auth.users` (Supabase) + `crm_users` (métadonnées)
- **Champs** : `id`, `email`, `org_id` (dans `user_metadata`)
- **Usage** : Authentification et multi-tenancy

### Client

- **Table** : `clients`
- **Champs** : `id`, `name`, `company`, `email`, `phone`, `tags[]`, `created_at`, `updated_at`
- **Relations** : 1-N avec `offers`
- **⚠️ TODO** : Ajouter `org_id` pour multi-tenancy

### Template

- **Table** : `templates`
- **Champs** : `id`, `title`, `slug` (unique), `content` (markdown), `category`, `tags[]`, `created_at`, `updated_at`
- **Relations** : 1-N avec `offers`
- **Usage** : Modèles réutilisables pour générer des offres
- **⚠️ TODO** : Ajouter `org_id` pour multi-tenancy

### Offer

- **Table** : `offers`
- **Champs** : `id`, `client_id` (FK), `template_id` (FK nullable), `title`, `items[]` (JSONB), `subtotal`, `tax_rate`, `tax_amount`, `total`, `status` (enum), `created_at`, `updated_at`
- **Relations** : N-1 avec `clients`, N-1 avec `templates`
- **Status** : `draft` | `sent` | `accepted` | `rejected`
- **Montants** : Stockés en centimes (DB: numeric, Domain: number)
- **⚠️ TODO** : Ajouter `org_id` pour multi-tenancy

## Types TypeScript

Définis dans `src/types/domain.ts` :

```typescript
type Client = { id, name, company, email, phone, tags[], created_at, updated_at }
type Offer = { id, client_id, template_id, title, items[], subtotal, tax_rate, tax_amount, total, status, ... }
type Template = { id, title, slug, content, category, tags[], ... }
type User = { id, email, org_id? }
type Session = { user: User, orgId?: string } | null
```

## Relations

```
User (org_id)
  ↓
  ├─→ Client (org_id) ←──┐
  │                      │
  └─→ Template (org_id)  │
                          │
                    Offer (org_id)
```

## Multi-tenancy

- **Isolation** : Par `org_id` (organisation)
- **Règle** : Un utilisateur appartient à une org, toutes ses données sont isolées
- **Implémentation** : Filtrage systématique par `org_id` dans toutes les queries
- **⚠️ État actuel** : `org_id` présent dans User mais pas encore dans les tables métier

