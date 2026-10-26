import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mankota — Batik Warisan Nusantara", template: "%s | Mankota" },
  description: "Batik autentik karya perajin Laweyan, Surakarta. Koleksi batik tulis, cap, dan kombinasi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
