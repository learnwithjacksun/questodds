import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Faq, Footer, HowItWorks, Services, TelegramSection } from "@/components/landing/sections";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Services />
      <HowItWorks />
      <TelegramSection />
      <Faq />
      <Footer />
    </main>
  );
}
