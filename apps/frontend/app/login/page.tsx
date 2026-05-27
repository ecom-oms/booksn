"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, setToken } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(response.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-teal-700 text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold">Inventory Ops Login</h1>
            <p className="text-sm text-zinc-500">Internal access only</p>
          </div>
        </div>
        <div className="space-y-3">
          <input className="field w-full" type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <input className="field w-full" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className="btn w-full" type="submit">Sign in</button>
        </div>
      </form>
    </main>
  );
}

