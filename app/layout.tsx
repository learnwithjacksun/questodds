import type { Metadata } from "next";
import { Geist, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./landing.css";
import "./auth.css";

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
  title: "Quest Codes – SportyBet booking code automation",
  description:
    "Generate SportyBet booking codes from the web dashboard or Telegram. Independent third-party platform, not affiliated with SportyBet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${sourceSerif.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
