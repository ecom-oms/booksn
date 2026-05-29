import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "@e965/xlsx";

export type ParsedRow = {
  isbn: string;
  title?: string;
  author?: string;
  publisherName?: string;
  stock: number;
  price?: number;
  currency?: string;
  bindingType?: string;
  subject?: string;
  category?: string;
  language?: string;
  publishedYear?: number;
  productCode?: string;
  attributes: Record<string, string>;
};

export type ParseResult = {
  rows: ParsedRow[];
  failedRows: Array<{ rowNumber: number; reason: string; rawData: Record<string, unknown> }>;
  totalRows: number;
};

const aliases = {
  isbn: ["isbn", "isbn13", "ean", "ean13", "productcode", "bookcode"],
  title: ["bookname", "productname", "title", "name"],
  author: ["author", "author1", "writer", "contributor"],
  publisherName: ["publisher", "publishername", "publication", "imprint"],
  stock: ["qty", "quantity", "available", "stock", "avlqty"],
  price: ["price", "mrp", "rate"],
  currency: ["currency"],
  bindingType: ["binding", "bindingtype", "format"],
  subject: ["subject"],
  category: ["category"],
  language: ["language"],
  publishedYear: ["publishedyear", "year", "publicationyear"],
  productCode: ["productcode", "bookcode", "uacode", "sku", "itemcode"],
} as const;

type Field = keyof typeof aliases;

export function parseInventoryFile(buffer: Buffer, filename: string): ParseResult {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (extension === ".csv") {
    return normalizeSheets([parseCsv(buffer.toString("utf8"), {
      columns: true,
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    })]);
  }

  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  return normalizeSheets(workbook.SheetNames.map((name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "", raw: false })));
}

function normalizeSheets(sheets: Record<string, unknown>[][]): ParseResult {
  const rows: ParsedRow[] = [];
  const failedRows: ParseResult["failedRows"] = [];
  let rowNumber = 1;

  for (const sheetRows of sheets) {
    const mapping = buildMapping(sheetRows);
    for (const rawRow of sheetRows) {
      rowNumber += 1;
      if (Object.values(rawRow).every((value) => !clean(value))) continue;
      try {
        rows.push(normalizeRow(rawRow, mapping));
      } catch (error) {
        failedRows.push({ rowNumber, reason: error instanceof Error ? error.message : "Parse failed", rawData: rawRow });
      }
    }
  }

  return { rows: dedupe(rows), failedRows, totalRows: rows.length + failedRows.length };
}

function buildMapping(rows: Record<string, unknown>[]) {
  const mapping = new Map<Field, string>();
  for (const row of rows.slice(0, 25)) {
    for (const header of Object.keys(row)) {
      const normalized = normalizeHeader(header);
      for (const [field, names] of Object.entries(aliases) as [Field, readonly string[]][]) {
        if (!mapping.has(field) && names.includes(normalized)) mapping.set(field, header);
      }
    }
  }
  return mapping;
}

function normalizeRow(rawRow: Record<string, unknown>, mapping: Map<Field, string>): ParsedRow {
  const isbn = normalizeIsbn(read(rawRow, mapping, "isbn"));
  if (!isbn) throw new Error("Missing ISBN");

  const usedHeaders = new Set([...mapping.values()]);
  const attributes = Object.fromEntries(
    Object.entries(rawRow)
      .filter(([key, value]) => !usedHeaders.has(key) && clean(value))
      .map(([key, value]) => [key, clean(value) ?? ""]),
  );

  return {
    isbn,
    stock: parseIntSafe(read(rawRow, mapping, "stock"), 0),
    attributes,
    ...(clean(read(rawRow, mapping, "title")) ? { title: clean(read(rawRow, mapping, "title")) } : {}),
    ...(clean(read(rawRow, mapping, "author")) ? { author: clean(read(rawRow, mapping, "author")) } : {}),
    ...(clean(read(rawRow, mapping, "publisherName")) ? { publisherName: titleCase(clean(read(rawRow, mapping, "publisherName"))!) } : {}),
    ...(parsePrice(read(rawRow, mapping, "price")) !== undefined ? { price: parsePrice(read(rawRow, mapping, "price")) } : {}),
    ...(clean(read(rawRow, mapping, "currency")) ? { currency: clean(read(rawRow, mapping, "currency"))!.toUpperCase() } : {}),
    ...(clean(read(rawRow, mapping, "bindingType")) ? { bindingType: clean(read(rawRow, mapping, "bindingType")) } : {}),
    ...(clean(read(rawRow, mapping, "subject")) ? { subject: clean(read(rawRow, mapping, "subject")) } : {}),
    ...(clean(read(rawRow, mapping, "category")) ? { category: clean(read(rawRow, mapping, "category")) } : {}),
    ...(clean(read(rawRow, mapping, "language")) ? { language: clean(read(rawRow, mapping, "language"))!.toUpperCase() } : {}),
    ...(parseOptionalInt(read(rawRow, mapping, "publishedYear")) !== undefined ? { publishedYear: parseOptionalInt(read(rawRow, mapping, "publishedYear")) } : {}),
    ...(clean(read(rawRow, mapping, "productCode")) ? { productCode: clean(read(rawRow, mapping, "productCode")) } : {}),
  };
}

function read(row: Record<string, unknown>, mapping: Map<Field, string>, field: Field) {
  const key = mapping.get(field);
  return key ? row[key] : undefined;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function clean(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || undefined;
}

function normalizeIsbn(value: unknown) {
  const isbn = clean(value)?.replace(/[^0-9Xx]/g, "").toUpperCase() ?? "";
  if (!isbn) return "";
  if (isbn.length < 10 || isbn.length > 13) throw new Error(`Invalid ISBN: ${isbn}`);
  return isbn;
}

function parseIntSafe(value: unknown, fallback: number) {
  const text = clean(value)?.replace(/,/g, "");
  if (!text) return fallback;
  const parsed = Number.parseInt(text, 10);
  if (Number.isNaN(parsed)) throw new Error(`Invalid stock: ${text}`);
  return Math.max(parsed, 0);
}

function parseOptionalInt(value: unknown) {
  const text = clean(value)?.replace(/,/g, "");
  if (!text) return undefined;
  const parsed = Number.parseInt(text, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePrice(value: unknown) {
  const text = clean(value)?.replace(/[^0-9.]/g, "");
  if (!text) return undefined;
  const parsed = Number.parseFloat(text);
  if (Number.isNaN(parsed)) throw new Error(`Invalid price: ${text}`);
  return parsed;
}

function titleCase(value: string) {
  return value.split(" ").map((part) => part.length <= 2 ? part.toUpperCase() : part[0]!.toUpperCase() + part.slice(1)).join(" ");
}

function dedupe(rows: ParsedRow[]) {
  return Array.from(new Map(rows.map((row) => [`${row.publisherName ?? ""}:${row.isbn}`, row])).values());
}

