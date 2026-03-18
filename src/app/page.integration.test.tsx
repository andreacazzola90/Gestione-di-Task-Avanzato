import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import type { Task, TaskState } from "@/app/definitions";
import Home from "./page";
import { TasksProvider } from "@/hooks/useTasks";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const makeResponse = <T,>(body: T, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  function TestWrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <TasksProvider>{children}</TasksProvider>
      </QueryClientProvider>
    );
  }

  return TestWrapper;
};

type TaskStore = { tasks: Task[]; nextId: number };

const stateFlow: TaskState[] = ["To do", "in progress", "completed"];

const createFetchMock = (store: TaskStore): typeof fetch => {
  return jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const url = String(input);
    const taskId = url.split("/").pop() ?? "";

    if (url.endsWith("/api/tasks") && method === "GET") {
      return makeResponse(store.tasks);
    }

    if (url.endsWith("/api/tasks") && method === "POST") {
      const body = JSON.parse((init?.body as string) ?? "{}") as {
        title?: string;
        description?: string;
      };

      if (!body.title?.trim()) {
        return makeResponse({ message: "title is required" }, 400);
      }

      const newTask: Task = {
        id: `task-${store.nextId++}`,
        title: body.title.trim(),
        description: body.description?.trim() || undefined,
        state: "To do",
        createdAt: "2026-03-16T09:00:00.000Z",
      };

      store.tasks = [newTask, ...store.tasks];
      return makeResponse(newTask, 201);
    }

    if (url.includes("/api/tasks/") && method === "PATCH") {
      const body = JSON.parse((init?.body as string) ?? "{}") as {
        title?: string;
        description?: string;
        state?: TaskState;
      };

      const taskIndex = store.tasks.findIndex((task) => task.id === taskId);
      if (taskIndex < 0) {
        return makeResponse({ message: "task not found" }, 404);
      }

      if (body.state && !stateFlow.includes(body.state)) {
        return makeResponse(
          { message: "state must be one of: To do, in progress, completed" },
          400,
        );
      }

      const currentTask = store.tasks[taskIndex];
      const updatedTask: Task = {
        ...currentTask,
        title: body.title?.trim() ? body.title.trim() : currentTask.title,
        description:
          body.description !== undefined
            ? body.description.trim() || undefined
            : currentTask.description,
        state: body.state ?? currentTask.state,
      };

      store.tasks[taskIndex] = updatedTask;
      return makeResponse(updatedTask);
    }

    if (url.includes("/api/tasks/") && method === "DELETE") {
      const previousLength = store.tasks.length;
      store.tasks = store.tasks.filter((task) => task.id !== taskId);

      if (store.tasks.length === previousLength) {
        return makeResponse({ message: "task not found" }, 404);
      }

      return makeResponse(null, 204);
    }

    return makeResponse({ message: "not found" }, 404);
  }) as unknown as typeof fetch;
};

