"use client";

import { TaskCard } from "@/components/task-card";
import { useTasks } from "@/hooks/useTasks";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Il titolo e obbligatorio"),
  description: z.string().trim().min(1, "La descrizione e obbligatoria"),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export default function Home() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: createErrors, isSubmitting: isSubmittingCreate },
  } = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

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

  const handleCreateTask = async (values: CreateTaskFormValues) => {
    const wasCreated = await createTask(values.title, values.description);

    if (wasCreated) {
      reset();
      setOpen(false);
      toast.success("Task creato correttamente");
      return;
    }

    toast.error("Impossibile creare il task");
  };

  const handleCreateDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      reset();
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 bg-zinc-50 px-6 py-12 text-zinc-900 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Task caricati</h1>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={handleCreateDialogChange}>
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
              <form
                onSubmit={handleSubmit(handleCreateTask)}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="task-title" className="text-sm font-medium">
                    Titolo <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="task-title"
                    type="text"
                    aria-invalid={Boolean(createErrors.title)}
                    {...register("title")}
                    placeholder="Titolo del task"
                    autoFocus
                  />
                  {createErrors.title ? (
                    <p className="text-sm text-destructive">
                      {createErrors.title.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="task-description"
                    className="text-sm font-medium"
                  >
                    Descrizione <span className="text-destructive">*</span>
                  </label>
                  <Textarea
                    id="task-description"
                    aria-invalid={Boolean(createErrors.description)}
                    {...register("description")}
                    placeholder="Aggiungi una descrizione..."
                    rows={3}
                  />
                  {createErrors.description ? (
                    <p className="text-sm text-destructive">
                      {createErrors.description.message}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateDialogChange(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={isMutating || isLoading || isSubmittingCreate}
                  >
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
