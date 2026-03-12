"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateTaskInput, Task } from "@/app/definitions";
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
  createTask: (title: string, description?: string) => Promise<boolean>;
  toggleTaskCompleted: (id: string) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
};

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

const updateTaskCompletedRequest = async ({
  id,
  completed,
}: {
  id: string;
  completed: boolean;
}) => {
  const response = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
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

  const toggleTaskMutation = useMutation({
    mutationFn: updateTaskCompletedRequest,
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
    async (title: string, description?: string) => {
      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        setActionError("Il titolo del task e obbligatorio.");
        return false;
      }

      setActionError(null);

      try {
        await createTaskMutation.mutateAsync({
          title: trimmedTitle,
          description: description?.trim() || undefined,
        });
        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError));
        return false;
      }
    },
    [createTaskMutation],
  );

  const toggleTaskCompleted = useCallback(
    async (id: string) => {
      const currentTasks = tasksQuery.data ?? [];
      const targetTask = currentTasks.find((task) => task.id === id);

      if (!targetTask) {
        setActionError("Task non trovato.");
        return false;
      }

      setActionError(null);

      try {
        await toggleTaskMutation.mutateAsync({
          id,
          completed: !targetTask.completed,
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
      toggleTaskCompleted,
      deleteTask,
    }),
    [
      tasksQuery.data,
      tasksQuery.isLoading,
      isMutating,
      error,
      reloadTasks,
      createTask,
      toggleTaskCompleted,
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
