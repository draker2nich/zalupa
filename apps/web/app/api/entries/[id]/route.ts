import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, badRequest } from "@/lib/api-helpers";

interface Params { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!entry) return notFound("Entry not found");
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.moodLabel !== undefined) data.moodLabel = body.moodLabel;
  if (body.moodScore !== undefined) data.moodScore = body.moodScore;
  if (body.tags !== undefined) data.tags = body.tags;
  if (body.isCompleted !== undefined) data.isCompleted = body.isCompleted;

  if (Object.keys(data).length === 0) return badRequest("No fields to update");

  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) return notFound("Entry not found");

  const updated = await prisma.journalEntry.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) return notFound("Entry not found");

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}