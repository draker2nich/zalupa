import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      plan: true,
      onboardingCompleted: true,
      goals: true,
      preferredTime: true,
    },
  });

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { name, goals, preferredTime } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (goals !== undefined) data.goals = goals;
  if (preferredTime !== undefined) data.preferredTime = preferredTime;

  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    goals: updated.goals,
    preferredTime: updated.preferredTime,
  });
}