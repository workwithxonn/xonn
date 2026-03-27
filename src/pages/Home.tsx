import Hero from "../components/Hero";
import Products from "../components/Products";
import Portfolio from "../components/Portfolio";
import WhyXonn from "../components/WhyXonn";
import Testimonials from "../components/Testimonials";
import FAQ from "../components/FAQ";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="bg-black">
      <Hero />
      <Products />
      <Portfolio />
      <WhyXonn />
      <Testimonials />
      <FAQ />
      <Footer />
    </main>
  );
}
