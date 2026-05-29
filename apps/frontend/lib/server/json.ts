export function serializeItem(item: any): any {
  if (item === null || item === undefined) return item;
  if (typeof item === "bigint") return item.toString();
  if (item instanceof Date) return item.toISOString();
  if (Array.isArray(item)) return item.map(serializeItem);
  if (typeof item === "object") {
    if (typeof item.toString === "function" && item.constructor?.name === "Decimal") return item.toString();
    return Object.fromEntries(Object.entries(item).map(([key, value]) => [key, serializeItem(value)]));
  }
  return item;
}

