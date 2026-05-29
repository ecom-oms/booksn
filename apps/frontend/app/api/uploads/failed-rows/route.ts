import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "../../../../lib/server/db";
import { serializeItem } from "../../../../lib/server/json";

export async function GET() {
  await ensureDatabase();
  const items = await prisma.failedImportRow.findMany({
    include: { upload: { include: { publisher: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ items: serializeItem(items) });
}

