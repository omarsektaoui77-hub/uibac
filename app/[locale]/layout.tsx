import type { Metadata } from "next";
import "../globals.css";
import { TelemetryProvider } from "@/components/TelemetryProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from "@/app/providers";

export const dynamic = "force-dynamic";

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
  params: { locale: string };
}) {
  const { locale } = params;
  console.log('[I18N DEBUG] Layout.tsx - Received locale:', locale);
  
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = await getMessages({ locale });
  
  console.log('[I18N DEBUG] Layout.tsx - getMessages result keys:', Object.keys(messages));
  console.log('[I18N DEBUG] Layout.tsx - Direction:', direction);

  return (
    <html lang={locale} dir={direction} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#171035]" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <TelemetryProvider>
              <ServiceWorkerRegistration />
              {children}
            </TelemetryProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