describe("Home integration", () => {
  const originalFetch = global.fetch;

  const cloneTasks = <T,>(value: T): T =>
    JSON.parse(JSON.stringify(value)) as T;
  const baseTasks: Task[] = [
    {
      id: "task-1",
      title: "Prepare sprint planning",
      description: "Define priorities",
      state: "To do",
      createdAt: "2026-03-10T08:00:00.000Z",
    },
    {
      id: "task-2",
      title: "Review pull requests",
      description: "Validate approvals",
      state: "completed",
      createdAt: "2026-03-09T14:30:00.000Z",
    },
  ];

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("loads tasks and supports create, state change and delete", async () => {
    const user = userEvent.setup();
    const store: TaskStore = { tasks: cloneTasks(baseTasks), nextId: 3 };
    global.fetch = createFetchMock(store);

    render(<Home />, { wrapper: createWrapper() });
    expect(
      await screen.findByText("Prepare sprint planning"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /aggiungi task/i }));
    await user.type(
      screen.getByLabelText(/titolo/i),
      "Nuovo task integrazione",
    );
    await user.type(
      screen.getByLabelText(/descrizione/i),
      "Descrizione integrazione",
    );
    await user.click(screen.getByRole("button", { name: /^aggiungi$/i }));

    const createdTaskTitle = await screen.findByText("Nuovo task integrazione");
    const createdTaskItem = createdTaskTitle.closest("li");
    if (!createdTaskItem)
      throw new Error("Unable to find created task container");

    await user.selectOptions(
      within(createdTaskItem).getByRole("combobox", { name: /stato task/i }),
      "in progress",
    );

    await waitFor(() => {
      expect(
        within(createdTaskItem).getByRole("combobox", { name: /stato task/i }),
      ).toHaveValue("in progress");
    });

    await user.click(
      within(createdTaskItem).getByRole("button", { name: /elimina/i }),
    );
    const deleteDialog = await screen.findByRole("dialog");
    await user.click(
      within(deleteDialog).getByRole("button", { name: /^elimina$/i }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Nuovo task integrazione"),
      ).not.toBeInTheDocument();
    });
  });

  it("edits an existing task through dialog", async () => {
    const user = userEvent.setup();
    const store: TaskStore = { tasks: cloneTasks(baseTasks), nextId: 3 };
    global.fetch = createFetchMock(store);

    render(<Home />, { wrapper: createWrapper() });

    const firstTaskTitle = await screen.findByText("Prepare sprint planning");
    const firstTaskRow = firstTaskTitle.closest("li");
    if (!firstTaskRow) throw new Error("Unable to find task row");

    await user.click(
      within(firstTaskRow).getByRole("button", { name: /modifica/i }),
    );
    const titleInput = await screen.findByLabelText(/titolo/i);
    const descriptionInput = screen.getByLabelText(/descrizione/i);

    await user.clear(titleInput);
    await user.type(titleInput, "Prepare sprint planning updated");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Updated description");
    await user.click(screen.getByRole("button", { name: /salva/i }));

    expect(
      await screen.findByText("Prepare sprint planning updated"),
    ).toBeInTheDocument();
  });

  it("moves a task between board columns via drag and drop", async () => {
    const user = userEvent.setup();
    const store: TaskStore = { tasks: cloneTasks(baseTasks), nextId: 3 };
    global.fetch = createFetchMock(store);

    render(<Home />, { wrapper: createWrapper() });
    await screen.findByText("Prepare sprint planning");

    await user.click(screen.getByRole("button", { name: /vista board/i }));

    const draggedTask = screen
      .getByText("Prepare sprint planning")
      .closest('[data-task-id="task-1"]');
    if (!draggedTask) throw new Error("Unable to find draggable task card");

    const completedColumn = screen.getByLabelText(/colonna completed/i);
    fireEvent.dragStart(draggedTask);
    fireEvent.dragOver(completedColumn);
    fireEvent.drop(completedColumn);

    await waitFor(() => {
      expect(store.tasks.find((task) => task.id === "task-1")?.state).toBe(
        "completed",
      );
    });
  });

  it("shows loading error alert when initial fetch fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network failure")) as typeof fetch;
    render(<Home />, { wrapper: createWrapper() });

    expect(
      await screen.findByText("Errore durante il caricamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("Network failure")).toBeInTheDocument();
  });

  it("filters tasks by query", async () => {
    const user = userEvent.setup();
    const store: TaskStore = { tasks: cloneTasks(baseTasks), nextId: 3 };
    global.fetch = createFetchMock(store);
    render(<Home />, { wrapper: createWrapper() });

    await screen.findByText("Prepare sprint planning");
    await user.type(screen.getByPlaceholderText("Filter tasks..."), "sprint");

    expect(screen.getByText("Prepare sprint planning")).toBeInTheDocument();
    expect(screen.queryByText("Review pull requests")).not.toBeInTheDocument();
  });
});
