import { NextResponse } from "next/server";
import { resetTasks } from "../store";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "not available" }, { status: 404 });
  }

  const tasks = resetTasks();
  return NextResponse.json({ count: tasks.length }, { status: 200 });
}