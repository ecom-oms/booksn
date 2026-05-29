import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "../../../lib/server/db";
import { serializeItem } from "../../../lib/server/json";

export async function GET(request: Request) {
  await ensureDatabase();
  const status = new URL(request.url).searchParams.get("status") || undefined;
  const items = await prisma.upload.findMany({
    where: status ? { status: status as any } : undefined,
    include: { publisher: true },
    orderBy: { uploadedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items: serializeItem(items) });
}

