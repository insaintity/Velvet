import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Velvet",
  description: "AI music foundry for creating songs, albums and YouTube-ready releases."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
