import { render, screen, waitFor } from "@testing-library/react";
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
    const onAdvanceTaskState = jest.fn().mockResolvedValue(true);
    const onDeleteTask = jest.fn().mockResolvedValue(true);
    const onEditTask = jest.fn().mockResolvedValue(true);

    render(
      <TaskCard
        task={baseTask}
        isMutating={false}
        onAdvanceTaskState={onAdvanceTaskState}
        onDeleteTask={onDeleteTask}
        onEditTask={onEditTask}
        {...overrides}
      />,
    );

    return { onAdvanceTaskState, onDeleteTask, onEditTask };
  };

  it("renders next state action", () => {
    setup();

    expect(
      screen.getByRole("button", { name: /passa a in progress/i }),
    ).toBeInTheDocument();
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const { onDeleteTask } = setup();

    await user.click(screen.getByRole("button", { name: /elimina/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(onDeleteTask).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("deletes when confirmation is accepted", async () => {
    const user = userEvent.setup();
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    const { onDeleteTask } = setup();

    await user.click(screen.getByRole("button", { name: /elimina/i }));

    await waitFor(() => expect(onDeleteTask).toHaveBeenCalledWith("task-1"));
    confirmSpy.mockRestore();
  });

  it("shows validation errors under edit inputs", async () => {
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
});
