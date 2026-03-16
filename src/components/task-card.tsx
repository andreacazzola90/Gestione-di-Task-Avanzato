"use client";

import { Badge } from "@/components/ui/badge";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

type TaskCardProps = {
  task: Task;
  isMutating: boolean;
  onAdvanceTaskState: (id: string) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
  onEditTask: (
    id: string,
    title: string,
    description?: string,
  ) => Promise<boolean>;
};

export function TaskCard({
  task,
  isMutating,
  onAdvanceTaskState,
  onDeleteTask,
  onEditTask,
}: TaskCardProps) {
  const stateLabels: Record<TaskState, string> = {
    "To do": "To do",
    "in progress": "In progress",
    completed: "Completed",
  };

  const stateFlow: TaskState[] = ["To do", "in progress", "completed"];
  const currentStateIndex = stateFlow.indexOf(task.state);
  const nextState =
    stateFlow[
      currentStateIndex >= 0 ? (currentStateIndex + 1) % stateFlow.length : 0
    ];

  const createdAtText = new Date(task.createdAt).toLocaleString("it-IT");
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(
    task.description ?? "",
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-left text-base font-semibold underline-offset-4 hover:underline"
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
        <Badge variant={task.state === "completed" ? "secondary" : "outline"}>
          {stateLabels[task.state]}
        </Badge>
      </CardHeader>
      <CardContent>
        {task.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {task.description}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-muted-foreground">
          Creato il {createdAtText}
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTitle(task.title);
              setEditDescription(task.description ?? "");
              setEditOpen(true);
            }}
            disabled={isMutating}
          >
            Modifica
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void (async () => {
                const wasUpdated = await onAdvanceTaskState(task.id);

                if (wasUpdated) {
                  toast.success("Stato task aggiornato");
                  return;
                }

                toast.error("Impossibile aggiornare il task");
              })();
            }}
            disabled={isMutating}
          >
            {`Passa a ${stateLabels[nextState]}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const isConfirmed = window.confirm(
                `Sei sicuro di voler eliminare il task \"${task.title}\"?`,
              );

              if (!isConfirmed) {
                return;
              }

              void (async () => {
                const wasDeleted = await onDeleteTask(task.id);

                if (wasDeleted) {
                  toast.success("Task eliminato");
                  return;
                }

                toast.error("Impossibile eliminare il task");
              })();
            }}
            disabled={isMutating}
          >
            <Trash2 className="h-4 w-4" />
            Elimina
          </Button>
        </div>
      </CardContent>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica task</DialogTitle>
            <DialogDescription>
              Aggiorna il titolo e la descrizione del task.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void (async () => {
                const wasUpdated = await onEditTask(
                  task.id,
                  editTitle,
                  editDescription,
                );
                if (wasUpdated) {
                  setEditOpen(false);
                  toast.success("Task aggiornato correttamente");
                  return;
                }
                toast.error("Impossibile aggiornare il task");
              })();
            }}
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Titolo del task"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`edit-desc-${task.id}`}
                className="text-sm font-medium"
              >
                Descrizione
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (opzionale)
                </span>
              </label>
              <Textarea
                id={`edit-desc-${task.id}`}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Aggiungi una descrizione..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isMutating}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={isMutating || !editTitle.trim()}>
                Salva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
