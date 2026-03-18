import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCard } from "./task-card";

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("TaskCard", () => {
  const baseTask = {
    id: "task-1",
    title: "Task title",
    description: "Task description",
    state: "To do" as const,
    createdAt: "2026-03-10T08:00:00.000Z",
  };

  const setup = (
    overrides?: Partial<React.ComponentProps<typeof TaskCard>>,
  ) => {
    const onUpdateTaskState = jest.fn().mockResolvedValue(true);
    const onDeleteTask = jest.fn().mockResolvedValue(true);
    const onEditTask = jest.fn().mockResolvedValue(true);

    render(
      <TaskCard
        task={baseTask}
        isMutating={false}
        onUpdateTaskState={onUpdateTaskState}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        {...overrides}
      />,
    );

    return { onUpdateTaskState, onDeleteTask, onEditTask };
  };

  it("renders task title and state selector", () => {
    setup();
    expect(screen.getByText("Task title")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /stato task/i })).toHaveValue(
      "To do",
    );
  });

  it("updates task state using the select", async () => {
    const user = userEvent.setup();
    const { onUpdateTaskState } = setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /stato task/i }),
      "in progress",
    );

    await waitFor(() => {
      expect(onUpdateTaskState).toHaveBeenCalledWith("task-1", "in progress");
    });
  });

  it("opens edit dialog and validates required fields", async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole("button", { name: /modifica/i }));

    const titleInput = await screen.findByLabelText(/titolo/i);
    const descriptionInput = screen.getByLabelText(/descrizione/i);

    await user.clear(titleInput);
    await user.clear(descriptionInput);
    await user.click(screen.getByRole("button", { name: /salva/i }));

    expect(
      await screen.findByText("Il titolo e obbligatorio"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("La descrizione e obbligatoria"),
    ).toBeInTheDocument();
  });

  it("confirms delete via dialog and calls onDeleteTask", async () => {
    const user = userEvent.setup();
    const { onDeleteTask } = setup();

    await user.click(screen.getByRole("button", { name: /elimina/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /^elimina$/i }),
    );

    await waitFor(() => {
      expect(onDeleteTask).toHaveBeenCalledWith("task-1");
    });
  });

  it("cancels delete dialog without deleting", async () => {
    const user = userEvent.setup();
    const { onDeleteTask } = setup();

    await user.click(screen.getByRole("button", { name: /elimina/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /annulla/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(onDeleteTask).not.toHaveBeenCalled();
  });
});
