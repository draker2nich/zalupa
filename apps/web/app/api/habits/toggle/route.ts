import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, notFound } from "@/lib/api-helpers";
import { toggleHabitSchema } from "@psyche-mirror/shared";

// POST /api/habits/toggle — toggle habit done/undone for a date
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = toggleHabitSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  // Verify habit belongs to user
  const habit = await prisma.habit.findFirst({
    where: { id: parsed.data.habitId, userId: user.id },
  });
  if (!habit) return notFound("Habit not found");

  const logDate = new Date(parsed.data.date);

  // Check if already logged
  const existing = await prisma.habitLog.findUnique({
    where: {
      habitId_logDate: {
        habitId: parsed.data.habitId,
        logDate,
      },
    },
  });

  if (existing) {
    // Un-toggle
    await prisma.habitLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false });
  } else {
    // Toggle on
    await prisma.habitLog.create({
      data: { habitId: parsed.data.habitId, logDate },
    });
    return NextResponse.json({ done: true });
  }
}