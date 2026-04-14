import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized, notFound } from "@/lib/api-helpers";

interface Params { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  const { id } = await params;

  const intention = await prisma.intention.findFirst({
    where: { id, userId: user.id },
  });
  if (!intention) return notFound("Intention not found");

  await prisma.intention.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}