import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Apan Datta | Portfolio & Web Lab",
  description: "Electronics Engineering Student, Developer, and Cybersecurity Enthusiast. Explore my projects and Web Lab.",
  openGraph: {
    title: "Apan Datta | Technology Professional",
    description: "Portfolio and experimental Web Lab platform.",
    url: "https://YOUR_DOMAIN_HERE",
    siteName: "Apan Datta Portfolio",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen flex flex-col relative selection:bg-primary/30 selection:text-primary-foreground">
        <div className="fixed inset-0 z-[-1] bg-background">
          <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3"></div>
        </div>
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
