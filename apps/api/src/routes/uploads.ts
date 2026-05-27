import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "@books/db";
import { isSupportedInventoryFile } from "@books/ingestion";
import { requireAuth } from "../middleware/auth.js";
import { importInventoryForPublisher } from "../services/importInventory.js";

export const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

uploadRouter.use(requireAuth);

uploadRouter.get("/", async (req, res) => {
  const status = z.enum(["PROCESSING", "SUCCESS", "PARTIAL", "FAILED"]).optional().safeParse(req.query.status);
  const uploads = await prisma.upload.findMany({
    where: status.success ? { status: status.data } : undefined,
    include: { publisher: true },
    orderBy: { uploadedAt: "desc" },
    take: 200,
  });
  res.json({ items: uploads });
});

uploadRouter.get("/failed-rows", async (_req, res) => {
  const rows = await prisma.failedImportRow.findMany({
    include: { upload: { include: { publisher: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json({ items: rows });
});

uploadRouter.post("/manual", upload.single("file"), async (req, res) => {
  const schema = z.object({
    publisherEmail: z.string().email(),
    publisherName: z.string().optional(),
  });
  const body = schema.parse(req.body);
  if (!req.file || !isSupportedInventoryFile(req.file.originalname)) {
    res.status(400).json({ message: "Upload a .xlsx, .xls, or .csv inventory file" });
    return;
  }

  const result = await importInventoryForPublisher({
    publisherEmail: body.publisherEmail,
    publisherName: body.publisherName,
    filename: req.file.originalname,
    buffer: req.file.buffer,
  });

  res.status(201).json({ item: result });
});

