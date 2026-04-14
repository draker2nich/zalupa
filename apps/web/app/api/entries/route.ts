import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, badRequest } from "@/lib/api-helpers";

// GET /api/entries
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
        take: 1,
      },
    },
  });

  return NextResponse.json({
    entries,
    nextCursor: entries.length === limit ? entries[entries.length - 1].id : null,
  });
}

// POST /api/entries
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const body = await req.json();
  const sessionMode = body.sessionMode || "free";
  const personaId = body.personaId || "mirror";

  if (!["morning", "evening", "free"].includes(sessionMode)) {
    return badRequest("Invalid sessionMode");
  }

  const entry = await prisma.journalEntry.create({
    data: { userId: user.id, sessionMode, personaId },
  });

  return NextResponse.json(entry, { status: 201 });
}