export type FieldType = "upload" | "url" | "text" | "textarea"

export type ItemType = "predefined" | "dynamic"

export interface ChecklistItem {
  id: string
  label: string
  type: ItemType
  fieldType: FieldType
}

export interface Section {
  id: string
  title: string
  items: ChecklistItem[]
  dynamic?: boolean
}