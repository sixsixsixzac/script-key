import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://script-key-phi.vercel.app";
const siteName = "Script Key System";
const description =
  "Generate a free 24-hour access key after watching a short ad. Fast, secure, and no sign-up required.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} — Free 24h Access Keys`,
    template: `%s | ${siteName}`,
  },
  description,
  applicationName: siteName,
  keywords: [
    "script key",
    "access key",
    "free key",
    "24 hour key",
    "key generator",
    "script access"
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName,
    title: `${siteName} — Free 24h Access Keys`,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} — Free 24h Access Keys`,
    description,
  },
  icons: {
    icon: "/favicon.ico",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: siteUrl,
    description,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-gradient-to-br from-background via-background to-zinc-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
