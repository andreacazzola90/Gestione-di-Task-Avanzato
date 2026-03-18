import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { TasksProvider, useTasks } from "./useTasks";

const makeResponse = <T,>(body: T, status = 200): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
};

describe("useTasks", () => {
  const originalFetch = global.fetch;

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
      .mockResolvedValue(
        makeResponse([
          { id: "1", title: "A", state: "To do", createdAt: "2026-01-01" },
        ]),
      ) as typeof fetch;

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].title).toBe("A");
  });

  it("validates createTask title and description", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(makeResponse([])) as typeof fetch;

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
    expect(global.fetch).toHaveBeenCalledTimes(1);
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

    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      (call) =>
        String(call[0]).endsWith("/api/tasks/task-1") &&
        call[1]?.method === "PATCH",
    );

    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall?.[1]?.body as string)).toEqual({
      state: "in progress",
    });
  });
});
