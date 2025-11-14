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

export type Template = {
  id: string;
  title: string;
  slug: string;
  content: string; // markdown
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  org_id?: string;
};

export type Session = {
  user: User;
  orgId?: string;
} | null;



