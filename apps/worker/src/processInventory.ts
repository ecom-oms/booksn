import { Prisma, prisma, UploadStatus } from "@books/db";
import { parseInventoryFile } from "@books/ingestion";

type ImportInput = {
  publisherEmail: string;
  publisherName?: string;
  filename: string;
  buffer: Buffer;
};

export async function importInventoryForPublisher(input: ImportInput) {
  const publisher = await prisma.publisher.upsert({
    where: { email: input.publisherEmail },
    create: {
      email: input.publisherEmail,
      name: input.publisherName || input.publisherEmail.split("@")[0],
    },
    update: input.publisherName ? { name: input.publisherName } : {},
  });

  const upload = await prisma.upload.create({
    data: {
      publisherId: publisher.id,
      filename: input.filename,
      status: UploadStatus.PROCESSING,
    },
  });

  try {
    const parsed = parseInventoryFile(input.buffer, input.filename);
    await prisma.$transaction(async (tx) => {
      await tx.inventory.deleteMany({ where: { publisherId: publisher.id } });

      for (const chunk of chunkRows(parsed.rows, 1000)) {
        await tx.inventory.createMany({
          data: chunk.map((row) => ({
            isbn: row.isbn,
            title: row.title,
            author: row.author,
            stock: row.stock,
            price: row.price === undefined ? undefined : new Prisma.Decimal(row.price),
            publisherId: publisher.id,
          })),
          skipDuplicates: true,
        });
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
    }, { timeout: 120_000, maxWait: 20_000 });

    console.log(`Imported ${parsed.rows.length}/${parsed.totalRows} rows from ${input.filename}`);
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
