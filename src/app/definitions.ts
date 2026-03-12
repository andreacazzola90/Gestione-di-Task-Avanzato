export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
};

export type CreateTaskInput = Partial<Pick<Task, "title" | "description">>;

export type UpdateTaskInput = Partial<
  Pick<Task, "title" | "description" | "completed">
>;
