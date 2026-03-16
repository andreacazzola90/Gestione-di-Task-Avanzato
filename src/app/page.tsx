"use client";

import { TaskCard } from "@/components/task-card";
import { useTasks } from "@/hooks/useTasks";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const [open, setOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const {
    tasks,
    isLoading,
    isMutating,
    error,
    reloadTasks,
    createTask,
    updateTask,
    advanceTaskState,
    deleteTask,
  } = useTasks();

  const handleCreateTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const wasCreated = await createTask(newTaskTitle, newTaskDescription);

    if (wasCreated) {
      setNewTaskTitle("");
      setNewTaskDescription("");
      setOpen(false);
      toast.success("Task creato correttamente");
      return;
    }

    toast.error("Impossibile creare il task");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-zinc-50 px-6 py-12 text-zinc-900 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Task caricati</h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button">
                <Plus />
                Aggiungi task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuovo task</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-title" className="text-sm font-medium">
                    Titolo <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="task-title"
                    type="text"
                    value={newTaskTitle}
                    onChange={(event) => {
                      setNewTaskTitle(event.target.value);
                    }}
                    placeholder="Titolo del task"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-description"
                    className="text-sm font-medium"
                  >
                    Descrizione
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (opzionale)
                    </span>
                  </label>
                  <Textarea
                    id="task-description"
                    value={newTaskDescription}
                    onChange={(event) => {
                      setNewTaskDescription(event.target.value);
                    }}
                    placeholder="Aggiungi una descrizione..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={isMutating || isLoading}>
                    Aggiungi
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void reloadTasks();
            }}
            disabled={isMutating}
          >
            Ricarica
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-zinc-600">Caricamento task in corso...</p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>Errore durante il caricamento</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !error && tasks.length === 0 ? (
        <p className="text-zinc-600">Nessun task disponibile.</p>
      ) : null}

      {!isLoading && !error && tasks.length > 0 ? (
        <ul className="space-y-3">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskCard
                task={task}
                isMutating={isMutating}
                onAdvanceTaskState={advanceTaskState}
                onDeleteTask={deleteTask}
                onEditTask={updateTask}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
