"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Task, TaskState } from "@/app/definitions";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const editTaskSchema = z.object({
  title: z.string().trim().min(1, "Il titolo e obbligatorio"),
  description: z.string().trim().min(1, "La descrizione e obbligatoria"),
});

type EditTaskFormValues = z.infer<typeof editTaskSchema>;

type TaskCardProps = {
  task: Task;
  compact?: boolean;
  isMutating: boolean;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: (task: Task) => void;
  onDragEnd?: () => void;
  onUpdateTaskState: (id: string, state: TaskState) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onEditTask: (
    id: string,
    title: string,
    description: string,
  ) => Promise<boolean>;
};

export function TaskCard({
  task,
  compact = false,
  isMutating,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onUpdateTaskState,
  onDeleteTask,
  onEditTask,
}: TaskCardProps) {
  const stateLabels: Record<TaskState, string> = {
    "To do": "To do",
    "in progress": "In progress",
    completed: "Completed",
  };

  const createdAtText = new Date(task.createdAt).toLocaleString("it-IT");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: editErrors, isSubmitting: isSubmittingEdit },
  } = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
    },
  });

  const handleEditDialogChange = (isOpen: boolean) => {
    setEditOpen(isOpen);

    if (!isOpen) {
      reset({
        title: task.title,
        description: task.description ?? "",
      });
    }
  };

  const handleEditTask = async (values: EditTaskFormValues) => {
    const wasUpdated = await onEditTask(
      task.id,
      values.title,
      values.description,
    );
    if (wasUpdated) {
      setEditOpen(false);
      toast.success("Task aggiornato correttamente");
      return;
    }
    toast.error("Impossibile aggiornare il task");
  };

  return (
    <Card
      className={`border-zinc-200/80 bg-white transition-opacity ${compact ? "gap-3 py-4" : ""} ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      draggable={draggable && !isMutating}
      onDragStart={() => onDragStart?.(task)}
      onDragEnd={() => onDragEnd?.()}
      data-task-id={task.id}
    >
      <CardHeader
        className={`flex flex-row items-start justify-between gap-3 ${
          compact ? "px-4" : ""
        }`}
      >
        {draggable ? (
          <div className="flex items-center gap-2 text-zinc-400">
            <GripVertical className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Drag task</span>
          </div>
        ) : null}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className={`text-left font-semibold underline-offset-4 hover:underline ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              <CardTitle>{task.title}</CardTitle>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettaglio task</DialogTitle>
              <DialogDescription>
                Informazioni dettagliate del task selezionato.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">ID:</span> {task.id}
              </p>
              <p>
                <span className="font-medium">Titolo:</span> {task.title}
              </p>
              {task.description ? (
                <div>
                  <p className="font-medium">Descrizione:</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {task.description}
                  </p>
                </div>
              ) : null}
              <p>
                <span className="font-medium">Stato:</span>{" "}
                {stateLabels[task.state]}
              </p>
              <p>
                <span className="font-medium">Creato il:</span> {createdAtText}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <div className="flex items-center gap-2">
          <label htmlFor={`task-state-${task.id}`} className="sr-only">
            Stato task
          </label>
          <select
            id={`task-state-${task.id}`}
            value={task.state}
            className={`rounded-lg border border-dashed border-zinc-200 bg-white px-2 text-xs ${
              compact ? "h-6" : "h-7"
            }`}
            onChange={(event) => {
              const nextState = event.target.value as TaskState;

              void (async () => {
                const wasUpdated = await onUpdateTaskState(task.id, nextState);

                if (wasUpdated) {
                  toast.success("Stato task aggiornato");
                  return;
                }

                toast.error("Impossibile aggiornare il task");
              })();
            }}
            disabled={isMutating}
          >
            <option value="To do">To do</option>
            <option value="in progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-4" : undefined}>
        {task.description ? (
          <p
            className={`text-muted-foreground ${
              compact ? "line-clamp-1 text-xs" : "line-clamp-2 text-sm"
            }`}
          >
            {task.description}
          </p>
        ) : null}
        <p
          className={`text-muted-foreground ${
            compact ? "mt-1 text-xs" : "mt-2 text-sm"
          }`}
        >
          Creato il {createdAtText}
        </p>
        <div className={`flex gap-2 ${compact ? "mt-2" : "mt-4"}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              reset({
                title: task.title,
                description: task.description ?? "",
              });
              setEditOpen(true);
            }}
            disabled={isMutating}
          >
            <Pencil className="h-4 w-4" />
            Modifica
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            disabled={isMutating}
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </Button>
        </div>
      </CardContent>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina task</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il task &ldquo;{task.title}&rdquo;?
              L&apos;operazione non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={isMutating}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => {
                void (async () => {
                  const wasDeleted = await onDeleteTask(task.id);
                  setDeleteOpen(false);
                  if (wasDeleted) {
                    toast.success("Task eliminato");
                  } else {
                    toast.error("Impossibile eliminare il task");
                  }
                })();
              }}
            >
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica task</DialogTitle>
            <DialogDescription>
              Aggiorna il titolo e la descrizione del task.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(handleEditTask)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`edit-title-${task.id}`}
                className="text-sm font-medium"
              >
                Titolo <span className="text-destructive">*</span>
              </label>
              <Input
                id={`edit-title-${task.id}`}
                type="text"
                aria-invalid={Boolean(editErrors.title)}
                {...register("title")}
                placeholder="Titolo del task"
                autoFocus
              />
              {editErrors.title ? (
                <p className="text-sm text-destructive">
                  {editErrors.title.message}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`edit-desc-${task.id}`}
                className="text-sm font-medium"
              >
                Descrizione <span className="text-destructive">*</span>
              </label>
              <Textarea
                id={`edit-desc-${task.id}`}
                aria-invalid={Boolean(editErrors.description)}
                {...register("description")}
                placeholder="Aggiungi una descrizione..."
                rows={3}
              />
              {editErrors.description ? (
                <p className="text-sm text-destructive">
                  {editErrors.description.message}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleEditDialogChange(false)}
                disabled={isMutating}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                variant="outline"
                disabled={isMutating || isSubmittingEdit}
              >
                Salva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
