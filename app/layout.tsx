import type { Metadata } from "next";
import "./globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import { Providers } from "./providers";

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#171035]" suppressHydrationWarning>
        <Providers>
          <TelemetryProvider>
            {children}
          </TelemetryProvider>
        </Providers>
      </body>
    </html>
  );
}
