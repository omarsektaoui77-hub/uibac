import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UIBAC",
  description: "Multilingual AI learning app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#171035]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
