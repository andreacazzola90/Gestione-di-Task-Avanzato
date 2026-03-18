import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { TasksProvider, useTasks } from "./useTasks";

const makeResponse = <T,>(body: T, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

type LocalTask = {
  id: string;
  title: string;
  description?: string;
  state: "To do" | "in progress" | "completed";
  createdAt: string;
};

describe("useTasks", () => {
  const originalFetch = global.fetch;

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const baseTasks: LocalTask[] = [
    {
      id: "task-1",
      title: "Task A",
      description: "Desc A",
      state: "To do",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "task-2",
      title: "Task B",
      description: "Desc B",
      state: "in progress",
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ];

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
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

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("throws when used outside provider", () => {
    expect(() => renderHook(() => useTasks())).toThrow(
      "useTasks must be used inside TasksProvider",
    );
  });

  it("loads tasks on mount", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeResponse(clone(baseTasks))) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].title).toBe("Task A");
  });

  it("validates createTask title and description", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeResponse(clone(baseTasks))) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let createResult = false;
    await act(async () => {
      createResult = await result.current.createTask("   ", "desc");
    });
    expect(createResult).toBe(false);
    expect(result.current.error).toBe("Il titolo del task e obbligatorio.");

    await act(async () => {
      createResult = await result.current.createTask("Titolo", "   ");
    });
    expect(createResult).toBe(false);
    expect(result.current.error).toBe(
      "La descrizione del task e obbligatoria.",
    );
  });

  it("createTask sends POST request and prepends the new task", async () => {
    const stored = clone(baseTasks);
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse(stored);
        }
        if (url.endsWith("/api/tasks") && init?.method === "POST") {
          const body = JSON.parse((init.body as string) ?? "{}") as {
            title?: string;
            description?: string;
          };
          const newTask: LocalTask = {
            id: "task-new",
            title: body.title ?? "",
            description: body.description,
            state: "To do",
            createdAt: "2026-01-03T00:00:00.000Z",
          };
          stored.unshift(newTask);
          return makeResponse(newTask, 201);
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.createTask("New task", "New desc");
    });

    expect(success).toBe(true);
    expect(result.current.tasks[0].title).toBe("New task");
    expect(result.current.tasks.length).toBeGreaterThanOrEqual(3);
  });

  it("updateTask sends PATCH request and updates cached task", async () => {
    const stored = clone(baseTasks);
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse(stored);
        }
        if (url.includes("/api/tasks/task-1") && init?.method === "PATCH") {
          const body = JSON.parse((init.body as string) ?? "{}") as {
            title?: string;
            description?: string;
          };
          const updated: LocalTask = {
            ...stored[0],
            title: body.title ?? stored[0].title,
            description: body.description ?? stored[0].description,
          };
          stored[0] = updated;
          return makeResponse(updated);
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.updateTask(
        "task-1",
        "Updated A",
        "Updated desc A",
      );
    });

    expect(success).toBe(true);
    expect(
      result.current.tasks.find((task) => task.id === "task-1")?.title,
    ).toBe("Updated A");
  });

  it("setTaskState sends PATCH request with next state", async () => {
    const stored = clone(baseTasks);
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse(stored);
        }
        if (url.includes("/api/tasks/task-1") && init?.method === "PATCH") {
          const body = JSON.parse((init.body as string) ?? "{}") as {
            state?: LocalTask["state"];
          };
          const updated: LocalTask = {
            ...stored[0],
            state: body.state ?? stored[0].state,
          };
          stored[0] = updated;
          return makeResponse(updated);
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.setTaskState("task-1", "completed");
    });

    expect(success).toBe(true);
    expect(
      result.current.tasks.find((task) => task.id === "task-1")?.state,
    ).toBe("completed");
  });

  it("advances task state to next value", async () => {
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse([
            {
              id: "task-1",
              title: "Task",
              description: "Desc",
              state: "To do",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ]);
        }
        if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
          const body = JSON.parse((init.body as string) ?? "{}");
          return makeResponse({
            id: "task-1",
            title: "Task",
            description: "Desc",
            state: body.state,
            createdAt: "2026-01-01T00:00:00.000Z",
          });
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.advanceTaskState("task-1");
    });

    expect(success).toBe(true);
    expect(result.current.tasks[0].state).toBe("in progress");
  });

  it("advanceTaskState wraps completed back to To do", async () => {
    const stored: LocalTask[] = [
      {
        id: "task-1",
        title: "Task",
        description: "Desc",
        state: "completed",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse(stored);
        }
        if (url.endsWith("/api/tasks/task-1") && init?.method === "PATCH") {
          const body = JSON.parse((init.body as string) ?? "{}") as {
            state: LocalTask["state"];
          };
          stored[0] = { ...stored[0], state: body.state };
          return makeResponse(stored[0]);
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.advanceTaskState("task-1");
    });

    expect(success).toBe(true);
    expect(result.current.tasks[0].state).toBe("To do");
  });

  it("deleteTask removes a task from cache", async () => {
    const stored = clone(baseTasks);
    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (
          url.endsWith("/api/tasks") &&
          (!init?.method || init.method === "GET")
        ) {
          return makeResponse(stored);
        }
        if (url.includes("/api/tasks/task-1") && init?.method === "DELETE") {
          const index = stored.findIndex(
            (task: LocalTask) => task.id === "task-1",
          );
          stored.splice(index, 1);
          return makeResponse(null, 204);
        }
        return makeResponse({ message: "not found" }, 404);
      },
    ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let success = false;
    await act(async () => {
      success = await result.current.deleteTask("task-1");
    });

    expect(success).toBe(true);
    expect(
      result.current.tasks.find((task) => task.id === "task-1"),
    ).toBeUndefined();
  });

  it("sets error when initial fetch fails", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network error")) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Network error");
    expect(result.current.tasks).toEqual([]);
  });

  it("reloadTasks refetches and clears previous error", async () => {
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount += 1;
      if (callCount === 1) throw new Error("First load fails");
      return makeResponse(clone(baseTasks));
    }) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("First load fails");

    await act(async () => {
      await result.current.reloadTasks();
    });

    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    expect(result.current.error).toBeNull();
  });
});
