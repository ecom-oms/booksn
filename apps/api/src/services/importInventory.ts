import { Prisma, prisma, UploadStatus } from "@books/db";
import { parseInventoryFile } from "@books/ingestion";

type ImportInput = {
  publisherEmail: string;
  publisherName?: string;
  filename: string;
  buffer: Buffer;
};

export async function importInventoryForPublisher(input: ImportInput) {
  const sourcePublisher = await prisma.publisher.upsert({
    where: { email: input.publisherEmail },
    create: {
      email: input.publisherEmail,
      name: input.publisherName || input.publisherEmail.split("@")[0],
    },
    update: {
      ...(input.publisherName ? { name: input.publisherName } : {}),
    },
  });

  const upload = await prisma.upload.create({
    data: {
      publisherId: sourcePublisher.id,
      filename: input.filename,
      status: UploadStatus.PROCESSING,
    },
  });

  try {
    const parsed = parseInventoryFile(input.buffer, input.filename);
    const status = parsed.failedRows.length > 0 ? UploadStatus.PARTIAL : UploadStatus.SUCCESS;
    const publisherGroups = groupRowsByPublisher(parsed.rows, sourcePublisher.name);
    const publisherRecords = new Map<string, { id: number; name: string }>();

    for (const publisherName of publisherGroups.keys()) {
      const publisher = await prisma.publisher.upsert({
        where: { email: publisherEmailFromName(publisherName) },
        create: { name: publisherName, email: publisherEmailFromName(publisherName) },
        update: { name: publisherName },
      });
      publisherRecords.set(publisherName, publisher);
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventory.deleteMany({
        where: { publisherId: { in: Array.from(publisherRecords.values()).map((publisher) => publisher.id) } },
      });

      for (const [publisherName, rows] of publisherGroups) {
        const publisher = publisherRecords.get(publisherName);
        if (!publisher) continue;

        for (const chunk of chunkRows(rows, 1000)) {
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
          status,
        },
      });
    }, { timeout: 120_000, maxWait: 20_000 });

    return prisma.upload.findUniqueOrThrow({
      where: { id: upload.id },
      include: { publisher: true },
    });
  } catch (error) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: UploadStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Unknown import error",
      },
    });
    throw error;
  }
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function groupRowsByPublisher<T extends { publisherName?: string }>(rows: T[], fallbackPublisherName: string) {
  const groups = new Map<string, T[]>();
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
