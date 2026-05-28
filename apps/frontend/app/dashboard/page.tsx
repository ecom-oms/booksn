"use client";

import { useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api } from "../../lib/api";

export default function DashboardPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);

  useEffect(() => {
    api<{ items: any[] }>("/uploads").then((data) => setUploads(data.items)).catch(() => undefined);
    api<{ items: any[] }>("/publishers").then((data) => setPublishers(data.items)).catch(() => undefined);
  }, []);

  const inventoryCount = publishers.reduce((sum, publisher) => sum + (publisher._count?.inventory ?? 0), 0);
  const failed = uploads.filter((upload) => upload.status === "FAILED").length;

  return (
    <Shell title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Inventory rows" value={inventoryCount.toLocaleString()} />
        <Metric label="Publishers" value={publishers.length.toString()} />
        <Metric label="Recent failed imports" value={failed.toString()} />
      </div>
      <section className="mt-6 rounded border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3 font-medium">Recent imports</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <tbody>
              {uploads.slice(0, 10).map((upload) => (
                <tr key={upload.id}>
                  <td className="table-cell">{upload.filename}</td>
                  <td className="table-cell">{upload.publisher.name}</td>
                  <td className="table-cell">{upload.successRows}/{upload.totalRows}</td>
                  <td className="table-cell">{upload.status}</td>
                  <td className="table-cell">{new Date(upload.uploadedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
