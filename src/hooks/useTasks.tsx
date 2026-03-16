"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateTaskInput,
  Task,
  TaskState,
  UpdateTaskInput,
} from "@/app/definitions";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type TasksContextValue = {
  tasks: Task[];
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  reloadTasks: () => Promise<void>;
  createTask: (title: string, description: string) => Promise<boolean>;
  updateTask: (
    id: string,
    title: string,
    description: string,
  ) => Promise<boolean>;
  advanceTaskState: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
};

const STATE_FLOW: TaskState[] = ["To do", "in progress", "completed"];

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load tasks.";
};

const getResponseMessage = async (response: Response) => {
  const fallbackMessage = `Request failed with status ${response.status}`;

  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};

const fetchTasks = async () => {
  const response = await fetch("/api/tasks", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }

  return (await response.json()) as Task[];
};

const createTaskRequest = async ({ title, description }: CreateTaskInput) => {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }

  return (await response.json()) as Task;
};

const updateTaskRequest = async ({
  id,
  ...fields
}: { id: string } & UpdateTaskInput) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }

  return (await response.json()) as Task;
};

const updateTaskStateRequest = async ({
  id,
  state,
}: {
  id: string;
  state: TaskState;
}) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }

  return (await response.json()) as Task;
};

const deleteTaskRequest = async (id: string) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await getResponseMessage(response));
  }
};

export const TasksProvider = ({ children }: { children: ReactNode }) => {
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
  });

  const createTaskMutation = useMutation({
    mutationFn: createTaskRequest,
    onSuccess: (createdTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (currentTasks = []) => [
        createdTask,
        ...currentTasks,
      ]);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTaskRequest,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (currentTasks = []) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: updateTaskStateRequest,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(["tasks"], (currentTasks = []) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTaskRequest,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Task[]>(["tasks"], (currentTasks = []) =>
        currentTasks.filter((task) => task.id !== deletedId),
      );
    },
  });

  const reloadTasks = useCallback(async () => {
    setActionError(null);
    await tasksQuery.refetch();
  }, [tasksQuery]);

  const createTask = useCallback(
    async (title: string, description: string) => {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (!trimmedTitle) {
        setActionError("Il titolo del task e obbligatorio.");
        return false;
      }

      if (!trimmedDescription) {
        setActionError("La descrizione del task e obbligatoria.");
        return false;
      }

      setActionError(null);

      try {
        await createTaskMutation.mutateAsync({
          title: trimmedTitle,
          description: trimmedDescription,
        });
        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError));
        return false;
      }
    },
    [createTaskMutation],
  );

  const updateTask = useCallback(
    async (id: string, title: string, description: string) => {
      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      if (!trimmedTitle) {
        setActionError("Il titolo del task e obbligatorio.");
        return false;
      }

      if (!trimmedDescription) {
        setActionError("La descrizione del task e obbligatoria.");
        return false;
      }

      setActionError(null);

      try {
        await updateTaskMutation.mutateAsync({
          id,
          title: trimmedTitle,
          description: trimmedDescription,
        });
        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError));
        return false;
      }
    },
    [updateTaskMutation],
  );

  const advanceTaskState = useCallback(
    async (id: string) => {
      const currentTasks = tasksQuery.data ?? [];
      const targetTask = currentTasks.find((task) => task.id === id);

      if (!targetTask) {
        setActionError("Task non trovato.");
        return false;
      }

      setActionError(null);

      const currentStateIndex = STATE_FLOW.indexOf(targetTask.state);
      const nextState =
        STATE_FLOW[
          currentStateIndex >= 0
            ? (currentStateIndex + 1) % STATE_FLOW.length
            : 0
        ];

      try {
        await toggleTaskMutation.mutateAsync({
          id,
          state: nextState,
        });
        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError));
        return false;
      }
    },
    [tasksQuery.data, toggleTaskMutation],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      setActionError(null);

      try {
        await deleteTaskMutation.mutateAsync(id);
        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError));
        return false;
      }
    },
    [deleteTaskMutation],
  );

  const isMutating =
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    toggleTaskMutation.isPending ||
    deleteTaskMutation.isPending;

  const queryError = tasksQuery.error
    ? getErrorMessage(tasksQuery.error)
    : null;
  const error = actionError ?? queryError;

  const value = useMemo(
    () => ({
      tasks: tasksQuery.data ?? [],
      isLoading: tasksQuery.isLoading,
      isMutating,
      error,
      reloadTasks,
      createTask,
      updateTask,
      advanceTaskState,
      deleteTask,
    }),
    [
      tasksQuery.data,
      tasksQuery.isLoading,
      isMutating,
      error,
      reloadTasks,
      createTask,
      updateTask,
      advanceTaskState,
      deleteTask,
    ],
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);

  if (!context) {
    throw new Error("useTasks must be used inside TasksProvider");
  }

  return context;
};
