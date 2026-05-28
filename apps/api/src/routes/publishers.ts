import { Router } from "express";
import { z } from "zod";
import { prisma } from "@books/db";

export const publisherRouter = Router();

const publisherSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

publisherRouter.get("/", async (_req, res) => {
  const publishers = await prisma.publisher.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { inventory: true, uploads: true } } },
  });
  res.json({ items: publishers });
});

publisherRouter.post("/", async (req, res) => {
  const data = publisherSchema.parse(req.body);
  const publisher = await prisma.publisher.create({ data });
  res.status(201).json({ item: publisher });
});

publisherRouter.put("/:id", async (req, res) => {
  const data = publisherSchema.parse(req.body);
  const publisher = await prisma.publisher.update({
    where: { id: Number(req.params.id) },
    data,
  });
  res.json({ item: publisher });
});
