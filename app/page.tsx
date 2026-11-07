import { Suspense } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Gallery } from "@/components/landing/gallery";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";
import { Proof } from "@/components/landing/proof";
import { Faq, HowItWorks, Services, TelegramSection } from "@/components/landing/sections";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Gallery />
      <Suspense fallback={null}>
        <Proof />
      </Suspense>
      <Pricing />
      <TelegramSection />
      <Faq />
      <SiteFooter />
    </main>
  );
}
