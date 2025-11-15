// Domain types for clients, offers, templates

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ClientWithOffersCount = Client & {
  offersCount?: number;
};

export type Offer = {
  id: string;
  client_id: string;
  template_id: string | null;
  title: string;
  items: OfferItem[];
  subtotal: number; // in centimes
  tax_rate: number; // 0-100
  tax_amount: number; // in centimes
  total: number; // in centimes
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type OfferItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number; // in centimes
  total: number; // in centimes
};

export type TemplateKind =
  | "GENERIC"
  | "CDI_CADRE"
  | "CDD_SAISONNIER"
  | "AVENANT_TEMPS_PARTIEL"
  | "PROMESSE_EMBAUCHE";

export type Template = {
  id: string;
  title: string;
  slug: string;
  content: string; // JSON stringifié : {"version": 1, "fields": TemplateField[]}
  template_kind: TemplateKind;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

/**
 * Rôle utilisateur simple pour le contrôle d'accès
 * 
 * - ADMIN : Accès complet, peut modifier les templates
 * - USER : Accès en lecture seule, ne peut pas modifier les templates
 */
export type Role = "ADMIN" | "USER";

export type User = {
  id: string;
  email: string;
  org_id?: string;
  role?: Role;
};

export type Session = {
  user: User;
  orgId?: string;
} | null;



