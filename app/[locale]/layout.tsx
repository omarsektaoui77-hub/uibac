import type { Metadata } from "next";
import "../globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export const metadata: Metadata = {
  title: "UIBAC",
  description: "Multilingual AI learning app",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "UIbac",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
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
  const messages = await getMessages();

  return (
    <html lang={locale} dir={direction} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#171035]" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TelemetryProvider>
            <ServiceWorkerRegistration />
            {children}
          </TelemetryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
