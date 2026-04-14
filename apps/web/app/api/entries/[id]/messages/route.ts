import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest, notFound } from "@/lib/api-helpers";

interface Params { params: Promise<{ id: string }> }

// POST /api/entries/[id]/messages — save a user message
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId: user.id },
  });
  if (!entry) return notFound("Entry not found");

  const body = await req.json();
  const content = body.content?.trim();
  if (!content) return badRequest("Content is required");

  const message = await prisma.journalMessage.create({
    data: {
      entryId: id,
      role: "user",
      content,
    },
  });

  // Auto-set title from first user message
  if (!entry.title) {
    await prisma.journalEntry.update({
      where: { id },
      data: { title: content.slice(0, 60) + (content.length > 60 ? "..." : "") },
    });
  }

  return NextResponse.json(message, { status: 201 });
}