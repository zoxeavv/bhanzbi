import type { TemplateKind } from '@/types/domain';

/**
 * Configuration métier pour un type de template
 * 
 * Cette configuration centralise :
 * - Les métadonnées du type (label, description)
 * - Le mapping des placeholders .docx vers les business keys
 * - Les validations métier spécifiques au type
 */
export type TemplateBusinessConfig = {
  /**
   * Label affiché pour ce type de template
   */
  label: string;

  /**
   * Description optionnelle du type de template
   */
  description?: string;

  /**
   * Mapping des placeholders .docx vers les business keys
   * 
   * Exemple :
   * {
   *   "{{nom_salarie}}": { businessKey: "employee.name", required: true },
   *   "{{date_embauche}}": { businessKey: "offer.startDate", required: true },
   * }
   */
  placeholders?: Record<
    string, // placeholder brut, ex: "{{nom_salarie}}"
    {
      businessKey: string; // clé métier, ex: "employee.name", "offer.positionTitle"
      required: boolean; // si le placeholder est obligatoire
    }
  >;

  /**
   * Fonction de validation métier spécifique au type
   * 
   * @param data - Les données à valider (structure dépend du type)
   * @returns Résultat de validation avec éventuelles erreurs
   */
  validateOfferInput?: (data: unknown) => {
    ok: boolean;
    errors?: string[];
  };
};

/**
 * Configuration métier pour tous les types de templates
 * 
 * Chaque TemplateKind doit avoir une entrée ici.
 * Si un kind n'est pas trouvé, on utilise GENERIC comme fallback.
 */
