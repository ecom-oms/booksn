"use client";

import { useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api, getToken } from "../../lib/api";

export default function FailedImportsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!getToken()) window.location.href = "/login";
    api<{ items: any[] }>("/uploads/failed-rows").then((data) => setItems(data.items)).catch(() => undefined);
  }, []);

  return (
    <Shell title="Failed Imports">
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full min-w-[900px]">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr><th className="table-cell">Publisher</th><th className="table-cell">File</th><th className="table-cell">Row</th><th className="table-cell">Reason</th><th className="table-cell">Raw data</th></tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td className="table-cell">{row.upload.publisher.name}</td>
                <td className="table-cell">{row.upload.filename}</td>
                <td className="table-cell">{row.rowNumber}</td>
                <td className="table-cell text-red-700">{row.reason}</td>
                <td className="table-cell font-mono text-xs">{JSON.stringify(row.rawData).slice(0, 180)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

