/** @jest-environment node */

import type { Task } from "@/app/definitions";

describe("tasks store", () => {
  const loadStore = async () => {
    jest.resetModules();
    return import("./store");
  };

  it("returns initial tasks", async () => {
    const store = await loadStore();

    const tasks = store.getTasks();

    expect(tasks).toHaveLength(3);
    expect(tasks[0].id).toBe("task-1");
    expect(tasks[0].state).toBe("To do");
  });

  it("creates a task with default state and adds it to the top", async () => {
    const store = await loadStore();

    const created = store.createTask("My task", "My description");
    const tasks = store.getTasks();

    expect(created.title).toBe("My task");
    expect(created.description).toBe("My description");
    expect(created.state).toBe("To do");
    expect(tasks[0].id).toBe(created.id);
  });

  it("updates title, description and state", async () => {
    const store = await loadStore();

    const updated = store.updateTask("task-1", {
      title: "  Nuovo titolo  ",
      description: "  Nuova descrizione  ",
      state: "in progress",
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Nuovo titolo");
    expect(updated?.description).toBe("Nuova descrizione");
    expect(updated?.state).toBe("in progress");
  });

  it("removes description when payload includes empty description", async () => {
    const store = await loadStore();

    const updated = store.updateTask("task-1", {
      description: "   ",
    });

    expect(updated).not.toBeNull();
    expect(updated?.description).toBeUndefined();
  });

  it("returns null when updating unknown id", async () => {
    const store = await loadStore();

    const updated = store.updateTask("missing-id", { title: "Test" });

    expect(updated).toBeNull();
  });

  it("deletes an existing task", async () => {
    const store = await loadStore();

    const deleted = store.deleteTask("task-2");
    const tasks = store.getTasks();

    expect(deleted).toBe(true);
    expect(tasks.find((task: Task) => task.id === "task-2")).toBeUndefined();
  });

  it("returns false when deleting unknown task", async () => {
    const store = await loadStore();

    const deleted = store.deleteTask("missing-id");

    expect(deleted).toBe(false);
  });

  it("resets tasks to initial values", async () => {
    const store = await loadStore();

    store.createTask("Task temporaneo", "desc");
    store.updateTask("task-1", { title: "Titolo modificato" });
    store.deleteTask("task-2");

    const reset = store.resetTasks();

    expect(reset).toHaveLength(3);
    expect(reset[0].id).toBe("task-1");
    expect(reset[0].title).toBe("Prepare sprint planning");
    expect(reset[1].id).toBe("task-2");
    expect(reset[2].id).toBe("task-3");
  });
});
