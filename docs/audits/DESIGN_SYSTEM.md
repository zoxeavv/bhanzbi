# 🎨 Design System MGRH v2

**Date** : 2024-12-19  
**Version** : 2.0  
**Objectif** : Normalisation complète du design system avec tokens Tailwind et composants réutilisables

---

## 📋 Vue d'ensemble

Le design system MGRH v2 est basé sur la palette **Modernize** avec des tokens Tailwind normalisés et des composants réutilisables pour garantir la cohérence de l'interface.

---

## 🎨 Tokens du Design System

### Couleurs

Les couleurs sont définies dans `src/app/globals.css` et accessibles via Tailwind :

#### Couleurs principales
- **Primary** : `#5D87FF` (hsl(224 100% 68%)) - Actions principales, liens
- **Secondary** : `#49BEFF` (hsl(201 100% 64%)) - Actions secondaires
- **Muted** : Gris clair pour les arrière-plans et bordures

#### Couleurs sémantiques
- **Success** : `hsl(169 84% 47%)` - Succès, validation
- **Warning** : `hsl(38 100% 56%)` - Avertissements
- **Destructive** : `hsl(13 93% 70%)` - Erreurs, suppressions
- **Info** : `hsl(215 100% 66%)` - Informations

#### Échelle de gris
- `grey-100` : Arrière-plans très clairs
- `grey-200` : Bordures légères
- `grey-300` : Bordures moyennes
- `grey-400` : Texte secondaire
- `grey-500` : Texte tertiaire
- `grey-600` : Texte principal (dark mode)

**Utilisation** :
```tsx
<div className="bg-primary text-primary-foreground">
<div className="text-success">
<div className="border-grey-200">
```

---

### Typographie

#### Échelle de tailles

| Token | Taille | Line Height | Font Weight | Usage |
|-------|--------|-------------|-------------|-------|
| `text-display-lg` | 48px | 56px | 700 | Titres hero |
| `text-display-md` | 40px | 48px | 700 | Titres grandes sections |
| `text-display-sm` | 32px | 40px | 700 | Titres sections |
| `text-h1` | 36px | 44px | 600 | Titres de page |
| `text-h2` | 30px | 36px | 600 | Sous-titres |
| `text-h3` | 24px | 28px | 600 | Titres de section |
| `text-h4` | 21px | 25.6px | 600 | Sous-sections |
| `text-h5` | 18px | 28.8px | 600 | Titres cards |
| `text-h6` | 16px | 19.2px | 600 | Titres petits |
| `text-body1` | 14px | 21.344px | 400 | Corps de texte |
| `text-body2` | 12px | 16px | 400 | Texte secondaire |
| `text-label` | 14px | 20px | 500 | Labels de formulaire |
| `text-meta` | 12px | 16px | 400 | Métadonnées |

**Utilisation** :
```tsx
<h1 className="text-h1">Titre de page</h1>
<p className="text-body1">Corps de texte</p>
<label className="text-label">Label</label>
```

#### Font Family
- **Font principale** : `'Plus Jakarta Sans'`, Helvetica, Arial, sans-serif

---

### Radii (Border Radius)

| Token | Valeur | Usage |
|-------|--------|-------|
| `rounded-sm` | 3px | Petits éléments |
| `rounded-md` | 5px | Éléments moyens |
| `rounded-lg` | 7px | Éléments standards (défaut) |
| `rounded-xl` | 12px | Cards grandes |
| `rounded-2xl` | 16px | Modals, popovers |
| `rounded-full` | 9999px | Avatars, badges circulaires |

**Utilisation** :
```tsx
<Card className="rounded-lg">
<Button className="rounded-md">
```

---

### Spacing

#### Échelle de base (4px increments)

| Token | Valeur | Usage |
|-------|--------|-------|
| `p-1` / `gap-1` | 4px | Espacements très petits |
| `p-2` / `gap-2` | 8px | Espacements petits |
| `p-3` / `gap-3` | 12px | Espacements moyens |
| `p-4` / `gap-4` | 16px | Espacements standards |
| `p-6` / `gap-6` | 24px | Espacements grands (sections) |
| `p-8` / `gap-8` | 32px | Espacements très grands |

#### Tokens sémantiques

| Token | Valeur | Usage |
|-------|--------|-------|
| `p-page-padding` | 24px | Padding standard des pages |
| `gap-section-gap` | 24px | Espacement entre sections |
| `p-card-padding` | 24px | Padding standard des cards |

**Utilisation** :
```tsx
<div className="space-y-section-gap">
<Card className="p-card-padding">
```

---

### Shadows

| Token | Usage |
|-------|-------|
| `shadow-sm` | Ombres très légères |
| `shadow` (défaut) | Ombres standards (cards) |
| `shadow-md` | Ombres moyennes |
| `shadow-lg` | Ombres grandes |
| `shadow-xl` | Ombres très grandes |
| `shadow-card` | Ombres pour cards (alias de `shadow`) |

**Utilisation** :
```tsx
<Card className="shadow-card">
```

---

## 🧩 Composants Réutilisables

### PageHeader

Composant standardisé pour les en-têtes de page avec titre, description et actions.

**Props** :
- `title: string` - Titre de la page
- `description?: string` - Description optionnelle
- `actions?: ReactNode` - Actions à droite (boutons, etc.)
- `className?: string` - Classes CSS additionnelles

**Exemple** :
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

<PageHeader
  title="Clients"
  description="Gérez votre portefeuille clients et leurs offres commerciales"
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Nouveau client
    </Button>
  }
