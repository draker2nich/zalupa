import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { name, goals, preferredTime } = body;

  if (!name || !goals || !preferredTime) {
    return badRequest("name, goals, and preferredTime are required");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      goals,
      preferredTime,
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    onboardingCompleted: updated.onboardingCompleted,
  });
}