import { DeleteProjectDialog } from "./delete-project-dialog"
import { ProjectDialog } from "./project-dialog"

export function ProjectActions({
  project,
  editOpen,
  setEditOpen,
  deleteOpen,
  setDeleteOpen,
  onEdit,
  onDelete
}: any) {

  return (
    <>
      <ProjectDialog
        mode="edit"
        project={project}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setEditOpen(false)
          onEdit(updated)
        }}
      />

      <DeleteProjectDialog
        open={deleteOpen}
        setOpen={setDeleteOpen}
        projectId={project.id}
        projectTitle={project.title}
        onDeleted={() => {
          setDeleteOpen(false)
          onDelete?.(project.id)
        }}
      />
    </>
  )
}