import type { Metadata } from "next";
import "../globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";

export const metadata: Metadata = {
  title: "UIBAC",
  description: "Multilingual AI learning app",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const direction = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={direction} className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#171035]">
        <TelemetryProvider>
          {children}
        </TelemetryProvider>
      </body>
    </html>
  );
}
