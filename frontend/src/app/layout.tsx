import type { Metadata } from "next";
import "@/styles/globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Lifeline-Core v2 — Emergency Medical Resource Allocation Engine",
  description: "A Trustworthy Emergency Hospital-Resource Allocation Engine addressing the arrived-but-no-bed failure mode with freshness decay, atomic reservations, and Poisson walk-in estimation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen antialiased selection:bg-red-600 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Lifeline-Core v2</span>
              <span>— Advanced Data Structures and Algorithms Engineering Project</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-amber-500/80 font-mono text-[11px]">
                Safety boundary: Simulation & Research prototype. Not a certified clinical medical device.
              </span>
              <a href="https://github.com/rajat-wyrm/lifeline-core-v2" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition underline underline-offset-4">
                GitHub Repository
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
