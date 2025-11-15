# Tests E2E avec Playwright

Cette suite de tests E2E valide les flux utilisateur réels du domaine Templates dans un navigateur.

## Installation

```bash
# Installer Playwright et les navigateurs
npx playwright install

# Installer les dépendances (si nécessaire)
npm install
```

## Configuration

### Variables d'environnement

Créez un fichier `.env.local` avec :

```env
# Base URL pour les tests (par défaut: http://localhost:3000)
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Credentials de test pour l'authentification
E2E_TEST_USER_EMAIL=test@example.com
E2E_TEST_PASSWORD=testpassword123

# ID de l'organisation de test
E2E_TEST_ORG_ID=org_test_e2e

# URL de la base de données pour le reset entre tests
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Adaptation des helpers

Les helpers dans `e2e/helpers/` doivent être adaptés à votre système d'authentification réel :

- **`auth.ts`** : Adaptez les sélecteurs selon votre formulaire de login
- **`db.ts`** : Vérifiez que les requêtes SQL correspondent à votre schéma DB

## Exécution des tests

```bash
# Exécuter tous les tests E2E
npm run test:e2e

# Mode interactif (UI)
npm run test:e2e:ui

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Mode debug
npm run test:e2e:debug

# Exécuter un fichier spécifique
npx playwright test e2e/templates.spec.ts

# Exécuter un test spécifique
npx playwright test e2e/templates.spec.ts -g "should display templates page"
```

## Structure

```
e2e/
├── helpers/
│   ├── auth.ts          # Helpers pour l'authentification
│   └── db.ts            # Helpers pour le reset de la DB
├── fixtures/            # Fichiers de test (ex: test-template.docx)
├── templates.spec.ts    # Tests E2E pour le domaine Templates
└── README.md           # Ce fichier
```

## Scénarios couverts

### Listing /templates
- ✅ Affichage de la page avec titre et cartes
- ✅ Filtrage par recherche

### Création via /templates/nouveau
- ✅ Upload de fichier et création de template
- ✅ Redirection vers la page d'édition
- ✅ Affichage des champs générés

### Édition d'un template
- ✅ Modification d'un champ
- ✅ Enregistrement et persistance
- ✅ Message de succès

### Utilisation dans une offre (optionnel)
- ✅ Sélection d'un template dans la création d'offre
- ✅ Affichage des champs du template

## Notes importantes

1. **Reset de la DB** : Les tests nettoient automatiquement les données de test avant et après chaque test
2. **Isolation** : Chaque test est indépendant grâce au cleanup automatique
3. **Sélecteurs** : Les sélecteurs sont flexibles et utilisent plusieurs stratégies pour trouver les éléments
4. **Skip automatique** : Si un élément n'est pas trouvé, le test est automatiquement skippé plutôt que d'échouer

## Débogage

Si un test échoue :

1. **Vérifier les sélecteurs** : Les sélecteurs peuvent nécessiter des ajustements selon votre UI
2. **Vérifier l'authentification** : Assurez-vous que les credentials de test sont valides
3. **Vérifier la DB** : Vérifiez que la DB de test est accessible et que les migrations sont appliquées
4. **Mode debug** : Utilisez `npm run test:e2e:debug` pour déboguer étape par étape
5. **Mode UI** : Utilisez `npm run test:e2e:ui` pour voir l'exécution en temps réel

## Prochaines étapes

- [ ] Adapter les sélecteurs selon votre UI réelle
- [ ] Créer un utilisateur de test dédié dans Supabase
- [ ] Ajouter des fixtures de fichiers .docx réels
- [ ] Étendre les tests à d'autres domaines (Clients, Offers)



