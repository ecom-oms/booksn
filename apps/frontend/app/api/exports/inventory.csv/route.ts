import { NextResponse } from "next/server";
import { ensureDatabase, prisma } from "../../../../lib/server/db";
import { buildWhere } from "../../inventory/route";

export async function GET(request: Request) {
  await ensureDatabase();
  const searchParams = new URL(request.url).searchParams;
  const rows = await prisma.inventory.findMany({
    where: buildWhere({
      q: searchParams.get("q") || undefined,
      bulk: searchParams.get("bulk") || undefined,
      stock: searchParams.get("stock") || "all",
      publisherId: searchParams.get("publisherId") ? Number(searchParams.get("publisherId")) : undefined,
    }),
    include: { publisher: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100_000,
  });

  const lines = ["ISBN,Title,Author,Stock,Publisher,Price,Currency,Binding,Subject,Category,Language,Published Year,Product Code,Updated At"];
  for (const row of rows) {
    lines.push([
      csv(row.isbn),
      csv(row.title ?? ""),
      csv(row.author ?? ""),
      row.stock,
      csv(row.publisher.name),
      row.price?.toString() ?? "",
      csv(row.currency ?? ""),
      csv(row.bindingType ?? ""),
      csv(row.subject ?? ""),
      csv(row.category ?? ""),
      csv(row.language ?? ""),
      row.publishedYear ?? "",
      csv(row.productCode ?? ""),
      row.updatedAt.toISOString(),
    ].join(","));
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=inventory-export.csv",
    },
  });
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

