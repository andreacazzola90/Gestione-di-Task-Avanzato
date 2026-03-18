import { http, HttpResponse } from "msw";
import type { Task, TaskState } from "@/app/definitions";

const ALLOWED_STATES: TaskState[] = ["To do", "in progress", "completed"];

const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Prepare sprint planning",
    state: "To do",
    createdAt: "2026-03-10T08:00:00.000Z",
  },
  {
    id: "task-2",
    title: "Review pull requests",
    state: "completed",
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
      state: "To do",
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
        Pick<Task, "title" | "state">
      >;

      if (body.state && !ALLOWED_STATES.includes(body.state)) {
        return HttpResponse.json(
          { message: "state must be one of: To do, in progress, completed" },
          { status: 400 },
        );
      }

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
        state: body.state ?? currentTask.state,
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
