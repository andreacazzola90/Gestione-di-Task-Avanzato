import { http, HttpResponse } from "msw";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Prepare sprint planning",
    completed: false,
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review pull requests",
    completed: true,
    createdAt: "2026-03-09T14:30:00.000Z",
  },
];

let tasksStore: Task[] = structuredClone(initialTasks);

export const resetTasksStore = () => {
  tasksStore = structuredClone(initialTasks);
};

export const handlers = [
  http.get("/api/tasks", () => {
    return HttpResponse.json(tasksStore, { status: 200 });
  }),

  http.post("/api/tasks", async ({ request }: { request: Request }) => {
    const body = (await request.json()) as Partial<Pick<Task, "title">>;

    if (!body.title || !body.title.trim()) {
      return HttpResponse.json(
        { message: "title is required" },
        { status: 400 },
      );
    }

    const newTask: Task = {
      id: `task-${crypto.randomUUID()}`,
      title: body.title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    tasksStore = [newTask, ...tasksStore];

    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.patch(
    "/api/tasks/:id",
    async ({
      params,
      request,
    }: {
      params: { id: string };
      request: Request;
    }) => {
      const { id } = params;
      const body = (await request.json()) as Partial<
        Pick<Task, "title" | "completed">
      >;

      const taskIndex = tasksStore.findIndex((task) => task.id === id);

      if (taskIndex < 0) {
        return HttpResponse.json(
          { message: "task not found" },
          { status: 404 },
        );
      }

      const currentTask = tasksStore[taskIndex];
      const updatedTask: Task = {
        ...currentTask,
        title: body.title?.trim() ? body.title.trim() : currentTask.title,
        completed:
          typeof body.completed === "boolean"
            ? body.completed
            : currentTask.completed,
      };

      tasksStore[taskIndex] = updatedTask;

      return HttpResponse.json(updatedTask, { status: 200 });
    },
  ),

  http.delete("/api/tasks/:id", ({ params }: { params: { id: string } }) => {
    const { id } = params;
    const previousLength = tasksStore.length;

    tasksStore = tasksStore.filter((task) => task.id !== id);

    if (tasksStore.length === previousLength) {
      return HttpResponse.json({ message: "task not found" }, { status: 404 });
    }

    return new HttpResponse(null, { status: 204 });
  }),
];
