# 🔍 Trace du flux : Clic sur l'onglet "Clients"

**Date** : 2025-01-27  
**Type** : Audit / Documentation (lecture seule)

---

## 📋 Table des matières

1. [Composant de navigation](#1-composant-de-navigation)
2. [Page cible](#2-page-cible)
3. [Flux complet](#3-flux-complet)
4. [Résumé](#4-résumé)

---

## 1. Composant de navigation

### 📍 Fichier

**Chemin** : `src/components/sidebar/SidebarNav.tsx`

### 🔗 URL cible

**URL exacte** : `/clients`

**Définition** (ligne 16) :
```typescript
const mainNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },  // ← Ici
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Offres", href: "/offres", icon: FileCheck },
]
```

### 👁️ Condition d'affichage

**Aucune condition** - L'onglet "Clients" est **toujours visible** pour tous les utilisateurs.

**Preuve** :
- Le composant `SidebarNav` est un **Client Component** (`"use client"`)
- Il n'y a **aucune vérification de rôle** dans le code
- Aucune condition `if (role === "ADMIN")` ou similaire
- Tous les items de `mainNavigation` sont rendus sans filtre

**Code** (lignes 26-53) :
```typescript
export function SidebarNav({ items = mainNavigation, className }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("space-y-1", className)}>
      {items.map((item) => {
        // Aucune condition ici, tous les items sont rendus
        return (
          <Link
            key={item.name}
            href={item.href}  // "/clients" pour l'onglet Clients
            // ...
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

### 🏗️ Hiérarchie des composants

```
AppShell (src/components/AppShell.tsx)
  └── Sidebar (src/components/sidebar/Sidebar.tsx)
      └── SidebarNav (src/components/sidebar/SidebarNav.tsx)
          └── Link href="/clients" (onglet "Clients")
```

---

## 2. Page cible

### 📍 Fichier

**Chemin** : `src/app/(dashboard)/clients/page.tsx`

**Layout parent** : `src/app/(dashboard)/layout.tsx` (pas de layout spécifique pour `/clients`)

### 🔒 Guards utilisés

#### Guard principal : `getCurrentOrgId()`

**Ligne 25** :
```typescript
const orgId = await getCurrentOrgId();
```

**Ce que fait `getCurrentOrgId()`** :
1. Appelle `requireSession()` en interne (ligne 212 de `session.ts`)
2. `requireSession()` vérifie l'authentification :
   - Appelle `getSession()`
   - Si `session === null` → throw `Error('Unauthorized')`
3. Si session valide, récupère `orgId` depuis la session ou `DEFAULT_ORG_ID`
4. Si `orgId` manquant ET `DEFAULT_ORG_ID` non défini → throw erreur

**Résumé** : Guard **implicite** via `getCurrentOrgId()` qui vérifie l'authentification mais **pas le rôle**.

#### Guards explicites

**Aucun guard explicite** :
- ❌ Pas de `requireSession()` explicite
- ❌ Pas de `requireAdmin()` 
- ❌ Pas de vérification de rôle

**Type de page** : **Server Component** (`export default async function ClientsPage()`)

### 🛡️ Protection par middleware

**Fichier** : `middleware.ts` (ligne 47)

**Protection** :
```typescript
if (pathname.startsWith('/dashboard') || 
    pathname.startsWith('/clients') ||  // ← Protège /clients
    pathname.startsWith('/offers') || 
    pathname.startsWith('/templates')) {
  if (!hasValidSession) {
    return NextResponse.redirect(new URL('/authentication/login', request.url));
  }
}
```

**Comportement** :
- Si session invalide → Redirect vers `/authentication/login` (sans paramètre)
- Si session valide → Continue vers la page

### 📄 Structure de la page

**Type** : Server Component (async)

**Flux d'exécution** :
```typescript
export default async function ClientsPage() {
  try {
    // 1. Guard implicite : getCurrentOrgId() vérifie l'authentification
    const orgId = await getCurrentOrgId();
    
    // 2. Récupération des données
    const clients = await getClientsWithOffersCount(orgId);
    
    // 3. Rendu du composant
    return (
      <div>
        <PageHeader ... />
        <ClientsTableSection initialClients={clients} />
      </div>
    );
  } catch (error) {
    // 4. Gestion d'erreur
    if (error.message === 'Unauthorized' || error.message.includes('Organization ID')) {
      redirect('/authentication/login?error=unauthorized');
    }
    redirect('/dashboard?error=clients_load_failed');
  }
}
```

### 🏗️ Layout parent

**Fichier** : `src/app/(dashboard)/layout.tsx`

**Comportement** :
```typescript
export default async function DashboardLayout({ children }) {
  const session = await getSession()  // ← Ne throw pas si null
  
  return (
    <AppShell
      userEmail={session?.user.email}
      orgId={session?.orgId}
    >
      {children}  // ← Page /clients s'affiche ici
    </AppShell>
  )
}
```

**Note** : Le layout **ne protège pas** la route (ne throw pas d'erreur si session est null), il affiche juste les infos utilisateur si disponibles.

---

## 3. Flux complet

### 🔄 Séquence d'exécution

```
1. [CLIENT] Clic sur l'onglet "Clients"
   └── Composant : SidebarNav.tsx (ligne 16)
   └── URL : /clients
   └── Condition : Aucune (toujours visible)

2. [MIDDLEWARE] Interception de la requête
   └── Fichier : middleware.ts (ligne 47)
   └── Vérification : pathname.startsWith('/clients')
   └── Action :
       ├── Si session invalide → Redirect /authentication/login
       └── Si session valide → Continue

3. [LAYOUT] Layout parent s'exécute
   └── Fichier : src/app/(dashboard)/layout.tsx
   └── Action : Appelle getSession() (ne throw pas si null)
   └── Rendu : AppShell avec Sidebar

4. [PAGE] Page Clients s'exécute
   └── Fichier : src/app/(dashboard)/clients/page.tsx
   └── Guard : getCurrentOrgId() (ligne 25)
       ├── Appelle requireSession() en interne
       ├── Si session invalide → throw Error('Unauthorized')
       └── Si session valide → continue
   └── Action :
       ├── Récupère orgId
       ├── Charge les clients via getClientsWithOffersCount(orgId)
       └── Rend le composant ClientsTableSection
   └── Gestion d'erreur :
       ├── Si Unauthorized → redirect('/authentication/login?error=unauthorized')
       └── Sinon → redirect('/dashboard?error=clients_load_failed')

5. [RENDU] Affichage final
   └── Composant : ClientsTableSection (client component)
   └── Données : Liste des clients avec nombre d'offres
```

### 🎯 Points de contrôle

| Étape | Fichier | Vérification | Action si échec |
|-------|---------|--------------|-----------------|
| 1. Navigation | `SidebarNav.tsx` | Aucune | - |
| 2. Middleware | `middleware.ts` | Session valide | Redirect `/authentication/login` |
| 3. Layout | `layout.tsx` | Session (optionnelle) | Continue (affiche sans infos user) |
| 4. Page | `clients/page.tsx` | Auth via `getCurrentOrgId()` | Redirect `/authentication/login?error=unauthorized` |

### 🔐 Niveaux de protection

1. **Middleware** : Vérifie la session au niveau route (première ligne de défense)
2. **Page** : Vérifie l'authentification via `getCurrentOrgId()` (deuxième ligne de défense)
3. **Queries** : Filtrent sur `org_id` pour l'isolation multi-tenant (sécurité des données)

**Note** : Il y a **deux vérifications d'authentification** :
- Middleware : `getSessionFromRequest()` 
- Page : `getCurrentOrgId()` → `requireSession()` → `getSession()`

Cela peut créer une **race condition** si la session expire entre les deux vérifications.

---

## 4. Résumé

### 📝 Flux Clients

**Flux Clients** : `[SidebarNav]` → `/clients` → `[ClientsPage Server Component]`

**Détails** :
- **Composant Nav** : `src/components/sidebar/SidebarNav.tsx` (ligne 16)
- **URL** : `/clients`
- **Condition d'affichage** : Aucune (toujours visible, pas de vérification de rôle)
- **Page cible** : `src/app/(dashboard)/clients/page.tsx`
- **Guards** : 
  - Middleware : `getSessionFromRequest()` (protège la route)
  - Page : `getCurrentOrgId()` → `requireSession()` (guard implicite)
- **Type** : Server Component (async)
- **Protection** : Authentification uniquement (pas de vérification de rôle ADMIN)

### ⚠️ Points d'attention

1. **Onglet toujours visible** : L'onglet "Clients" est visible pour tous les utilisateurs, même si la page nécessite une authentification
2. **Pas de vérification de rôle** : La page ne vérifie pas si l'utilisateur est ADMIN ou USER
3. **Double vérification** : Le middleware ET la page vérifient l'authentification (peut créer des incohérences)
4. **Gestion d'erreur** : Si `orgId` manque, redirect vers login avec `?error=unauthorized`

---

**Fin du document**

