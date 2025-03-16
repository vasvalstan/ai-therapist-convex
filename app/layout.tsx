import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import ClientProviders from "./client-providers";
import "./globals.css";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sereni.day"),
  title: {
    default: 'Sereni | AI Therapist',
    template: `%s | Sereni`
  },
  description:
    "Your AI-powered companion for mental wellness and personal growth. Experience empathetic conversations and emotional support anytime, anywhere.",
  openGraph: {
    description:
      "Your AI-powered companion for mental wellness and personal growth. Experience empathetic conversations and emotional support anytime, anywhere.",
    images: [
      "https://www.sereni.day/og-image.png",
    ],
    url: "https://www.sereni.day",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sereni | AI Therapist",
    description:
      "Your AI-powered companion for mental wellness and personal growth. Experience empathetic conversations and emotional support anytime, anywhere.",
    creator: "@serenidayai",
    images: [
      "https://www.sereni.day/og-image.png",
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
      </body>
    </html>
  );
}
