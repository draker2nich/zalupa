import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound, badRequest } from "@/lib/api-helpers";
import { updateEntrySchema } from "@psyche-mirror/shared";

interface Params { params: Promise<{ id: string }> }

// GET /api/entries/[id] — get entry with all messages
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!entry) return notFound("Entry not found");
  return NextResponse.json(entry);
}

// PATCH /api/entries/[id] — update entry metadata
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const body = await req.json();
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!entry) return notFound("Entry not found");

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/entries/[id] — delete entry (CCPA)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!entry) return notFound("Entry not found");

  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}