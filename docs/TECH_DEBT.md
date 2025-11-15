# Dette Technique

Ce document liste les dettes techniques identifiées dans le projet et les stratégies pour les résoudre.

## Migration Material-UI → shadcn/ui

### Contexte

Le projet utilise actuellement deux bibliothèques de composants UI :
- **Material-UI (MUI)** : Bibliothèque legacy utilisée principalement pour les pages d'authentification
- **shadcn/ui** : Bibliothèque moderne basée sur Radix UI, utilisée pour le reste de l'application

**Objectif** : Migrer complètement vers shadcn/ui pour simplifier la stack technique et réduire la taille du bundle.

### Où Material-UI est utilisé

#### Pages d'authentification
- `src/app/authentication/login/page.tsx` - Page de connexion (Grid, Box, Card, Typography, Stack)
- `src/app/authentication/register/page.tsx` - Page d'inscription (Grid, Box, Card, Typography, Stack)
- `src/app/authentication/auth/AuthLogin.tsx` - Composant de formulaire de connexion (Box, Typography, FormGroup, Button, Stack, Checkbox, Alert)
- `src/app/authentication/auth/AuthRegister.tsx` - Composant de formulaire d'inscription (Box, Typography, Button, Alert, Stack)

#### Composants partagés
- `src/components/forms/CustomTextField.tsx` - Wrapper autour de TextField MUI
- `src/components/layout/MUIThemeProvider.tsx` - Provider de thème MUI (⚠️ LEGACY)

#### Utilitaires de thème
- `src/utils/theme/DefaultColors.tsx` - Configuration du thème MUI
- `src/utils/theme.ts` - Instance du thème MUI

#### Dépendances dans package.json
- `@mui/material` - Composants Material-UI
- `@mui/icons-material` - Icônes Material-UI
- `@mui/lab` - Composants expérimentaux Material-UI
- `@mui/system` - Système de style Material-UI
- `@emotion/react`, `@emotion/styled`, `@emotion/cache` - Dépendances runtime de MUI

### Stratégie de migration

#### Phase 1 : Nouveaux développements (✅ En cours)
- **Tous les nouveaux écrans/features utilisent uniquement shadcn/ui**
- Ne pas créer de nouvelles dépendances sur Material-UI
- Utiliser les composants shadcn/ui existants ou en créer de nouveaux si nécessaire

#### Phase 2 : Migration progressive des écrans existants
- **Priorité 1** : Pages d'authentification (login/register)
  - Migrer vers les composants shadcn/ui équivalents
  - Utiliser `Input`, `Button`, `Card`, `Label` de shadcn/ui
  - Adapter le styling pour correspondre au design actuel
  
- **Priorité 2** : Composants partagés
  - Remplacer `CustomTextField` par `Input` de shadcn/ui
  - Supprimer `MUIThemeProvider` une fois que plus aucun composant ne l'utilise

- **Priorité 3** : Nettoyage
  - Supprimer les fichiers de thème MUI (`DefaultColors.tsx`, `theme.ts`)
  - Supprimer les dépendances MUI du `package.json`
  - Supprimer les imports MUI restants

#### Phase 3 : Validation et nettoyage final
- Vérifier qu'aucun import MUI ne subsiste dans le codebase
- Supprimer les dépendances MUI du `package.json`
- Vérifier que le bundle size a diminué
- Mettre à jour la documentation

### Composants équivalents

| Material-UI | shadcn/ui équivalent |
|------------|----------------------|
| `TextField` | `Input` |
| `Button` | `Button` |
| `Card` | `Card` |
| `Typography` | Utiliser les classes Tailwind ou composants HTML natifs |
| `Grid` | Utiliser CSS Grid ou Flexbox avec Tailwind |
| `Box` | Utiliser `div` avec classes Tailwind |
| `Stack` | Utiliser `div` avec `flex` et classes Tailwind |
| `Alert` | `Alert` (shadcn/ui) |
| `Checkbox` | `Checkbox` (shadcn/ui) |
| `FormGroup`, `FormControlLabel` | Utiliser `Label` et structure HTML native |

### Notes importantes

- **Ne pas casser l'UI existante** : La migration doit être progressive et maintenir le même rendu visuel
- **Tests** : S'assurer que les tests E2E passent après chaque migration
- **Accessibilité** : shadcn/ui est basé sur Radix UI qui offre une meilleure accessibilité par défaut
- **Performance** : Réduction attendue de la taille du bundle après suppression de MUI

### Références

- Documentation shadcn/ui : https://ui.shadcn.com/
- Composants disponibles : Voir `src/components/ui/`

