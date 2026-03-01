import templatesData from "@/src/mocks/data/templates.json";

export function getTemplateMap() {
  return templatesData.templates.reduce((acc: Record<string, string>, template) => {
    acc[template.id] = template.title;
    return acc;
  }, {});
}