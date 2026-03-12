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
import type { Task } from "@/app/definitions";
import { toast } from "sonner";

type TaskCardProps = {
  task: Task;
  isMutating: boolean;
  onToggleTaskCompleted: (id: string) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
};

export function TaskCard({
  task,
  isMutating,
  onToggleTaskCompleted,
  onDeleteTask,
}: TaskCardProps) {
  const createdAtText = new Date(task.createdAt).toLocaleString("it-IT");

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
                {task.completed ? "Completato" : "Da fare"}
              </p>
              <p>
                <span className="font-medium">Creato il:</span> {createdAtText}
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Badge variant={task.completed ? "secondary" : "outline"}>
          {task.completed ? "Completato" : "Da fare"}
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
              void (async () => {
                const wasUpdated = await onToggleTaskCompleted(task.id);

                if (wasUpdated) {
                  toast.success("Stato task aggiornato");
                  return;
                }

                toast.error("Impossibile aggiornare il task");
              })();
            }}
            disabled={isMutating}
          >
            {task.completed ? "Segna da fare" : "Segna completato"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
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
            Elimina
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
