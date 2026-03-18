import type { Task, UpdateTaskInput } from "@/app/definitions";

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Prepare sprint planning",
    description:
      "Organizza l'agenda per lo sprint planning: definisci le user story, stima i punti e assegna i task al team prima della riunione.",
    state: "To do",
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review pull requests",
    description:
      "Controlla le PR aperte su GitHub, verifica la qualità del codice e lascia commenti costruttivi prima di approvare o richiedere modifiche.",
    state: "completed",
    createdAt: "2026-03-09T14:30:00.000Z",
  },
  {
    id: "task-3",
    title: "Supermercato",
    description: "fare la spesa",
    state: "in progress",
    createdAt: "2026-03-09T16:00:00.000Z",
  },
];

let tasksStore: Task[] = structuredClone(initialTasks);

export const getTasks = () => tasksStore;

export const createTask = (title: string, description?: string) => {
  const task: Task = {
    id: `task-${crypto.randomUUID()}`,
    title,
    ...(description ? { description } : {}),
    state: "To do",
    createdAt: new Date().toISOString(),
  };

  tasksStore = [task, ...tasksStore];
  return task;
};

export const updateTask = (id: string, payload: UpdateTaskInput) => {
  const taskIndex = tasksStore.findIndex((task) => task.id === id);

  if (taskIndex < 0) {
    return null;
  }

  const currentTask = tasksStore[taskIndex];
  const updatedTask: Task = {
    ...currentTask,
    title: payload.title?.trim() ? payload.title.trim() : currentTask.title,
    description:
      "description" in payload
        ? payload.description?.trim() || undefined
        : currentTask.description,
    state: payload.state ?? currentTask.state,
  };

  tasksStore[taskIndex] = updatedTask;

  return updatedTask;
};

export const deleteTask = (id: string) => {
  const previousLength = tasksStore.length;
  tasksStore = tasksStore.filter((task) => task.id !== id);

  return tasksStore.length < previousLength;
};

export const resetTasks = () => {
  tasksStore = structuredClone(initialTasks);
  return tasksStore;
};
