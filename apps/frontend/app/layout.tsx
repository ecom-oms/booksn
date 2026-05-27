import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Books Inventory Ops",
  description: "Internal inventory ingestion and search system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

