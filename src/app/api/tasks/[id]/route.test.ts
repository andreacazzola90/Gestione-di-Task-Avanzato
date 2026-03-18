/** @jest-environment node */

describe("tasks id route", () => {
  const loadRoute = async () => {
    jest.resetModules();
    return import("./route");
  };

  const makeContext = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  it("PATCH returns 400 for invalid state", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: "invalid" }),
    });

    const response = await route.PATCH(request, makeContext("task-1"));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toContain("state must be one of");
  });

  it("PATCH returns 404 for missing task", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost/api/tasks/missing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated" }),
    });

    const response = await route.PATCH(request, makeContext("missing"));
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toBe("task not found");
  });

  it("PATCH updates an existing task", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost/api/tasks/task-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "  Aggiornato  ",
        description: "  Descrizione aggiornata  ",
        state: "completed",
      }),
    });

    const response = await route.PATCH(request, makeContext("task-1"));
    const body = (await response.json()) as {
      title: string;
      description?: string;
      state: string;
    };

    expect(response.status).toBe(200);
    expect(body.title).toBe("Aggiornato");
    expect(body.description).toBe("Descrizione aggiornata");
    expect(body.state).toBe("completed");
  });

  it("DELETE removes task and returns 204", async () => {
    const route = await loadRoute();

    const deleteResponse = await route.DELETE(
      new Request("http://localhost/api/tasks/task-2", { method: "DELETE" }),
      makeContext("task-2"),
    );

    expect(deleteResponse.status).toBe(204);

    const patchRequest = new Request("http://localhost/api/tasks/task-2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Should fail" }),
    });

    const patchResponse = await route.PATCH(
      patchRequest,
      makeContext("task-2"),
    );
    expect(patchResponse.status).toBe(404);
  });

  it("DELETE returns 404 for missing task", async () => {
    const route = await loadRoute();

    const response = await route.DELETE(
      new Request("http://localhost/api/tasks/missing", { method: "DELETE" }),
      makeContext("missing"),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toBe("task not found");
  });
});
