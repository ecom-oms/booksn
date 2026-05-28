"use client";

import { UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api } from "../../lib/api";

export default function UploadsPage() {
  const [uploads, setUploads] = useState<any[]>([]);
  const [publisherEmail, setPublisherEmail] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const data = await api<{ items: any[] }>("/uploads");
    setUploads(data.items);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const form = new FormData();
    form.set("publisherEmail", publisherEmail);
    form.set("publisherName", publisherName);
    form.set("file", file);
    await api("/uploads/manual", { method: "POST", body: form });
    setFile(null);
    await load();
  }

  return (
    <Shell title="Upload Logs">
      <form onSubmit={submit} className="mb-5 rounded border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_220px_1fr_auto]">
          <input className="field" placeholder="Source email optional" value={publisherEmail} onChange={(event) => setPublisherEmail(event.target.value)} />
          <input className="field" placeholder="Source name optional" value={publisherName} onChange={(event) => setPublisherName(event.target.value)} />
          <input className="field pt-2" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <button className="btn" type="submit"><UploadCloud className="h-4 w-4" /> Import</button>
        </div>
      </form>
      <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
        <table className="w-full min-w-[820px]">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr><th className="table-cell">File</th><th className="table-cell">Publisher</th><th className="table-cell">Rows</th><th className="table-cell">Failed</th><th className="table-cell">Status</th><th className="table-cell">Imported</th></tr>
          </thead>
          <tbody>
            {uploads.map((upload) => (
              <tr key={upload.id}>
                <td className="table-cell">{upload.filename}</td>
                <td className="table-cell">{upload.publisher.name}</td>
                <td className="table-cell">{upload.successRows}/{upload.totalRows}</td>
                <td className="table-cell">{upload.failedRows}</td>
                <td className="table-cell">{upload.status}</td>
                <td className="table-cell">{new Date(upload.uploadedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
