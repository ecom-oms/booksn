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
export declare function isSupportedInventoryFile(filename: string): boolean;
export declare function parseInventoryFile(buffer: Buffer, filename: string): ParseResult;
