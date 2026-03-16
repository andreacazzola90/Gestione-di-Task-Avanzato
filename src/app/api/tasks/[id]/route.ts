import { NextResponse } from "next/server";
import type { TaskState, UpdateTaskInput } from "@/app/definitions";
import { deleteTask, updateTask } from "../store";

const ALLOWED_STATES: TaskState[] = ["To do", "in progress", "completed"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as UpdateTaskInput;

  if (body.state && !ALLOWED_STATES.includes(body.state)) {
    return NextResponse.json(
      { message: "state must be one of: To do, in progress, completed" },
      { status: 400 },
    );
  }

  const updatedTask = updateTask(id, body);

  if (!updatedTask) {
    return NextResponse.json({ message: "task not found" }, { status: 404 });
  }

  return NextResponse.json(updatedTask, { status: 200 });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = deleteTask(id);

  if (!deleted) {
    return NextResponse.json({ message: "task not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
