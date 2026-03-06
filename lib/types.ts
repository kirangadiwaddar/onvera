export type FieldType =
  | "upload"
  | "url"
  | "text"
  | "textarea"

export interface SectionItem {
  id: string
  label: string
  fieldType: FieldType
}

export interface Section {
  id: string
  title: string
  items: SectionItem[]
  dynamic?: boolean
  fieldType?: FieldType
}