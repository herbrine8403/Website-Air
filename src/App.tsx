import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Screenshots } from "@/components/Screenshots";
import { About } from "@/components/About";
import { Footer } from "@/components/Footer";

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      <Navbar />
      {/* 固定导航栏占位 */}
      <div className="navbar-spacer" aria-hidden="true" />
      <main className="mx-auto max-w-[1280px]">
        <Hero />
        <Features />
        <Screenshots />
        <About />
      </main>
      <Footer />
    </div>
  );
}

export default App;
