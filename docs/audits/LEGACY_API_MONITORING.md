# Monitoring des Routes API LEGACY - Templates

## Vue d'ensemble

Les routes API suivantes sont marquées comme **LEGACY** et ne sont plus utilisées par le frontend :
- `POST /api/templates`
- `GET /api/templates/[id]`
- `PATCH /api/templates/[id]`

Ces routes sont maintenues temporairement pour compatibilité avec d'éventuelles intégrations externes.

## Routes encore utilisées

- ✅ `GET /api/templates` - **UTILISÉE** par le frontend (CreateOfferStepper, offres/page.tsx)

## Monitoring implémenté

### Logs automatiques

Tous les appels aux routes LEGACY sont automatiquement loggés avec `console.warn` au format suivant :

```javascript
console.warn('[LEGACY API] Templates API called', {
  method: 'POST' | 'GET' | 'PATCH',
  path: '/api/templates' | '/api/templates/[id]',
  orgId: string,
  userId: string | 'unknown',
  templateId?: string, // pour GET/PATCH [id]
  timestamp: string, // ISO 8601
  message: 'This LEGACY route is deprecated...'
});
```

### Exemple de log

```
[LEGACY API] Templates API called {
  method: 'POST',
  path: '/api/templates',
  orgId: 'org-123',
  userId: 'user-456',
  timestamp: '2024-12-19T10:30:00.000Z',
  message: 'This LEGACY route is deprecated and should not be used for new features. Monitor usage and plan removal if unused.'
}
```

## Comment monitorer

### 1. Via les logs de production

Si vous utilisez un système de logs centralisé (ex: Vercel Logs, Datadog, CloudWatch) :

```bash
# Rechercher tous les appels LEGACY
grep "[LEGACY API] Templates API called" logs.txt

# Compter les appels par route
grep "[LEGACY API]" logs.txt | grep "POST /api/templates" | wc -l
grep "[LEGACY API]" logs.txt | grep "GET /api/templates" | wc -l
grep "[LEGACY API]" logs.txt | grep "PATCH /api/templates" | wc -l

# Voir les appels par organisation
grep "[LEGACY API]" logs.txt | jq '.orgId' | sort | uniq -c
```

### 2. Via Vercel Analytics (si déployé sur Vercel)

Les logs `console.warn` apparaissent dans les logs Vercel. Vous pouvez filtrer par :
- `[LEGACY API]` pour voir tous les appels
- `method` pour filtrer par type de requête
- `orgId` pour voir quelles organisations utilisent ces routes

### 3. Script de monitoring (optionnel)

Créer un script pour analyser les logs :

```bash
#!/bin/bash
# scripts/check-legacy-api-usage.sh

LOG_FILE="${1:-logs.txt}"

echo "=== Monitoring Routes LEGACY Templates ==="
echo ""

echo "Appels POST /api/templates:"
grep -c "POST /api/templates" "$LOG_FILE" || echo "0"

echo "Appels GET /api/templates/[id]:"
grep -c "GET /api/templates" "$LOG_FILE" || echo "0"

echo "Appels PATCH /api/templates/[id]:"
grep -c "PATCH /api/templates" "$LOG_FILE" || echo "0"

echo ""
echo "Appels par organisation:"
grep "[LEGACY API]" "$LOG_FILE" | grep -o '"orgId":"[^"]*"' | sort | uniq -c
```

## Décision de suppression

### Critères de suppression

1. **Aucun appel détecté pendant 4-6 semaines** (via logs/monitoring)
2. **Vérification manuelle** : contacter les équipes/integrations externes pour confirmer
3. **Planification** : créer une issue/ticket pour la suppression avec un délai de grâce (ex: 2 semaines de notice)

### Processus de suppression recommandé

1. **Semaine 1-4** : Monitoring actif, collecte de données
2. **Semaine 5** : Analyse des logs, identification des utilisateurs potentiels
3. **Semaine 6** : Contact avec les équipes/integrations externes si des appels détectés
4. **Semaine 7-8** : Si aucun usage confirmé, planifier la suppression
5. **Semaine 9** : Créer une issue pour suppression avec notice de 2 semaines
6. **Semaine 11** : Supprimer les routes LEGACY

## Intégration avec systèmes de métriques (optionnel)

Si vous utilisez Prometheus, Datadog, ou un autre système de métriques, vous pouvez ajouter des compteurs :

```typescript
// Exemple avec Prometheus (à adapter selon votre setup)
import { Counter } from 'prom-client';

const legacyApiCounter = new Counter({
  name: 'legacy_templates_api_calls_total',
  help: 'Total number of calls to LEGACY templates API routes',
  labelNames: ['method', 'path', 'org_id'],
});

// Dans logLegacyApiCall:
legacyApiCounter.inc({ method, path, org_id: orgId });
```

## Fichiers modifiés

- ✅ `src/app/api/templates/route.ts` - Ajout monitoring sur POST
- ✅ `src/app/api/templates/[id]/route.ts` - Ajout monitoring sur GET et PATCH

## Notes importantes

- ⚠️ Les logs utilisent `console.warn` pour être facilement identifiables dans les logs de production
- ⚠️ Le `userId` peut être `'unknown'` si la session n'est pas disponible (ne devrait pas arriver en production)
- ⚠️ Ne pas supprimer ces routes sans vérification préalable via monitoring
- ✅ La route `GET /api/templates` n'est **pas** marquée LEGACY car elle est encore utilisée par le frontend

## Prochaines étapes

1. ✅ Monitoring implémenté
2. ⏳ Attendre 4-6 semaines de collecte de données
3. ⏳ Analyser les logs pour identifier les utilisateurs
4. ⏳ Décider de la suppression basée sur les données

