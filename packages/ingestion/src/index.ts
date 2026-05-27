import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "@e965/xlsx";

export type NormalizedInventoryRow = {
  isbn: string;
  title?: string;
  author?: string;
  stock: number;
  price?: number;
};

export type FailedRow = {
  rowNumber: number;
  reason: string;
  rawData: Record<string, unknown>;
};

export type ParseResult = {
  rows: NormalizedInventoryRow[];
  failedRows: FailedRow[];
  totalRows: number;
};

type CanonicalField = keyof NormalizedInventoryRow;

const aliases: Record<CanonicalField, string[]> = {
  isbn: ["isbn", "isbn13", "ean", "ean13", "productcode", "bookcode"],
  stock: ["qty", "quantity", "available", "stock", "avlqty"],
  title: ["bookname", "productname", "title"],
  price: ["price", "mrp", "rate"],
  author: ["author", "writer", "contributor"],
};

const supportedExtensions = new Set([".xlsx", ".xls", ".csv"]);

export function isSupportedInventoryFile(filename: string) {
  return supportedExtensions.has(getExtension(filename));
}

export function parseInventoryFile(buffer: Buffer, filename: string): ParseResult {
  const extension = getExtension(filename);

  if (extension === ".csv") {
    return normalizeSheets([parseCsvSheet(buffer)]);
  }

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
    const sheets = workbook.SheetNames.map((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });
    });
    return normalizeSheets(sheets);
  }

  throw new Error(`Unsupported file type: ${extension || "unknown"}`);
}

function parseCsvSheet(buffer: Buffer) {
  return parseCsv(buffer.toString("utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, unknown>[];
}

function normalizeSheets(sheets: Record<string, unknown>[][]): ParseResult {
  const rows: NormalizedInventoryRow[] = [];
  const failedRows: FailedRow[] = [];
  let rowNumber = 1;

  for (const sheetRows of sheets) {
    const mapping = buildColumnMapping(sheetRows);

    for (const rawRow of sheetRows) {
      rowNumber += 1;
      if (isEmptyRow(rawRow)) continue;

      try {
        const normalized = normalizeRow(rawRow, mapping);
        rows.push(normalized);
      } catch (error) {
        failedRows.push({
          rowNumber,
          reason: error instanceof Error ? error.message : "Unknown parse error",
          rawData: rawRow,
        });
      }
    }
  }

  return {
    rows: dedupeByPublisherFile(rows),
    failedRows,
    totalRows: rows.length + failedRows.length,
  };
}

function buildColumnMapping(rows: Record<string, unknown>[]) {
  const headers = new Set<string>();
  rows.slice(0, 25).forEach((row) => Object.keys(row).forEach((key) => headers.add(key)));
  const mapping = new Map<CanonicalField, string>();

  for (const header of headers) {
    const normalizedHeader = normalizeHeader(header);
    for (const [field, fieldAliases] of Object.entries(aliases) as [CanonicalField, string[]][]) {
      if (!mapping.has(field) && fieldAliases.includes(normalizedHeader)) {
        mapping.set(field, header);
      }
    }
  }

  return mapping;
}

function normalizeRow(rawRow: Record<string, unknown>, mapping: Map<CanonicalField, string>) {
  const isbn = normalizeIsbn(readMappedValue(rawRow, mapping, "isbn"));
  if (!isbn) throw new Error("Missing ISBN/EAN column value");

  const stock = parseInteger(readMappedValue(rawRow, mapping, "stock"), 0);
  const price = parsePrice(readMappedValue(rawRow, mapping, "price"));
  const title = cleanString(readMappedValue(rawRow, mapping, "title"));
  const author = cleanString(readMappedValue(rawRow, mapping, "author"));

  return {
    isbn,
    stock,
    ...(title ? { title } : {}),
    ...(author ? { author } : {}),
    ...(price !== undefined ? { price } : {}),
  };
}

function readMappedValue(rawRow: Record<string, unknown>, mapping: Map<CanonicalField, string>, field: CanonicalField) {
  const key = mapping.get(field);
  return key ? rawRow[key] : undefined;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeIsbn(value: unknown) {
  const cleaned = cleanString(value)?.replace(/[^0-9Xx]/g, "").toUpperCase();
  if (!cleaned) return "";
  if (cleaned.length < 10 || cleaned.length > 13) {
    throw new Error(`Invalid ISBN/EAN value: ${cleaned}`);
  }
  return cleaned;
}

function parseInteger(value: unknown, fallback: number) {
  const cleaned = cleanString(value)?.replace(/,/g, "");
  if (!cleaned) return fallback;
  const parsed = Number.parseInt(cleaned, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid stock value: ${cleaned}`);
  return Math.max(parsed, 0);
}

function parsePrice(value: unknown) {
  const cleaned = cleanString(value)?.replace(/[^0-9.]/g, "");
  if (!cleaned) return undefined;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) throw new Error(`Invalid price value: ${cleaned}`);
  return parsed;
}

function cleanString(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function isEmptyRow(row: Record<string, unknown>) {
  return Object.values(row).every((value) => !cleanString(value));
}

function dedupeByPublisherFile(rows: NormalizedInventoryRow[]) {
  const byIsbn = new Map<string, NormalizedInventoryRow>();
  for (const row of rows) {
    const existing = byIsbn.get(row.isbn);
    byIsbn.set(row.isbn, existing ? { ...existing, ...row, stock: row.stock } : row);
  }
  return Array.from(byIsbn.values());
}

function getExtension(filename: string) {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}
