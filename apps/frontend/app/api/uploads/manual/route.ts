import { NextResponse } from "next/server";
import { Prisma, UploadStatus } from "@prisma/client";
import { ensureDatabase, prisma } from "../../../../lib/server/db";
import { serializeItem } from "../../../../lib/server/json";
import { parseInventoryFile, type ParsedRow } from "../../../../lib/server/parser";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  await ensureDatabase();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please upload a file." }, { status: 400 });
  }

  const sourceEmail = String(form.get("publisherEmail") || "manual-stocklist@publisher.local");
  const sourceName = String(form.get("publisherName") || "Manual Stock List");
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const item = await importInventory({
      sourceEmail,
      sourceName,
      filename: file.name,
      buffer,
    });
    return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Import failed" }, { status: 500 });
  }
}

async function importInventory(input: { sourceEmail: string; sourceName: string; filename: string; buffer: Buffer }) {
  const sourcePublisher = await prisma.publisher.upsert({
    where: { email: input.sourceEmail },
    create: { email: input.sourceEmail, name: input.sourceName },
    update: { name: input.sourceName },
  });

  const upload = await prisma.upload.create({
    data: { publisherId: sourcePublisher.id, filename: input.filename, status: UploadStatus.PROCESSING },
  });

  try {
    const parsed = parseInventoryFile(input.buffer, input.filename);
    const groups = groupRowsByPublisher(parsed.rows, sourcePublisher.name);
    const publisherRecords = new Map<string, { id: number; name: string }>();

    for (const publisherName of groups.keys()) {
      const email = publisherEmailFromName(publisherName);
      const publisher = await prisma.publisher.upsert({
        where: { email },
        create: { name: publisherName, email },
        update: { name: publisherName },
      });
      publisherRecords.set(publisherName, publisher);
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventory.deleteMany({
        where: { publisherId: { in: Array.from(publisherRecords.values()).map((publisher) => publisher.id) } },
      });

      for (const [publisherName, rows] of groups) {
        const publisher = publisherRecords.get(publisherName);
        if (!publisher) continue;

        for (const chunk of chunkRows(rows, 750)) {
          await tx.inventory.createMany({
            data: chunk.map((row) => ({
              isbn: row.isbn,
              title: row.title,
              author: row.author,
              stock: row.stock,
              price: row.price === undefined ? undefined : new Prisma.Decimal(row.price),
              currency: row.currency,
              bindingType: row.bindingType,
              subject: row.subject,
              category: row.category,
              language: row.language,
              publishedYear: row.publishedYear,
              productCode: row.productCode,
              attributes: row.attributes as Prisma.InputJsonValue,
              publisherId: publisher.id,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (parsed.failedRows.length > 0) {
        await tx.failedImportRow.createMany({
          data: parsed.failedRows.slice(0, 5000).map((row) => ({
            uploadId: upload.id,
            rowNumber: row.rowNumber,
            reason: row.reason,
            rawData: row.rawData as Prisma.InputJsonValue,
          })),
        });
      }

      await tx.upload.update({
        where: { id: upload.id },
        data: {
          totalRows: parsed.totalRows,
          successRows: parsed.rows.length,
          failedRows: parsed.failedRows.length,
          status: parsed.failedRows.length > 0 ? UploadStatus.PARTIAL : UploadStatus.SUCCESS,
        },
      });
    }, { maxWait: 20_000, timeout: 120_000 });

    return prisma.upload.findUniqueOrThrow({ where: { id: upload.id }, include: { publisher: true } });
  } catch (error) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: UploadStatus.FAILED, errorMessage: error instanceof Error ? error.message : "Unknown import error" },
    });
    throw error;
  }
}

function groupRowsByPublisher(rows: ParsedRow[], fallbackPublisherName: string) {
  const groups = new Map<string, ParsedRow[]>();
  for (const row of rows) {
    const publisherName = row.publisherName || fallbackPublisherName;
    groups.set(publisherName, [...(groups.get(publisherName) ?? []), row]);
  }
  return groups;
}

function publisherEmailFromName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
  return `${slug}@publisher.local`;
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size));
  return chunks;
}

