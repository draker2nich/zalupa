import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, notFound } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  if (!body.habitId || !body.date) return badRequest("habitId and date required");

  const habit = await prisma.habit.findFirst({
    where: { id: body.habitId, userId: user.id },
  });
  if (!habit) return notFound("Habit not found");

  const logDate = new Date(body.date);

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_logDate: { habitId: body.habitId, logDate } },
  });

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
    return NextResponse.json({ done: false });
  }

  await prisma.habitLog.create({
    data: { habitId: body.habitId, logDate },
  });
  return NextResponse.json({ done: true });
}