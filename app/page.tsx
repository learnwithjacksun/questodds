import { Suspense } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Proof } from "@/components/landing/proof";
import { Faq, Footer, HowItWorks, Services, TelegramSection } from "@/components/landing/sections";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <Suspense fallback={null}>
        <Proof />
      </Suspense>
      <TelegramSection />
      <Faq />
      <Footer />
    </main>
  );
}
