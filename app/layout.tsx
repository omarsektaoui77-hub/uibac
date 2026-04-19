import type { Metadata } from "next";
import "./globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#171035]">
        <TelemetryProvider>
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
