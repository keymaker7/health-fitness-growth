import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/features/dashboard/AppProvider";
import { AppShell } from "@/components/AppShell";
import { getSiteUrl, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const noto = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: site,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  category: "education",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: site.origin,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f6cbd",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  inLanguage: "ko-KR",
  description: SITE_DESCRIPTION,
  slogan: SITE_TAGLINE,
  offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  audience: { "@type": "EducationalAudience", educationalRole: "student" },
  about: ["PAPS", "학생건강체력평가", "건강체력", "초등 체육"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${noto.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full font-sans text-[var(--ink)] antialiased" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