export const templateConfigs: Record<TemplateKind, TemplateBusinessConfig> = {
  GENERIC: {
    label: 'Template générique',
    description: 'Template générique sans règles métier spécifiques',
    placeholders: {},
    validateOfferInput: (data: unknown) => {
      // Validation générique basique
      if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Les données doivent être un objet'] };
      }
      return { ok: true };
    },
  },

  CDI_CADRE: {
    label: 'CDI Cadre',
    description: 'Contrat à durée indéterminée pour un poste cadre',
    placeholders: {
      '{{nom_salarie}}': {
        businessKey: 'employee.name',
        required: true,
      },
      '{{prenom_salarie}}': {
        businessKey: 'employee.firstName',
        required: true,
      },
      '{{poste}}': {
        businessKey: 'offer.positionTitle',
        required: true,
      },
      '{{date_embauche}}': {
        businessKey: 'offer.startDate',
        required: true,
      },
      '{{salaire_brut}}': {
        businessKey: 'offer.salary.gross',
        required: true,
      },
      '{{salaire_net}}': {
        businessKey: 'offer.salary.net',
        required: false,
      },
      '{{adresse_travail}}': {
        businessKey: 'offer.workAddress',
        required: false,
      },
    },
    validateOfferInput: (data: unknown) => {
      const errors: string[] = [];

      if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Les données doivent être un objet'] };
      }

      const d = data as Record<string, unknown>;

      // Validation spécifique CDI Cadre
      if (!d.employee || typeof d.employee !== 'object') {
        errors.push('Les informations employé sont requises');
      } else {
        const employee = d.employee as Record<string, unknown>;
        if (!employee.name || typeof employee.name !== 'string') {
          errors.push('Le nom de l\'employé est requis');
        }
        if (!employee.firstName || typeof employee.firstName !== 'string') {
          errors.push('Le prénom de l\'employé est requis');
        }
      }

      if (!d.offer || typeof d.offer !== 'object') {
        errors.push('Les informations d\'offre sont requises');
      } else {
        const offer = d.offer as Record<string, unknown>;
        if (!offer.positionTitle || typeof offer.positionTitle !== 'string') {
          errors.push('Le titre du poste est requis');
        }
        if (!offer.startDate || typeof offer.startDate !== 'string') {
          errors.push('La date d\'embauche est requise');
        }
        if (!offer.salary || typeof offer.salary !== 'object') {
          errors.push('Les informations de salaire sont requises');
        } else {
          const salary = offer.salary as Record<string, unknown>;
          if (!salary.gross || typeof salary.gross !== 'number') {
            errors.push('Le salaire brut est requis');
          }
        }
      }

      return {
        ok: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  },

  CDD_SAISONNIER: {
    label: 'CDD Saisonnier',
    description: 'Contrat à durée déterminée pour un emploi saisonnier',
    placeholders: {
      '{{nom_salarie}}': {
        businessKey: 'employee.name',
        required: true,
      },
      '{{prenom_salarie}}': {
        businessKey: 'employee.firstName',
        required: true,
      },
      '{{poste}}': {
        businessKey: 'offer.positionTitle',
        required: true,
      },
      '{{date_debut}}': {
        businessKey: 'offer.startDate',
        required: true,
      },
      '{{date_fin}}': {
        businessKey: 'offer.endDate',
        required: true,
      },
      '{{salaire_horaire}}': {
        businessKey: 'offer.hourlyRate',
        required: true,
      },
      '{{heures_semaine}}': {
        businessKey: 'offer.hoursPerWeek',
        required: false,
      },
      '{{saison}}': {
        businessKey: 'offer.season',
        required: true,
      },
    },
    validateOfferInput: (data: unknown) => {
      const errors: string[] = [];

      if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Les données doivent être un objet'] };
      }

      const d = data as Record<string, unknown>;

      // Validation spécifique CDD Saisonnier
      if (!d.employee || typeof d.employee !== 'object') {
        errors.push('Les informations employé sont requises');
      } else {
        const employee = d.employee as Record<string, unknown>;
        if (!employee.name || typeof employee.name !== 'string') {
          errors.push('Le nom de l\'employé est requis');
        }
        if (!employee.firstName || typeof employee.firstName !== 'string') {
          errors.push('Le prénom de l\'employé est requis');
        }
      }

      if (!d.offer || typeof d.offer !== 'object') {
        errors.push('Les informations d\'offre sont requises');
      } else {
        const offer = d.offer as Record<string, unknown>;
        if (!offer.positionTitle || typeof offer.positionTitle !== 'string') {
          errors.push('Le titre du poste est requis');
        }
        if (!offer.startDate || typeof offer.startDate !== 'string') {
          errors.push('La date de début est requise');
        }
        if (!offer.endDate || typeof offer.endDate !== 'string') {
          errors.push('La date de fin est requise');
        }
        if (!offer.hourlyRate || typeof offer.hourlyRate !== 'number') {
          errors.push('Le salaire horaire est requis');
        }
        if (!offer.season || typeof offer.season !== 'string') {
          errors.push('La saison est requise');
        }
      }

      return {
        ok: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  },

  AVENANT_TEMPS_PARTIEL: {
    label: 'Avenant Temps Partiel',
    description: 'Avenant pour modifier un contrat en temps partiel',
    placeholders: {
      '{{nom_salarie}}': {
        businessKey: 'employee.name',
        required: true,
      },
      '{{date_effet}}': {
        businessKey: 'amendment.effectiveDate',
        required: true,
      },
      '{{nouveau_temps_travail}}': {
        businessKey: 'amendment.newWorkTime',
        required: true,
      },
      '{{ancien_temps_travail}}': {
        businessKey: 'amendment.previousWorkTime',
        required: false,
      },
    },
    validateOfferInput: (data: unknown) => {
      const errors: string[] = [];

      if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Les données doivent être un objet'] };
      }

      const d = data as Record<string, unknown>;

      if (!d.employee || typeof d.employee !== 'object') {
        errors.push('Les informations employé sont requises');
      } else {
        const employee = d.employee as Record<string, unknown>;
        if (!employee.name || typeof employee.name !== 'string') {
          errors.push('Le nom de l\'employé est requis');
        }
      }

      if (!d.amendment || typeof d.amendment !== 'object') {
        errors.push('Les informations d\'avenant sont requises');
      } else {
        const amendment = d.amendment as Record<string, unknown>;
        if (!amendment.effectiveDate || typeof amendment.effectiveDate !== 'string') {
          errors.push('La date d\'effet est requise');
        }
        if (!amendment.newWorkTime || typeof amendment.newWorkTime !== 'string') {
          errors.push('Le nouveau temps de travail est requis');
        }
      }

      return {
        ok: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  },

  PROMESSE_EMBAUCHE: {
    label: 'Promesse d\'embauche',
    description: 'Promesse d\'embauche avant signature du contrat définitif',
    placeholders: {
      '{{nom_salarie}}': {
        businessKey: 'employee.name',
        required: true,
      },
      '{{prenom_salarie}}': {
        businessKey: 'employee.firstName',
        required: true,
      },
      '{{poste}}': {
        businessKey: 'offer.positionTitle',
        required: true,
      },
      '{{date_embauche_prevue}}': {
        businessKey: 'offer.expectedStartDate',
        required: true,
      },
      '{{salaire_brut}}': {
        businessKey: 'offer.salary.gross',
        required: true,
      },
    },
    validateOfferInput: (data: unknown) => {
      const errors: string[] = [];

      if (!data || typeof data !== 'object') {
        return { ok: false, errors: ['Les données doivent être un objet'] };
      }

      const d = data as Record<string, unknown>;

      if (!d.employee || typeof d.employee !== 'object') {
        errors.push('Les informations employé sont requises');
      } else {
        const employee = d.employee as Record<string, unknown>;
        if (!employee.name || typeof employee.name !== 'string') {
          errors.push('Le nom de l\'employé est requis');
        }
        if (!employee.firstName || typeof employee.firstName !== 'string') {
          errors.push('Le prénom de l\'employé est requis');
        }
      }

      if (!d.offer || typeof d.offer !== 'object') {
        errors.push('Les informations d\'offre sont requises');
      } else {
        const offer = d.offer as Record<string, unknown>;
        if (!offer.positionTitle || typeof offer.positionTitle !== 'string') {
          errors.push('Le titre du poste est requis');
        }
        if (!offer.expectedStartDate || typeof offer.expectedStartDate !== 'string') {
          errors.push('La date d\'embauche prévue est requise');
        }
        if (!offer.salary || typeof offer.salary !== 'object') {
          errors.push('Les informations de salaire sont requises');
        } else {
          const salary = offer.salary as Record<string, unknown>;
          if (!salary.gross || typeof salary.gross !== 'number') {
            errors.push('Le salaire brut est requis');
          }
        }
      }

      return {
        ok: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    },
  },
};

/**
 * Récupère la configuration métier pour un type de template
 * 
 * @param kind - Le type de template
 * @returns La configuration métier, ou GENERIC si le kind n'existe pas
 * 
 * @example
 * ```ts
 * const config = getTemplateConfig('CDI_CADRE');
 * console.log(config.label); // "CDI Cadre"
 * ```
 */
export function getTemplateConfig(kind: TemplateKind): TemplateBusinessConfig {
  return templateConfigs[kind] ?? templateConfigs.GENERIC;
}

/**
 * Vérifie si un type de template a une configuration spécifique
 * 
 * @param kind - Le type de template
 * @returns true si le kind existe dans templateConfigs, false sinon
 */
export function hasTemplateConfig(kind: TemplateKind): boolean {
  return kind in templateConfigs;
}

/**
 * Liste tous les placeholders requis pour un type de template
 * 
 * @param kind - Le type de template
 * @returns Tableau des placeholders requis
 */
export function getRequiredPlaceholders(kind: TemplateKind): string[] {
  const config = getTemplateConfig(kind);
  if (!config.placeholders) {
    return [];
  }

  return Object.entries(config.placeholders)
    .filter(([, value]) => value.required)
    .map(([key]) => key);
}

/**
 * Liste tous les placeholders pour un type de template
 * 
 * @param kind - Le type de template
 * @returns Tableau de tous les placeholders avec leurs business keys
 */
export function getAllPlaceholders(kind: TemplateKind): Array<{
  placeholder: string;
  businessKey: string;
  required: boolean;
}> {
  const config = getTemplateConfig(kind);
  if (!config.placeholders) {
    return [];
  }

  return Object.entries(config.placeholders).map(([placeholder, value]) => ({
    placeholder,
    businessKey: value.businessKey,
    required: value.required,
  }));
}


