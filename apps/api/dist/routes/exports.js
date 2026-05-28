import ExcelJS from "exceljs";
import { Router } from "express";
import { prisma } from "@books/db";
import { buildInventoryWhere } from "./inventory.js";
export const exportRouter = Router();
exportRouter.get("/inventory.csv", async (req, res) => {
    const rows = await getExportRows(req.query);
    res.header("Content-Type", "text/csv");
    res.header("Content-Disposition", "attachment; filename=inventory-export.csv");
    res.write("ISBN,Title,Author,Stock,Publisher,Price,Currency,Binding,Subject,Category,Language,Published Year,Product Code,Updated At\n");
    for (const row of rows) {
        res.write([
            csv(row.isbn),
            csv(row.title ?? ""),
            csv(row.author ?? ""),
            row.stock,
            csv(row.publisher.name),
            row.price ?? "",
            csv(row.currency ?? ""),
            csv(row.bindingType ?? ""),
            csv(row.subject ?? ""),
            csv(row.category ?? ""),
            csv(row.language ?? ""),
            row.publishedYear ?? "",
            csv(row.productCode ?? ""),
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
    res.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.header("Content-Disposition", "attachment; filename=inventory-export.xlsx");
    await workbook.xlsx.write(res);
    res.end();
});
async function getExportRows(query) {
    const params = {
        q: query.q,
        bulk: query.bulk,
        publisherId: query.publisherId
            ? Number(query.publisherId)
            : undefined,
        stock: normalizeStock(query.stock),
        sort: "updatedAt",
        order: "desc",
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
function csv(value) {
    return `"${value.replace(/"/g, '""')}"`;
}
function normalizeStock(value) {
    return value === "in" || value === "out" ? value : "all";
}
