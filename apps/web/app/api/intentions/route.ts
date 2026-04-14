import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const intentions = await prisma.intention.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(intentions);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const { title, emoji } = body;
  if (!title) return badRequest("title is required");

  const count = await prisma.intention.count({ where: { userId: user.id } });

  const intention = await prisma.intention.create({
    data: {
      userId: user.id,
      title,
      emoji: emoji || "🎯",
      sortOrder: count,
    },
  });

  return NextResponse.json(intention, { status: 201 });
}