import { test, expect } from "@playwright/test";

test.describe("Task Manager – E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Task Manager Dashboard")).toBeVisible({
      timeout: 10_000,
    });
  });

  const createTask = async (
    page: import("@playwright/test").Page,
    title: string,
    description: string,
  ) => {
    await page.getByRole("button", { name: /aggiungi task/i }).click();
    await page.getByLabel(/titolo/i).fill(title);
    await page.getByLabel(/descrizione/i).fill(description);
    await page.getByRole("button", { name: /^aggiungi$/i }).click();
    await expect(
      page.locator("li").filter({ hasText: title }).first(),
    ).toBeVisible();
  };

  // ─── Initial state ───────────────────────────────────────────────────────────

  test("displays initial tasks on load", async ({ page }) => {
    await expect(page.getByText("Prepare sprint planning")).toBeVisible();
    await expect(page.getByText("Supermercato")).toBeVisible();
    await expect(page.getByText("Review pull requests")).toBeVisible();
  });

  test("shows the dashboard header and view-mode buttons", async ({ page }) => {
    await expect(page.getByText("Task Manager Dashboard")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /vista lista/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /vista board/i }),
    ).toBeVisible();
  });

  // ─── Create task ─────────────────────────────────────────────────────────────

  test("creates a new task and shows it at the top of the list", async ({
    page,
  }) => {
    const uniqueTitle = `E2E task ${Date.now()}`;

    await page.getByRole("button", { name: /aggiungi task/i }).click();
    await page.getByLabel(/titolo/i).fill(uniqueTitle);
    await page
      .getByLabel(/descrizione/i)
      .fill("E2E auto-generated description");
    await page.getByRole("button", { name: /^aggiungi$/i }).click();

    await expect(page.getByText(uniqueTitle)).toBeVisible();
  });

  test("shows validation errors when creating a task with empty fields", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /aggiungi task/i }).click();
    await page.getByRole("button", { name: /^aggiungi$/i }).click();

    await expect(page.getByText("Il titolo e obbligatorio")).toBeVisible();
    await expect(page.getByText("La descrizione e obbligatoria")).toBeVisible();
  });

  test("closes the creation dialog when Annulla is clicked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /aggiungi task/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /annulla/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  // ─── Edit task ───────────────────────────────────────────────────────────────

  test("edits a task and reflects the updated title", async ({ page }) => {
    const updatedTitle = `Sprint updated ${Date.now()}`;

    const firstRow = page
      .locator("li")
      .filter({ hasText: "Prepare sprint planning" })
      .first();
    await firstRow.getByRole("button", { name: /modifica/i }).click();

    const titleInput = page.getByLabel(/titolo/i);
    await titleInput.clear();
    await titleInput.fill(updatedTitle);
    await page.getByRole("button", { name: /salva/i }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible();
  });

  test("shows edit validation errors when form fields are empty", async ({
    page,
  }) => {
    const firstRow = page
      .locator("li")
      .filter({ hasText: "Prepare sprint planning" })
      .first();
    await firstRow.getByRole("button", { name: /modifica/i }).click();

    await page.getByLabel(/titolo/i).clear();
    await page.getByLabel(/descrizione/i).clear();
    await page.getByRole("button", { name: /salva/i }).click();

    await expect(page.getByText("Il titolo e obbligatorio")).toBeVisible();
    await expect(page.getByText("La descrizione e obbligatoria")).toBeVisible();
  });

  // ─── Delete task ─────────────────────────────────────────────────────────────

  test("deletes a task after dialog confirmation", async ({ page }) => {
    const uniqueTitle = `Delete me ${Date.now()}`;

    await createTask(page, uniqueTitle, "Will be deleted");

    const taskRow = page.locator("li").filter({ hasText: uniqueTitle }).first();
    await taskRow.getByRole("button", { name: /elimina/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /^elimina$/i }).click();
    await expect(
      page.locator("li").filter({ hasText: uniqueTitle }),
    ).toHaveCount(0);
  });

  test("cancelling delete dialog keeps the task in the list", async ({
    page,
  }) => {
    const firstRow = page
      .locator("li")
      .filter({ hasText: "Supermercato" })
      .first();
    await firstRow.getByRole("button", { name: /elimina/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /annulla/i }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Supermercato")).toBeVisible();
  });

  // ─── Task state ──────────────────────────────────────────────────────────────

  test("shows state selector options in list view", async ({ page }) => {
    const uniqueTitle = `State case ${Date.now()}`;
    await createTask(page, uniqueTitle, "state change");

    const firstRow = page
      .locator("li")
      .filter({ hasText: uniqueTitle })
      .first();
    const stateSelect = firstRow.locator("select").first();

    await expect(stateSelect).toBeEnabled();
    await expect(stateSelect.locator("option[value='To do']")).toHaveCount(1);
    await expect(
      stateSelect.locator("option[value='in progress']"),
    ).toHaveCount(1);
    await expect(stateSelect.locator("option[value='completed']")).toHaveCount(
      1,
    );
  });

  // ─── Task detail ─────────────────────────────────────────────────────────────

  test("opens the task detail dialog on title click", async ({ page }) => {
    await page
      .getByRole("button", { name: "Prepare sprint planning" })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Dettaglio task")).toBeVisible();
    await expect(dialog.getByText("task-1")).toBeVisible();
  });

  // ─── Filters ────────────────────────────────────────────────────────────────

  test("filters tasks by query string", async ({ page }) => {
    await page.getByPlaceholder("Filter tasks...").fill("sprint");

    await expect(page.getByText("Prepare sprint planning")).toBeVisible();
    await expect(page.getByText("Supermercato")).not.toBeVisible();
  });

  test("filters tasks by state dropdown", async ({ page }) => {
    await page.locator("select#filter-state").selectOption("completed");

    await expect(page.getByText("Review pull requests")).toBeVisible();
    await expect(page.getByText("Prepare sprint planning")).not.toBeVisible();
  });

  test("shows 'no results' message when filter matches nothing", async ({
    page,
  }) => {
    await page.getByPlaceholder("Filter tasks...").fill("xyznosuchtask99999");
    await expect(
      page.getByText("Nessun task corrisponde ai filtri selezionati."),
    ).toBeVisible();
  });

  test("resets filters when Reset filtri button is clicked", async ({
    page,
  }) => {
    await page.getByPlaceholder("Filter tasks...").fill("sprint");
    await expect(page.getByText("Supermercato")).not.toBeVisible();

    await page.getByRole("button", { name: /reset filtri/i }).click();

    await expect(page.getByText("Supermercato")).toBeVisible();
    await expect(page.getByText("Prepare sprint planning")).toBeVisible();
  });

  // ─── Sorting ─────────────────────────────────────────────────────────────────

  test("sorts tasks by title ascending", async ({ page }) => {
    const suffix = Date.now();
    await createTask(page, `Sort z ${suffix}`, "sort");
    await createTask(page, `Sort a ${suffix}`, "sort");

    await page.getByPlaceholder("Filter tasks...").fill(`${suffix}`);
    await page.locator("select#sort-by").selectOption("title");
    await page.locator("select#sort-direction").selectOption("asc");

    const rows = page.locator("ul li:not(.hidden)");
    const first = rows.first();
    await expect(first).toContainText(`Sort a ${suffix}`);
  });

  // ─── Board view ──────────────────────────────────────────────────────────────

  test("switches to board view and renders columns", async ({ page }) => {
    await page.getByRole("button", { name: /vista board/i }).click();

    await expect(page.getByLabel("Colonna To do")).toBeVisible();
    await expect(page.getByLabel("Colonna In progress")).toBeVisible();
    await expect(page.getByLabel("Colonna Completed")).toBeVisible();
  });

  test("switches back from board view to list view", async ({ page }) => {
    await page.getByRole("button", { name: /vista board/i }).click();
    await expect(page.getByLabel("Colonna To do")).toBeVisible();

    await page.getByRole("button", { name: /vista lista/i }).click();
    await expect(page.getByPlaceholder("Filter tasks...")).toBeVisible();
    await expect(page.getByLabel("Colonna To do")).not.toBeVisible();
  });

  test("shows state selector in board view cards", async ({ page }) => {
    const uniqueTitle = `Drag case ${Date.now()}`;
    await createTask(page, uniqueTitle, "drag me");

    await page.getByRole("button", { name: /vista board/i }).click();

    const draggableCard = page
      .locator("[data-task-id]")
      .filter({ hasText: uniqueTitle })
      .first();
    await expect(draggableCard).toBeVisible();
    const cardStateSelect = draggableCard.locator("select").first();
    await expect(cardStateSelect).toBeVisible();
    await expect(cardStateSelect.locator("option[value='To do']")).toHaveCount(
      1,
    );
    await expect(
      cardStateSelect.locator("option[value='in progress']"),
    ).toHaveCount(1);
    await expect(
      cardStateSelect.locator("option[value='completed']"),
    ).toHaveCount(1);
  });
});
