import type { Metadata } from "next";
import "./globals.css";
import { useState } from "react";

export const metadata: Metadata = {
  title: "UIBAC",
  description: "UIBAC workflow app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [xp, setXp] = useState(0);
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
