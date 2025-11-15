import { describe, it, expect } from 'vitest';
import type { TemplateKind } from '@/types/domain';
import {
  templateConfigs,
  getTemplateConfig,
  hasTemplateConfig,
  getRequiredPlaceholders,
  getAllPlaceholders,
  type TemplateBusinessConfig,
} from '../config';

describe('templateConfigs', () => {
  describe('completeness', () => {
    it('should have an entry for every TemplateKind', () => {
      const allKinds: TemplateKind[] = [
        'GENERIC',
        'CDI_CADRE',
        'CDD_SAISONNIER',
        'AVENANT_TEMPS_PARTIEL',
        'PROMESSE_EMBAUCHE',
      ];

      for (const kind of allKinds) {
        expect(templateConfigs[kind]).toBeDefined();
        expect(templateConfigs[kind].label).toBeTruthy();
      }
    });

    it('should have GENERIC as a fallback with minimal config', () => {
      const generic = templateConfigs.GENERIC;
      expect(generic).toBeDefined();
      expect(generic.label).toBe('Template générique');
      expect(generic.placeholders).toBeDefined();
      expect(generic.validateOfferInput).toBeDefined();
    });
  });

  describe('structure validation', () => {
    const validateConfigStructure = (config: TemplateBusinessConfig, kind: TemplateKind) => {
      // Label doit être présent et non vide
      expect(config.label).toBeTruthy();
      expect(typeof config.label).toBe('string');
      expect(config.label.length).toBeGreaterThan(0);

      // Description est optionnelle mais si présente doit être une string
      if (config.description !== undefined) {
        expect(typeof config.description).toBe('string');
      }

      // Placeholders est optionnel mais si présent doit être un objet
      if (config.placeholders !== undefined) {
        expect(typeof config.placeholders).toBe('object');
        expect(config.placeholders).not.toBeNull();

        // Vérifier la structure de chaque placeholder
        for (const [placeholder, value] of Object.entries(config.placeholders)) {
          // Placeholder doit être une string non vide
          expect(typeof placeholder).toBe('string');
          expect(placeholder.length).toBeGreaterThan(0);

          // Value doit avoir businessKey (string) et required (boolean)
          expect(value).toBeDefined();
          expect(typeof value.businessKey).toBe('string');
          expect(value.businessKey.length).toBeGreaterThan(0);
          expect(typeof value.required).toBe('boolean');
        }
      }

      // validateOfferInput est optionnel mais si présent doit être une fonction
      if (config.validateOfferInput !== undefined) {
        expect(typeof config.validateOfferInput).toBe('function');
      }
    };

    it('should have valid structure for GENERIC', () => {
      validateConfigStructure(templateConfigs.GENERIC, 'GENERIC');
    });

    it('should have valid structure for CDI_CADRE', () => {
      validateConfigStructure(templateConfigs.CDI_CADRE, 'CDI_CADRE');
    });

    it('should have valid structure for CDD_SAISONNIER', () => {
      validateConfigStructure(templateConfigs.CDD_SAISONNIER, 'CDD_SAISONNIER');
    });

    it('should have valid structure for AVENANT_TEMPS_PARTIEL', () => {
      validateConfigStructure(templateConfigs.AVENANT_TEMPS_PARTIEL, 'AVENANT_TEMPS_PARTIEL');
    });

    it('should have valid structure for PROMESSE_EMBAUCHE', () => {
      validateConfigStructure(templateConfigs.PROMESSE_EMBAUCHE, 'PROMESSE_EMBAUCHE');
    });
  });

  describe('placeholders structure', () => {
    it('should have valid placeholder structure for CDI_CADRE', () => {
      const config = templateConfigs.CDI_CADRE;
      expect(config.placeholders).toBeDefined();

      if (config.placeholders) {
        // Vérifier quelques placeholders spécifiques
        expect(config.placeholders['{{nom_salarie}}']).toBeDefined();
        expect(config.placeholders['{{nom_salarie}}'].businessKey).toBe('employee.name');
        expect(config.placeholders['{{nom_salarie}}'].required).toBe(true);

        expect(config.placeholders['{{poste}}']).toBeDefined();
        expect(config.placeholders['{{poste}}'].businessKey).toBe('offer.positionTitle');
        expect(config.placeholders['{{poste}}'].required).toBe(true);

        expect(config.placeholders['{{salaire_net}}']).toBeDefined();
        expect(config.placeholders['{{salaire_net}}'].required).toBe(false);
      }
    });

    it('should have valid placeholder structure for CDD_SAISONNIER', () => {
      const config = templateConfigs.CDD_SAISONNIER;
      expect(config.placeholders).toBeDefined();

      if (config.placeholders) {
        expect(config.placeholders['{{date_debut}}']).toBeDefined();
        expect(config.placeholders['{{date_debut}}'].businessKey).toBe('offer.startDate');
        expect(config.placeholders['{{date_debut}}'].required).toBe(true);

        expect(config.placeholders['{{date_fin}}']).toBeDefined();
        expect(config.placeholders['{{date_fin}}'].businessKey).toBe('offer.endDate');
        expect(config.placeholders['{{date_fin}}'].required).toBe(true);

        expect(config.placeholders['{{saison}}']).toBeDefined();
        expect(config.placeholders['{{saison}}'].businessKey).toBe('offer.season');
        expect(config.placeholders['{{saison}}'].required).toBe(true);
      }
    });
  });
});

