import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "../../../lib/server/db";
import { serializeItem } from "../../../lib/server/json";

export async function GET(request: Request) {
  await ensureDatabase();
  const searchParams = new URL(request.url).searchParams;
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") || 50), 1), 200);
  const q = searchParams.get("q") || undefined;
  const bulk = searchParams.get("bulk") || undefined;
  const stock = searchParams.get("stock") || "all";
  const publisherId = searchParams.get("publisherId") ? Number(searchParams.get("publisherId")) : undefined;
  const where = buildWhere({ q, bulk, stock, publisherId });

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where,
      include: { publisher: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inventory.count({ where }),
  ]);

  return NextResponse.json({ items: serializeItem(items), total, page, pageSize });
}

export function buildWhere(params: { q?: string; bulk?: string; stock?: string; publisherId?: number }) {
  const terms = splitTerms(params.bulk || params.q);
  return {
    ...(params.publisherId ? { publisherId: params.publisherId } : {}),
    ...(params.stock === "in" ? { stock: { gt: 0 } } : {}),
    ...(params.stock === "out" ? { stock: 0 } : {}),
    ...(terms.length === 1 ? {
      OR: [
        { isbn: { contains: terms[0] } },
        { title: { contains: terms[0] } },
        { author: { contains: terms[0] } },
        { productCode: { contains: terms[0] } },
        { publisher: { name: { contains: terms[0] } } },
      ],
    } : {}),
    ...(terms.length > 1 ? {
      OR: [
        { isbn: { in: terms } },
        ...terms.map((term) => ({ title: { contains: term } })),
        ...terms.map((term) => ({ author: { contains: term } })),
        ...terms.map((term) => ({ productCode: { contains: term } })),
        ...terms.map((term) => ({ publisher: { name: { contains: term } } })),
      ],
    } : {}),
  };
}

function splitTerms(value?: string) {
  return (value ?? "").split(/\r?\n|,/).map((term) => term.trim()).filter(Boolean).slice(0, 1000);
}

