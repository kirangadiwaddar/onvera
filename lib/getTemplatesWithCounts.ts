import templatesData from "@/src/mocks/data/templates.json";
import projectsData from "@/src/mocks/data/projects.json";

export function getTemplatesWithCounts() {
  const projectCountMap = projectsData.projects.reduce(
    (acc: Record<string, number>, project) => {
      acc[project.templateId] = (acc[project.templateId] || 0) + 1;
      return acc;
    },
    {}
  );

  return templatesData.templates.map((template) => ({
    ...template,
    projectsCreated: projectCountMap[template.id] || 0,
  }));
}