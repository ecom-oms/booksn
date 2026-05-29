import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventory");
  sheet.columns = [
    { header: "ISBN", key: "isbn", width: 18 },
    { header: "Title", key: "title", width: 48 },
    { header: "Author", key: "author", width: 28 },
    { header: "Stock", key: "stock", width: 12 },
    { header: "Publisher", key: "publisher", width: 28 },
    { header: "Price", key: "price", width: 12 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Binding", key: "bindingType", width: 16 },
    { header: "Subject", key: "subject", width: 32 },
    { header: "Category", key: "category", width: 18 },
    { header: "Language", key: "language", width: 14 },
    { header: "Published Year", key: "publishedYear", width: 16 },
    { header: "Product Code", key: "productCode", width: 16 },
    { header: "Updated At", key: "updatedAt", width: 24 },
  ];
  rows.forEach((row) => sheet.addRow({
    isbn: row.isbn,
    title: row.title,
    author: row.author,
    stock: row.stock,
    publisher: row.publisher.name,
    price: row.price?.toString(),
    currency: row.currency,
    bindingType: row.bindingType,
    subject: row.subject,
    category: row.category,
    language: row.language,
    publishedYear: row.publishedYear,
    productCode: row.productCode,
    updatedAt: row.updatedAt.toISOString(),
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=inventory-export.xlsx",
    },
  });
}

