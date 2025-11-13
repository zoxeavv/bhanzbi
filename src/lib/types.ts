export type Client = {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  secteur: string
  created_at: string
}

export type Template = {
  id: string
  name: string
  file_path: string
  mapping_json: FieldMapping[]
  preview_path: string
  created_at: string
}

export type FieldMapping = {
  field_name: string
  field_type: "text" | "number" | "date" | "select"
  placeholder?: string
  options?: string[]
}

export type Offre = {
  id: string
  template_id: string
  client_id: string
  status: "draft" | "validated" | "downloaded"
  data: Record<string, any>
  created_at: string
  updated_at: string
}

export type OffreVersion = {
  id: string
  offre_id: string
  version_number: number
  data_json: Record<string, any>
  pdf_path?: string
  created_at: string
  created_by?: string
}

export type Event = {
  id: string
  entity: string
  action: string
  payload: Record<string, any>
  user_id?: string
  created_at: string
}
