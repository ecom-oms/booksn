import { Router } from "express";
import { z } from "zod";
import { prisma } from "@books/db";
export const inventoryRouter = Router();
const searchSchema = z.object({
    q: z.string().optional(),
    bulk: z.string().optional(),
    publisherId: z.coerce.number().optional(),
    stock: z.enum(["all", "in", "out"]).default("all"),
    sort: z.enum(["updatedAt", "isbn", "title", "stock"]).default("updatedAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
inventoryRouter.get("/", async (req, res) => {
    const params = searchSchema.parse(req.query);
    const where = buildInventoryWhere(params);
    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await Promise.all([
        prisma.inventory.findMany({
            where,
            include: { publisher: { select: { id: true, name: true } } },
            orderBy: { [params.sort]: params.order },
            skip,
            take: params.pageSize,
        }),
        prisma.inventory.count({ where }),
    ]);
    res.json({ items, total, page: params.page, pageSize: params.pageSize });
});
export function buildInventoryWhere(params) {
    const terms = splitTerms(params.bulk || params.q);
    return {
        ...(params.publisherId ? { publisherId: params.publisherId } : {}),
        ...(params.stock === "in" ? { stock: { gt: 0 } } : {}),
        ...(params.stock === "out" ? { stock: 0 } : {}),
        ...(terms.length === 1
            ? {
                OR: [
                    { isbn: { contains: terms[0] } },
                    { title: { contains: terms[0] } },
                ],
            }
            : {}),
        ...(terms.length > 1
            ? {
                OR: [
                    { isbn: { in: terms } },
                    ...terms.map((term) => ({ title: { contains: term } })),
                ],
            }
            : {}),
    };
}
export function splitTerms(value) {
    return (value ?? "")
        .split(/\r?\n|,/)
        .map((term) => term.trim())
        .filter(Boolean)
        .slice(0, 1000);
}
