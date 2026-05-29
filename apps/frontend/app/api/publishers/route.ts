import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "../../../lib/server/db";
import { serializeItem } from "../../../lib/server/json";

export async function GET() {
  await ensureDatabase();
  const items = await prisma.publisher.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { inventory: true, uploads: true } } },
  });
  return NextResponse.json({ items: serializeItem(items) });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json();
  const item = await prisma.publisher.create({
    data: { name: String(body.name), email: String(body.email) },
  });
  return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
}