/>
```

---

### Toolbar

Composant standardisé pour les barres d'outils (recherche, filtres, etc.).

**Props** :
- `children: ReactNode` - Contenu de la toolbar (Input, Select, etc.)
- `className?: string` - Classes CSS additionnelles

**Exemple** :
```tsx
import { Toolbar } from '@/components/ui/Toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

<Toolbar>
  <Input placeholder="Rechercher..." />
  <Select>
    <SelectTrigger>
      <SelectValue placeholder="Secteur" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Tous</SelectItem>
    </SelectContent>
  </Select>
</Toolbar>
```

---

### EmptyState

Composant standardisé pour les états vides avec icône, titre, description et action.

**Props** :
- `icon: LucideIcon` - Icône Lucide React
- `title: string` - Titre de l'état vide
- `description: string` - Description
- `actionLabel?: string` - Label du bouton d'action
- `actionHref?: string` - Lien pour l'action (si Link)
- `actionOnClick?: () => void` - Handler pour l'action (si Button)
- `className?: string` - Classes CSS additionnelles

**Exemple** :
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2 } from 'lucide-react';

<EmptyState
  icon={Building2}
  title="Aucun client"
  description="Commencez par ajouter votre premier client pour générer des offres commerciales."
  actionLabel="Ajouter un client"
  actionHref="/clients/nouveau"
/>
```

---

### StatCard

Composant standardisé pour les cartes de statistiques avec icône, valeur et tendance optionnelle.

**Props** :
- `title: string` - Titre de la statistique
- `value: number | string` - Valeur à afficher
- `icon?: ReactNode` - Icône optionnelle
- `trend?: { value: number; label: string; isPositive?: boolean }` - Tendance optionnelle
- `onClick?: () => void` - Handler de clic (rend la card cliquable)
- `className?: string` - Classes CSS additionnelles

**Exemple** :
```tsx
import { StatCard } from '@/components/ui/StatCard';
import { FileText } from 'lucide-react';

<StatCard
  title="Total des offres"
  value={42}
  icon={<FileText className="h-5 w-5" />}
  trend={{
    value: 12,
    label: "vs mois dernier",
    isPositive: true
  }}
  onClick={() => router.push('/offres')}
/>
```

---

## 📐 Patterns de Layout

### Structure de page standard

```tsx
<div className="space-y-section-gap">
  {/* Header */}
  <PageHeader
    title="Titre de la page"
    description="Description"
    actions={<Button>Action</Button>}
  />

  {/* Toolbar */}
  <Toolbar>
    <Input placeholder="Rechercher..." />
    <Select>...</Select>
  </Toolbar>

  {/* Contenu */}
  {loading ? (
    <Skeleton />
  ) : items.length === 0 ? (
    <EmptyState ... />
  ) : (
    <Table ... />
  )}
</div>
```

### Grille de statistiques

```tsx
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
  <StatCard title="Offres" value={42} icon={<FileText />} />
  <StatCard title="Clients" value={12} icon={<Users />} />
  <StatCard title="Templates" value={8} icon={<File />} />
  <StatCard title="Revenus" value="12 450 €" icon={<Euro />} />
</div>
```

---

## 🎯 Bonnes Pratiques

### ✅ À faire

- Utiliser les composants normalisés (`PageHeader`, `Toolbar`, `EmptyState`, `StatCard`)
- Utiliser les tokens Tailwind pour les espacements (`gap-6`, `p-card-padding`)
- Utiliser les tokens de typographie (`text-h1`, `text-body1`)
- Utiliser les tokens de couleurs (`bg-primary`, `text-muted-foreground`)
- Respecter les espacements sémantiques (`space-y-section-gap`)

### ❌ À éviter

- Créer des composants custom pour des cas déjà couverts
- Utiliser des valeurs hardcodées au lieu des tokens
- Mélanger les systèmes de design (MUI + shadcn)
- Ignorer les tokens sémantiques pour les espacements

---

## 🔄 Migration depuis les anciens composants

### Remplacer `DashboardHeader` par `PageHeader`

**Avant** :
```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <div className="space-y-1">
    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
    <p className="text-sm text-muted-foreground">Vue d'ensemble</p>
  </div>
  <Button>Action</Button>
</div>
```

**Après** :
```tsx
<PageHeader
  title="Dashboard"
  description="Vue d'ensemble"
  actions={<Button>Action</Button>}
/>
```

### Remplacer `StatsCard` par `StatCard` (nouveau)

**Avant** :
```tsx
<StatsCard title="Offres" value={42} icon={<FileText />} />
```

**Après** :
```tsx
<StatCard title="Offres" value={42} icon={<FileText />} />
```

### Remplacer `EmptyState` par `EmptyState` (nouveau)

**Avant** :
```tsx
<EmptyState
  icon={Building2}
  title="Aucun client"
  description="..."
  actionLabel="Ajouter"
  actionHref="/clients/nouveau"
/>
```

**Après** :
```tsx
<EmptyState
  icon={Building2}
  title="Aucun client"
  description="..."
  actionLabel="Ajouter"
  actionHref="/clients/nouveau"
/>
```
(API identique, mais composant normalisé)

---

## 📚 Références

- **Palette Modernize** : Basée sur les couleurs Modernize
- **shadcn/ui** : Composants UI de base (Button, Card, Input, etc.)
- **Tailwind CSS** : Framework CSS avec tokens personnalisés
- **Plus Jakarta Sans** : Police principale

---

**Fin de la documentation du design system**


