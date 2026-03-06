export function getTemplateMap(
  templates: { id: string; title: string }[]
) {
  return templates.reduce((acc: Record<string, string>, template) => {
    acc[template.id] = template.title
    return acc
  }, {})
}