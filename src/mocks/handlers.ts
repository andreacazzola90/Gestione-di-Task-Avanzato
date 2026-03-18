import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type {
  CreateTaskInput,
  Task,
  TaskState,
  UpdateTaskInput,
} from "@/app/definitions";

const ALLOWED_STATES: TaskState[] = ["To do", "in progress", "completed"];

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Prepare sprint planning",
    description: "Define priorities with the team.",
    state: "To do",
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review pull requests",
    description: "Validate code quality and merge approvals.",
    state: "completed",
    createdAt: "2026-03-09T14:30:00.000Z",
  },
];

let tasksStore: Task[] = structuredClone(initialTasks);

export const resetTasksStore = () => {
  tasksStore = structuredClone(initialTasks);
};

export const MOCK_TASKS_QUERY_KEY = ["mock-tasks"] as const;

const ensureValidState = (state?: TaskState) => {
  if (state && !ALLOWED_STATES.includes(state)) {
    throw new Error("state must be one of: To do, in progress, completed");
  }
};

const getTaskIndexById = (id: string) => {
  return tasksStore.findIndex((task) => task.id === id);
};

export const getTasks = async (): Promise<Task[]> => {
  return structuredClone(tasksStore);
};

export const createTask = async ({
  title,
  description,
}: CreateTaskInput): Promise<Task> => {
  const trimmedTitle = title?.trim();

  if (!trimmedTitle) {
    throw new Error("title is required");
  }

  const newTask: Task = {
    id: `task-${crypto.randomUUID()}`,
    title: trimmedTitle,
    description: description?.trim() || undefined,
    state: "To do",
    createdAt: new Date().toISOString(),
  };

  tasksStore = [newTask, ...tasksStore];
  return newTask;
};

export const updateTask = async ({
  id,
  ...fields
}: { id: string } & UpdateTaskInput): Promise<Task> => {
  ensureValidState(fields.state);

  const taskIndex = getTaskIndexById(id);

  if (taskIndex < 0) {
    throw new Error("task not found");
  }

  const currentTask = tasksStore[taskIndex];
  const updatedTask: Task = {
    ...currentTask,
    title: fields.title?.trim() ? fields.title.trim() : currentTask.title,
    description:
      fields.description !== undefined
        ? fields.description.trim() || undefined
        : currentTask.description,
    state: fields.state ?? currentTask.state,
  };

  tasksStore[taskIndex] = updatedTask;
  return updatedTask;
};

export const deleteTask = async (id: string): Promise<void> => {
  const previousLength = tasksStore.length;
  tasksStore = tasksStore.filter((task) => task.id !== id);

  if (tasksStore.length === previousLength) {
    throw new Error("task not found");
  }
};

export const useMockTasksQuery = () => {
  return useQuery({
    queryKey: MOCK_TASKS_QUERY_KEY,
    queryFn: getTasks,
  });
};

export const useCreateMockTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (createdTask) => {
      queryClient.setQueryData<Task[]>(
        MOCK_TASKS_QUERY_KEY as QueryKey,
        (current = []) => [createdTask, ...current],
      );
    },
  });
};

export const useUpdateMockTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(
        MOCK_TASKS_QUERY_KEY as QueryKey,
        (current = []) =>
          current.map((task) =>
            task.id === updatedTask.id ? updatedTask : task,
          ),
      );
    },
  });
};

export const useDeleteMockTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: (_, id) => {
      queryClient.setQueryData<Task[]>(
        MOCK_TASKS_QUERY_KEY as QueryKey,
        (current = []) => current.filter((task) => task.id !== id),
      );
    },
  });
};
