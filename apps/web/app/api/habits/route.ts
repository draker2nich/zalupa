import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";
import { createHabitSchema } from "@psyche-mirror/shared";

// GET /api/habits?date=YYYY-MM-DD — list habits with done status for date
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
    include: {
      logs: {
        where: { logDate: new Date(dateStr) },
      },
    },
  });

  const result = habits.map((h: typeof habits[number]) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    sortOrder: h.sortOrder,
    done: h.logs.length > 0,
  }));

  return NextResponse.json(result);
}

// POST /api/habits — create habit
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const count = await prisma.habit.count({ where: { userId: user.id } });

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      emoji: parsed.data.emoji,
      sortOrder: count,
    },
  });

  return NextResponse.json(habit, { status: 201 });
}