import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";
import { createEntrySchema } from "@psyche-mirror/shared";

// GET /api/entries — list entries for current user
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const limit = Math.min(Number.parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const cursor = url.searchParams.get("cursor") || undefined;

  const entries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1, // just first message for preview
      },
    },
  });

  return NextResponse.json({
    entries,
    nextCursor: entries.length === limit ? entries[entries.length - 1].id : null,
  });
}

// POST /api/entries — create new entry
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const entry = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      sessionMode: parsed.data.sessionMode,
      personaId: parsed.data.personaId,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}