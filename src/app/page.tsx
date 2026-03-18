"use client";

import { TaskCard } from "@/components/task-card";
import type { Task, TaskState } from "@/app/definitions";
import { useTasks } from "@/hooks/useTasks";
import {
  BarChart3,
  CircleAlert,
  Filter,
  KanbanSquare,
  LayoutDashboard,
  Pencil,
  Plus,
  Trash2,
  User2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const BOARD_COLUMNS: Array<{ state: TaskState; label: string }> = [
  { state: "To do", label: "To do" },
  { state: "in progress", label: "In progress" },
  { state: "completed", label: "Completed" },
];

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Il titolo e obbligatorio"),
  description: z.string().trim().min(1, "La descrizione e obbligatoria"),
});

type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

export default function Home() {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskState | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "board">("list");
  const [queryFilter, setQueryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | TaskState>("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "title" | "state">(
    "createdAt",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

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
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isSubmittingEdit },
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
    createTask,
    updateTask,
    setTaskState,
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

  const handleEditDialogChange = (isOpen: boolean) => {
    setEditOpen(isOpen);

    if (!isOpen) {
      setEditingTask(null);
      resetEdit({ title: "", description: "" });
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    resetEdit({
      title: task.title,
      description: task.description ?? "",
    });
    setEditOpen(true);
  };

  const handleEditTask = async (values: CreateTaskFormValues) => {
    if (!editingTask) {
      return;
    }

    const wasUpdated = await updateTask(
      editingTask.id,
      values.title,
      values.description,
    );

    if (wasUpdated) {
      toast.success("Task aggiornato correttamente");
      handleEditDialogChange(false);
      return;
    }

    toast.error("Impossibile aggiornare il task");
  };

  const todoColumn = tasks.filter((task) => task.state === "To do");
  const inProgressColumn = tasks.filter((task) => task.state === "in progress");
  const completedColumn = tasks.filter((task) => task.state === "completed");
  const boardColumns: Record<TaskState, Task[]> = {
    "To do": todoColumn,
    "in progress": inProgressColumn,
    completed: completedColumn,
  };
  const filteredListTasks = tasks
    .filter((task) => {
      const normalizedQueryFilter = queryFilter.trim().toLowerCase();
      const matchesQuery = normalizedQueryFilter
        ? task.title.toLowerCase().includes(normalizedQueryFilter) ||
          (task.description ?? "")
            .toLowerCase()
            .includes(normalizedQueryFilter) ||
          task.id.toLowerCase().includes(normalizedQueryFilter)
        : true;
      const matchesState =
        stateFilter === "all" ? true : task.state === stateFilter;

      return matchesQuery && matchesState;
    })
    .sort((left, right) => {
      let compareValue = 0;

      if (sortBy === "createdAt") {
        compareValue =
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime();
      }

      if (sortBy === "title") {
        compareValue = left.title.localeCompare(right.title, "it", {
          sensitivity: "base",
        });
      }

      if (sortBy === "state") {
        compareValue = left.state.localeCompare(right.state, "it", {
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? compareValue : -compareValue;
    });

  const handleBoardDragStart = (task: Task) => {
    setDraggedTaskId(task.id);
    setDragOverColumn(task.state);
  };

  const resetBoardDragState = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleBoardDrop = async (nextState: TaskState) => {
    const draggedTask = tasks.find((task) => task.id === draggedTaskId);

    if (!draggedTask) {
      resetBoardDragState();
      return;
    }

    if (draggedTask.state === nextState) {
      resetBoardDragState();
      return;
    }

    const wasUpdated = await setTaskState(draggedTask.id, nextState);

    if (wasUpdated) {
      toast.success(
        `Task spostato in ${BOARD_COLUMNS.find((column) => column.state === nextState)?.label}`,
      );
    } else {
      toast.error("Impossibile spostare il task");
    }

    resetBoardDragState();
  };

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-zinc-100 to-zinc-50 px-4 py-6 text-zinc-900 sm:px-6 lg:px-8">
      <Card className="sticky top-0 z-20 border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">Task Manager Dashboard</CardTitle>
          <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-zinc-100">
            <User2 className="h-5 w-5 text-zinc-600" />
          </div>
        </CardHeader>
      </Card>
      <div className="grid w-full gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-0 lg:h-screen">
          <Card className=" bg-white/90">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutDashboard className="h-4 w-4" />
                Workspace
              </CardTitle>
              <CardDescription>Navigazione dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant={viewMode === "list" ? "outline" : "ghost"}
                className="w-full justify-start"
                onClick={() => setViewMode("list")}
              >
                <BarChart3 className="h-4 w-4" />
                Vista lista
              </Button>
              <Button
                type="button"
                variant={viewMode === "board" ? "outline" : "ghost"}
                className="w-full justify-start"
                onClick={() => setViewMode("board")}
              >
                <KanbanSquare className="h-4 w-4" />
                Vista board
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <Card className="bg-white/90">
            <CardHeader className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <CardTitle>
                  {viewMode === "list"
                    ? "Vista lista task"
                    : "Vista board per stato"}
                </CardTitle>
                <CardDescription>
                  {viewMode === "list"
                    ? "Elenco filtrabile e ordinabile con card compatte per grandi volumi."
                    : "Task incolonnati per stato operativo, trascinabili tra le colonne."}
                </CardDescription>
              </div>
              <div>
                <Dialog open={open} onOpenChange={handleCreateDialogChange}>
                  <DialogTrigger asChild>
                    <Button type="button" className="w-full md:w-auto">
                      <Plus />
                      Aggiungi task
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nuovo task</DialogTitle>
                      <DialogDescription>
                        Inserisci titolo e descrizione per creare un nuovo task.
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={handleSubmit(handleCreateTask)}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="task-title"
                          className="text-sm font-medium"
                        >
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
                          Descrizione{" "}
                          <span className="text-destructive">*</span>
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
                          disabled={
                            isMutating || isLoading || isSubmittingCreate
                          }
                        >
                          Aggiungi
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "list" ? (
                <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="filter-tasks"
                      value={queryFilter}
                      onChange={(event) => setQueryFilter(event.target.value)}
                      placeholder="Filter tasks..."
                      className="h-11 max-w-md bg-white"
                    />
                    <select
                      id="filter-state"
                      className="h-11 rounded-lg border border-dashed border-zinc-300 bg-white px-3 text-sm"
                      value={stateFilter}
                      onChange={(event) =>
                        setStateFilter(event.target.value as "all" | TaskState)
                      }
                    >
                      <option value="all">+ Status</option>
                      <option value="To do">To do</option>
                      <option value="in progress">In progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="ml-auto flex items-center gap-2">
                      <Filter className="h-4 w-4 text-zinc-500" />
                      <select
                        id="sort-by"
                        className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                        value={sortBy}
                        onChange={(event) =>
                          setSortBy(
                            event.target.value as
                              | "createdAt"
                              | "title"
                              | "state",
                          )
                        }
                      >
                        <option value="createdAt">Ordina: Data</option>
                        <option value="title">Ordina: Titolo</option>
                        <option value="state">Ordina: Stato</option>
                      </select>
                      <select
                        id="sort-direction"
                        className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                        value={sortDirection}
                        onChange={(event) =>
                          setSortDirection(event.target.value as "asc" | "desc")
                        }
                      >
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setQueryFilter("");
                        setStateFilter("all");
                        setSortBy("createdAt");
                        setSortDirection("desc");
                      }}
                    >
                      Reset filtri
                    </Button>
                  </div>
                </div>
              ) : null}

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

              {!isLoading &&
              !error &&
              tasks.length > 0 &&
              viewMode === "list" &&
              filteredListTasks.length === 0 ? (
                <p className="text-zinc-600">
                  Nessun task corrisponde ai filtri selezionati.
                </p>
              ) : null}

              {!isLoading &&
              !error &&
              tasks.length > 0 &&
              viewMode === "list" ? (
                <ul className="overflow-hidden rounded-lg border bg-white">
                  <li className="hidden grid-cols-[44px_1fr_180px_130px] items-center gap-3 border-b bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-600 md:grid">
                    <div>
                      <input
                        type="checkbox"
                        aria-label="Seleziona tutti i task"
                      />
                    </div>
                    <p>Task</p>
                    <p>Stato</p>
                    <p className="text-right">Azioni</p>
                  </li>
                  {filteredListTasks.map((task) => (
                    <li
                      key={task.id}
                      className="grid grid-cols-1 gap-2 border-b px-3 py-3 text-sm last:border-b-0 md:grid-cols-[44px_1fr_180px_130px] md:items-center md:gap-3"
                    >
                      <div className="pt-1">
                        <input
                          type="checkbox"
                          aria-label={`Seleziona task ${task.id}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-zinc-800">{task.title}</p>
                        {task.description ? (
                          <p className="truncate text-xs text-zinc-500">
                            {task.description}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <label
                          htmlFor={`task-state-${task.id}`}
                          className="sr-only"
                        >
                          Stato task
                        </label>
                        <select
                          id={`task-state-${task.id}`}
                          value={task.state}
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          disabled={isMutating}
                          onChange={(event) => {
                            const nextState = event.target.value as TaskState;

                            void (async () => {
                              const wasUpdated = await setTaskState(
                                task.id,
                                nextState,
                              );

                              if (wasUpdated) {
                                toast.success("Stato task aggiornato");
                                return;
                              }

                              toast.error("Impossibile aggiornare il task");
                            })();
                          }}
                        >
                          <option value="To do">To do</option>
                          <option value="in progress">In progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Modifica task ${task.id}`}
                          onClick={() => openEditDialog(task)}
                          disabled={isMutating}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Elimina task ${task.id}`}
                          onClick={() => setDeletingTask(task)}
                          disabled={isMutating}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              {!isLoading &&
              !error &&
              tasks.length > 0 &&
              viewMode === "board" ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  {BOARD_COLUMNS.map((column) => {
                    const columnTasks = boardColumns[column.state];
                    const isDropTarget = dragOverColumn === column.state;

                    return (
                      <div
                        key={column.state}
                        className={`space-y-3 rounded-lg border p-3 transition-colors ${
                          isDropTarget
                            ? "border-zinc-900 bg-zinc-100"
                            : "border-border bg-zinc-50"
                        }`}
                        aria-label={`Colonna ${column.label}`}
                        onDragOver={(event) => {
                          if (!draggedTaskId || isMutating) {
                            return;
                          }

                          event.preventDefault();
                          setDragOverColumn(column.state);
                        }}
                        onDragLeave={() => {
                          if (dragOverColumn === column.state) {
                            setDragOverColumn(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleBoardDrop(column.state);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            {column.label} ({columnTasks.length})
                          </p>
                          <span className="text-xs text-zinc-500">
                            {isMutating ? "Aggiornamento..." : "Drag & drop"}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-24">
                          {columnTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              draggable
                              isDragging={draggedTaskId === task.id}
                              isMutating={isMutating}
                              onDragStart={handleBoardDragStart}
                              onDragEnd={resetBoardDragState}
                              onUpdateTaskState={setTaskState}
                              onDeleteTask={deleteTask}
                              onEditTask={updateTask}
                            />
                          ))}
                          {columnTasks.length === 0 ? (
                            <div className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500">
                              Rilascia qui un task
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>

      <Dialog
        open={Boolean(deletingTask)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDeletingTask(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina task</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il task &ldquo;{deletingTask?.title}
              &rdquo;? L&apos;operazione non è reversibile.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingTask(null)}
              disabled={isMutating}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => {
                if (!deletingTask) return;
                void (async () => {
                  const wasDeleted = await deleteTask(deletingTask.id);
                  setDeletingTask(null);
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
              Aggiorna titolo e descrizione del task selezionato.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitEdit(handleEditTask)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-task-title" className="text-sm font-medium">
                Titolo <span className="text-destructive">*</span>
              </label>
              <Input
                id="edit-task-title"
                type="text"
                aria-invalid={Boolean(editErrors.title)}
                {...registerEdit("title")}
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
                htmlFor="edit-task-description"
                className="text-sm font-medium"
              >
                Descrizione <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="edit-task-description"
                aria-invalid={Boolean(editErrors.description)}
                {...registerEdit("description")}
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
    </main>
  );
}