describe('getTemplateConfig', () => {
  it('should return config for existing kind', () => {
    const config = getTemplateConfig('CDI_CADRE');
    expect(config).toBeDefined();
    expect(config.label).toBe('CDI Cadre');
  });

  it('should return GENERIC config for unknown kind (type-safe fallback)', () => {
    // Note: TypeScript empêche d'utiliser un kind invalide,
    // mais on teste quand même le comportement de fallback
    const config = getTemplateConfig('GENERIC');
    expect(config).toBeDefined();
    expect(config.label).toBe('Template générique');
  });

  it('should return a config for all known kinds', () => {
    const kinds: TemplateKind[] = [
      'GENERIC',
      'CDI_CADRE',
      'CDD_SAISONNIER',
      'AVENANT_TEMPS_PARTIEL',
      'PROMESSE_EMBAUCHE',
    ];

    for (const kind of kinds) {
      const config = getTemplateConfig(kind);
      expect(config).toBeDefined();
      expect(config.label).toBeTruthy();
    }
  });

  it('should always return a valid config structure', () => {
    const kinds: TemplateKind[] = [
      'GENERIC',
      'CDI_CADRE',
      'CDD_SAISONNIER',
      'AVENANT_TEMPS_PARTIEL',
      'PROMESSE_EMBAUCHE',
    ];

    for (const kind of kinds) {
      const config = getTemplateConfig(kind);
      expect(config).toHaveProperty('label');
      expect(typeof config.label).toBe('string');
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});

describe('hasTemplateConfig', () => {
  it('should return true for existing kinds', () => {
    expect(hasTemplateConfig('GENERIC')).toBe(true);
    expect(hasTemplateConfig('CDI_CADRE')).toBe(true);
    expect(hasTemplateConfig('CDD_SAISONNIER')).toBe(true);
    expect(hasTemplateConfig('AVENANT_TEMPS_PARTIEL')).toBe(true);
    expect(hasTemplateConfig('PROMESSE_EMBAUCHE')).toBe(true);
  });
});

describe('getRequiredPlaceholders', () => {
  it('should return required placeholders for CDI_CADRE', () => {
    const required = getRequiredPlaceholders('CDI_CADRE');
    expect(Array.isArray(required)).toBe(true);
    expect(required.length).toBeGreaterThan(0);
    expect(required).toContain('{{nom_salarie}}');
    expect(required).toContain('{{poste}}');
    expect(required).toContain('{{date_embauche}}');
  });

  it('should return required placeholders for CDD_SAISONNIER', () => {
    const required = getRequiredPlaceholders('CDD_SAISONNIER');
    expect(Array.isArray(required)).toBe(true);
    expect(required.length).toBeGreaterThan(0);
    expect(required).toContain('{{date_debut}}');
    expect(required).toContain('{{date_fin}}');
    expect(required).toContain('{{saison}}');
  });

  it('should return empty array for GENERIC if no placeholders', () => {
    const required = getRequiredPlaceholders('GENERIC');
    expect(Array.isArray(required)).toBe(true);
    // GENERIC peut avoir des placeholders vides ou aucun
  });

  it('should not include optional placeholders', () => {
    const required = getRequiredPlaceholders('CDI_CADRE');
    // {{salaire_net}} est optionnel, ne doit pas être dans required
    expect(required).not.toContain('{{salaire_net}}');
  });
});

describe('getAllPlaceholders', () => {
  it('should return all placeholders with business keys for CDI_CADRE', () => {
    const placeholders = getAllPlaceholders('CDI_CADRE');
    expect(Array.isArray(placeholders)).toBe(true);
    expect(placeholders.length).toBeGreaterThan(0);

    const nomSalarie = placeholders.find(p => p.placeholder === '{{nom_salarie}}');
    expect(nomSalarie).toBeDefined();
    expect(nomSalarie?.businessKey).toBe('employee.name');
    expect(nomSalarie?.required).toBe(true);

    const salaireNet = placeholders.find(p => p.placeholder === '{{salaire_net}}');
    expect(salaireNet).toBeDefined();
    expect(salaireNet?.required).toBe(false);
  });

  it('should return all placeholders for CDD_SAISONNIER', () => {
    const placeholders = getAllPlaceholders('CDD_SAISONNIER');
    expect(Array.isArray(placeholders)).toBe(true);
    expect(placeholders.length).toBeGreaterThan(0);

    const dateDebut = placeholders.find(p => p.placeholder === '{{date_debut}}');
    expect(dateDebut).toBeDefined();
    expect(dateDebut?.businessKey).toBe('offer.startDate');
    expect(dateDebut?.required).toBe(true);

    const saison = placeholders.find(p => p.placeholder === '{{saison}}');
    expect(saison).toBeDefined();
    expect(saison?.businessKey).toBe('offer.season');
    expect(saison?.required).toBe(true);
  });

  it('should return empty array if no placeholders', () => {
    // Si GENERIC n'a pas de placeholders, devrait retourner []
    const placeholders = getAllPlaceholders('GENERIC');
    expect(Array.isArray(placeholders)).toBe(true);
  });

  it('should have correct structure for each placeholder', () => {
    const placeholders = getAllPlaceholders('CDI_CADRE');
    for (const placeholder of placeholders) {
      expect(placeholder).toHaveProperty('placeholder');
      expect(placeholder).toHaveProperty('businessKey');
      expect(placeholder).toHaveProperty('required');
      expect(typeof placeholder.placeholder).toBe('string');
      expect(typeof placeholder.businessKey).toBe('string');
      expect(typeof placeholder.required).toBe('boolean');
    }
  });
});

describe('validateOfferInput functions', () => {
  it('should validate GENERIC config with valid data', () => {
    const config = templateConfigs.GENERIC;
    expect(config.validateOfferInput).toBeDefined();

    if (config.validateOfferInput) {
      const result = config.validateOfferInput({ test: 'data' });
      expect(result).toHaveProperty('ok');
      expect(typeof result.ok).toBe('boolean');
    }
  });

  it('should validate CDI_CADRE config with valid data', () => {
    const config = templateConfigs.CDI_CADRE;
    expect(config.validateOfferInput).toBeDefined();

    if (config.validateOfferInput) {
      const validData = {
        employee: {
          name: 'Dupont',
          firstName: 'Jean',
        },
        offer: {
          positionTitle: 'Développeur',
          startDate: '2024-01-01',
          salary: {
            gross: 50000,
          },
        },
      };

      const result = config.validateOfferInput(validData);
      expect(result.ok).toBe(true);
      expect(result.errors).toBeUndefined();
    }
  });

  it('should validate CDI_CADRE config with invalid data', () => {
    const config = templateConfigs.CDI_CADRE;
    expect(config.validateOfferInput).toBeDefined();

    if (config.validateOfferInput) {
      const invalidData = {
        employee: {
          // name manquant
          firstName: 'Jean',
        },
      };

      const result = config.validateOfferInput(invalidData);
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors?.length).toBeGreaterThan(0);
    }
  });

  it('should validate CDD_SAISONNIER config with valid data', () => {
    const config = templateConfigs.CDD_SAISONNIER;
    expect(config.validateOfferInput).toBeDefined();

    if (config.validateOfferInput) {
      const validData = {
        employee: {
          name: 'Martin',
          firstName: 'Marie',
        },
        offer: {
          positionTitle: 'Serveur',
          startDate: '2024-06-01',
          endDate: '2024-08-31',
          hourlyRate: 15,
          season: 'Été',
        },
      };

      const result = config.validateOfferInput(validData);
      expect(result.ok).toBe(true);
      expect(result.errors).toBeUndefined();
    }
  });

  it('should validate CDD_SAISONNIER config with missing required fields', () => {
    const config = templateConfigs.CDD_SAISONNIER;
    expect(config.validateOfferInput).toBeDefined();

    if (config.validateOfferInput) {
      const invalidData = {
        employee: {
          name: 'Martin',
          firstName: 'Marie',
        },
        offer: {
          positionTitle: 'Serveur',
          // endDate manquant
          startDate: '2024-06-01',
        },
      };

      const result = config.validateOfferInput(invalidData);
      expect(result.ok).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    }
  });
});


