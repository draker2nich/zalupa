import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound } from "@/lib/api-helpers";

interface Params { params: Promise<{ id: string }> }

// DELETE /api/habits/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const habit = await prisma.habit.findFirst({
    where: { id, userId: user.id },
  });
  if (!habit) return notFound("Habit not found");

  await prisma.habit.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}