"use client";

import { Plus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Shell } from "../../components/Shell";
import { api, getToken } from "../../lib/api";

export default function PublishersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function load() {
    setItems((await api<{ items: any[] }>("/publishers")).items);
  }

  useEffect(() => {
    if (!getToken()) window.location.href = "/login";
    load().catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await api("/publishers", { method: "POST", body: JSON.stringify({ name, email }) });
    setName("");
    setEmail("");
    await load();
  }

  return (
    <Shell title="Publisher Management">
      <form onSubmit={submit} className="mb-5 rounded border border-zinc-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className="field" placeholder="Publisher name" value={name} onChange={(event) => setName(event.target.value)} />
          <input className="field" placeholder="Publisher email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className="btn" type="submit"><Plus className="h-4 w-4" /> Add</button>
        </div>
      </form>
      <div className="rounded border border-zinc-200 bg-white">
        {items.map((publisher) => (
          <div key={publisher.id} className="grid gap-2 border-b border-zinc-200 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_140px_120px]">
            <div className="font-medium">{publisher.name}</div>
            <div>{publisher.email}</div>
            <div>{publisher._count.inventory.toLocaleString()} rows</div>
            <div>{publisher._count.uploads} uploads</div>
          </div>
        ))}
      </div>
    </Shell>
  );
}

