# Configuration MCP Supabase pour Cursor

Ce guide explique comment configurer MCP Supabase pour avoir une vue directe de votre base de données Supabase depuis Cursor.

## Problème actuel

Les appels MCP Supabase échouent avec "Unknown error occurred" car le serveur MCP n'est pas configuré dans Cursor.

## Solution : Configuration MCP Supabase

### Option 1 : Serveur MCP distant Supabase (Recommandé)

Supabase fournit un serveur MCP hébergé qui facilite la connexion sans installation locale.

#### Étape 1 : Obtenir votre Project Reference

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans les paramètres du projet, trouvez le **Project Reference** (ex: `ldarwvflrqoxjcrnehwm` ou `bofkyolkmaxouwjzlnwa`)

#### Étape 2 : Configurer Cursor

1. Ouvrez les paramètres Cursor (Cmd/Ctrl + ,)
2. Cherchez "MCP" ou "Model Context Protocol"
3. Ajoutez une nouvelle configuration MCP avec :

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp",
      "project_ref": "VOTRE_PROJECT_REF_ICI",
      "read_only": true
    }
  }
}
```

**Paramètres recommandés** :
- `project_ref` : Votre Project Reference Supabase (obligatoire)
- `read_only: true` : Mode lecture seule pour la sécurité (recommandé pour l'audit)

#### Étape 3 : Authentification OAuth

Lors de la première utilisation, Cursor ouvrira une fenêtre de navigateur pour :
1. Vous connecter à votre compte Supabase
2. Autoriser l'accès au serveur MCP
3. Accorder les permissions nécessaires

### Option 2 : Serveur MCP local (Alternative)

Si vous préférez utiliser un serveur MCP local :

#### Installation

```bash
npm install -g @supabase/mcp-server
```

#### Configuration Cursor

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server",
        "--project-ref", "VOTRE_PROJECT_REF",
        "--access-token", "VOTRE_ACCESS_TOKEN"
      ]
    }
  }
}
```

**Obtenir un Access Token** :
1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Settings → Access Tokens
3. Créez un nouveau token avec les permissions nécessaires

## Vérification de la configuration

Une fois configuré, vous pouvez tester avec :

```typescript
// Dans Cursor, utilisez les outils MCP Supabase disponibles :
// - mcp_supabase_list_projects
// - mcp_supabase_read_records
// - mcp_supabase_get_project
// etc.
```

## Utilisation pour l'audit de persistance

Une fois MCP Supabase configuré, vous pouvez :

1. **Lister les projets** :
   ```typescript
   mcp_supabase_list_projects()
   ```

2. **Lire les tables** :
   ```typescript
   mcp_supabase_read_records({ table: "clients" })
   mcp_supabase_read_records({ table: "templates" })
   mcp_supabase_read_records({ table: "offers" })
   mcp_supabase_read_records({ table: "admin_allowed_emails" })
   ```

3. **Vérifier le schéma réel** :
   - Colonnes, types, contraintes
   - Indexes
   - Policies RLS
   - Foreign keys

## Variables d'environnement nécessaires

Pour que les scripts fonctionnent aussi, assurez-vous d'avoir dans `.env.local` :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
NEXT_SUPABASE_ROLE_KEY=votre_service_role_key

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.VOTRE_PROJECT_REF.supabase.co:5432/postgres
```

## Dépannage

### Erreur "Unknown error occurred"

**Causes possibles** :
1. Serveur MCP non configuré dans Cursor
2. Authentification OAuth non complétée
3. `project_ref` incorrect ou manquant
4. Permissions insuffisantes

**Solutions** :
1. Vérifiez la configuration MCP dans Cursor
2. Ré-authentifiez-vous via OAuth
3. Vérifiez que le `project_ref` correspond à votre projet
4. Assurez-vous que le token a les permissions nécessaires

### Erreur "Unauthorized"

- Vérifiez que l'authentification OAuth est complète
- Vérifiez que le token/credentials sont valides
- Vérifiez que le projet existe et est accessible

### Erreur de connexion

- Vérifiez votre connexion internet
- Vérifiez que `https://mcp.supabase.com/mcp` est accessible
- Essayez avec `read_only: true` pour réduire les problèmes de permissions

## Ressources

- [Documentation Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)
- [GitHub Supabase MCP](https://github.com/supabase-community/supabase-mcp)
- [Cursor MCP Documentation](https://docs.cursor.com)

## Notes de sécurité

⚠️ **Important** :
- Utilisez `read_only: true` pour les audits (recommandé)
- Ne partagez jamais vos tokens d'accès
- Limitez l'accès au projet spécifique avec `project_ref`
- Utilisez des projets de développement pour les tests MCP

---

Une fois MCP Supabase configuré, vous pourrez utiliser les outils MCP pour :
- Vérifier le schéma réel de la base de données
- Comparer Drizzle schema ↔ DB réelle
- Vérifier les policies RLS
- Inspecter les contraintes et indexes

