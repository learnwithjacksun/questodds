import type { Metadata } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Providers } from "@/components/providers";
import { SupportWidget } from "@/components/support/support-widget";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";
import "./landing.css";
import "./auth.css";
import "./dashboard.css";
import "./plan.css";
import "./support.css";
import "./admin.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: OG_IMAGE,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: OG_IMAGE,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${sourceSerif.variable}`}>
      <body>
        {/* Vibrant progress bar on route changes; sits above the nav (z 100) */}
        <NextTopLoader
          color="linear-gradient(90deg, #00c2ff, #7b61ff 55%, #ff4fd8)"
          height={3}
          showSpinner={false}
          crawlSpeed={180}
          speed={260}
          shadow="0 0 14px rgba(123, 97, 255, 0.6)"
          zIndex={1600}
        />
        <Providers>{children}</Providers>
        <SupportWidget />
      </body>
    </html>
  );
}
