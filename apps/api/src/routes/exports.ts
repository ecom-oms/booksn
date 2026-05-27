import ExcelJS from "exceljs";
import { Router } from "express";
import { prisma } from "@books/db";
import { requireAuth } from "../middleware/auth.js";
import { buildInventoryWhere } from "./inventory.js";

export const exportRouter = Router();
exportRouter.use(requireAuth);

exportRouter.get("/inventory.csv", async (req, res) => {
  const rows = await getExportRows(req.query);
  res.header("Content-Type", "text/csv");
  res.header("Content-Disposition", "attachment; filename=inventory-export.csv");
  res.write("ISBN,Title,Stock,Publisher,Price,Updated At\n");
  for (const row of rows) {
    res.write([
      csv(row.isbn),
      csv(row.title ?? ""),
      row.stock,
      csv(row.publisher.name),
      row.price ?? "",
      row.updatedAt.toISOString(),
    ].join(",") + "\n");
  }
  res.end();
});

exportRouter.get("/inventory.xlsx", async (req, res) => {
  const rows = await getExportRows(req.query);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventory");
  sheet.columns = [
    { header: "ISBN", key: "isbn", width: 18 },
    { header: "Title", key: "title", width: 48 },
    { header: "Stock", key: "stock", width: 12 },
    { header: "Publisher", key: "publisher", width: 28 },
    { header: "Price", key: "price", width: 12 },
    { header: "Updated At", key: "updatedAt", width: 24 },
  ];
  rows.forEach((row) => sheet.addRow({
    isbn: row.isbn,
    title: row.title,
    stock: row.stock,
    publisher: row.publisher.name,
    price: row.price?.toString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.header("Content-Disposition", "attachment; filename=inventory-export.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

async function getExportRows(query: unknown) {
  const params = {
    q: (query as Record<string, string>).q,
    bulk: (query as Record<string, string>).bulk,
    publisherId: (query as Record<string, string>).publisherId
      ? Number((query as Record<string, string>).publisherId)
      : undefined,
    stock: normalizeStock((query as Record<string, string>).stock),
    sort: "updatedAt" as const,
    order: "desc" as const,
    page: 1,
    pageSize: 200,
  };

  return prisma.inventory.findMany({
    where: buildInventoryWhere(params),
    include: { publisher: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100_000,
  });
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeStock(value?: string): "all" | "in" | "out" {
  return value === "in" || value === "out" ? value : "all";
}
