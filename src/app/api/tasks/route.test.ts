/** @jest-environment node */

describe("tasks route", () => {
  const loadRoute = async () => {
    jest.resetModules();
    return import("./route");
  };

  it("GET returns tasks", async () => {
    const route = await loadRoute();

    const response = await route.GET();
    const body = (await response.json()) as Array<{ id: string }>;

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it("POST returns 400 when title is missing", async () => {
    const route = await loadRoute();
    const request = new Request("http://localhost/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "only description" }),
    });

    const response = await route.POST(request);
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(400);
    expect(body.message).toBe("title is required");
  });
});
