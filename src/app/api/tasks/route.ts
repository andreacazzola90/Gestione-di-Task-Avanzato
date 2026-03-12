import { NextResponse } from "next/server";
import type { CreateTaskInput } from "@/app/definitions";
import { createTask, getTasks } from "./store";

export async function GET() {
  return NextResponse.json(getTasks(), { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateTaskInput>;

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ message: "title is required" }, { status: 400 });
  }

  const description = body.description?.trim() || undefined;
  const task = createTask(body.title.trim(), description);

  return NextResponse.json(task, { status: 201 });
}
