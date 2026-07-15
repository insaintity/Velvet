import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Velvet",
  description: "Private AI music foundry for creating songs, albums and YouTube-ready releases.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
