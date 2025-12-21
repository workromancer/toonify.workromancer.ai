import type { Metadata } from "next";
import { Geist, Geist_Mono, Spline_Sans } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const splineSans = Spline_Sans({
  variable: "--font-spline-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Toonify - AI Webtoon Studio",
  description: "Create your own webtoon with AI Director",
};

import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { ClerkProvider } from "@clerk/nextjs";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale} suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`${splineSans.variable} ${geistSans.variable} ${geistMono.variable} antialiased font-display bg-background-light dark:bg-background-dark`}
        >
          <NextIntlClientProvider messages={messages}>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
