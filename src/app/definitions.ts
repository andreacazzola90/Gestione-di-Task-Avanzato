export type TaskState = "To do" | "in progress" | "completed";

export type Task = {
  id: string;
  title: string;
  description?: string;
  state: TaskState;
  createdAt: string;
};

export type CreateTaskInput = Partial<Pick<Task, "title" | "description">>;

export type UpdateTaskInput = Partial<
  Pick<Task, "title" | "description" | "state">
>;
