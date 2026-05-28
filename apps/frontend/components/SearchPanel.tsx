"use client";

import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api, downloadExport } from "../lib/api";
import { InventoryTable } from "./InventoryTable";

type Publisher = { id: number; name: string };
type InventoryResponse = { items: any[]; total: number; page: number; pageSize: number };

export function SearchPanel({ bulkMode = false }: { bulkMode?: boolean }) {
  const [query, setQuery] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [stock, setStock] = useState("all");
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [result, setResult] = useState<InventoryResponse>({ items: [], total: 0, page: 1, pageSize: 50 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ items: Publisher[] }>("/publishers").then((data) => setPublishers(data.items)).catch(() => undefined);
  }, []);

  async function runSearch(page = 1) {
    setLoading(true);
    const params = new URLSearchParams({
      [bulkMode ? "bulk" : "q"]: query,
      page: String(page),
      pageSize: "50",
      stock,
    });
    if (publisherId) params.set("publisherId", publisherId);
    try {
      setResult(await api<InventoryResponse>(`/inventory?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }

  const exportParams = new URLSearchParams({
    [bulkMode ? "bulk" : "q"]: query,
    stock,
  });
  if (publisherId) exportParams.set("publisherId", publisherId);

  return (
    <div className="space-y-4">
      <div className="rounded border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_140px_auto]">
          {bulkMode ? (
            <textarea
              className="min-h-36 rounded border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-700"
              placeholder="Paste ISBNs or titles, one per line"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          ) : (
            <input className="field" placeholder="Search ISBN or title" value={query} onChange={(event) => setQuery(event.target.value)} />
          )}
          <select className="field" value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
            <option value="">All publishers</option>
            {publishers.map((publisher) => (
              <option key={publisher.id} value={publisher.id}>{publisher.name}</option>
            ))}
          </select>
          <select className="field" value={stock} onChange={(event) => setStock(event.target.value)}>
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <button className="btn" onClick={() => runSearch()} disabled={loading}>
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600">{result.total.toLocaleString()} matching records</div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => downloadExport("/exports/inventory.csv", exportParams, "inventory-export.csv")}>
            <Download className="h-4 w-4" /> CSV
          </button>
          <button className="btn-secondary" onClick={() => downloadExport("/exports/inventory.xlsx", exportParams, "inventory-export.xlsx")}>
            <Download className="h-4 w-4" /> XLSX
          </button>
        </div>
      </div>
      <InventoryTable items={result.items} />
      <div className="flex justify-end gap-2">
        <button className="btn-secondary" disabled={result.page <= 1} onClick={() => runSearch(result.page - 1)}>Previous</button>
        <button className="btn-secondary" disabled={result.page * result.pageSize >= result.total} onClick={() => runSearch(result.page + 1)}>Next</button>
      </div>
    </div>
  );
}
