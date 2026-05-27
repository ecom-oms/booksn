"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, Download, FileWarning, Home, LogOut, Search, UploadCloud, Users } from "lucide-react";
import { clearToken } from "../lib/api";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Search },
  { href: "/bulk", label: "Bulk Query", icon: BookOpen },
  { href: "/uploads", label: "Upload Logs", icon: UploadCloud },
  { href: "/publishers", label: "Publishers", icon: Users },
  { href: "/failed-imports", label: "Failed Imports", icon: FileWarning },
  { href: "/exports", label: "Exports", icon: Download },
];

export function Shell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-5">
          <BarChart3 className="h-5 w-5 text-teal-700" />
          <span className="font-semibold">Inventory Ops</span>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-10 items-center gap-3 rounded px-3 text-sm ${
                  active ? "bg-teal-50 font-medium text-teal-800" : "text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-8">
          <h1 className="text-lg font-semibold">{title}</h1>
          <button className="btn-secondary" onClick={logout} title="Log out">
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

