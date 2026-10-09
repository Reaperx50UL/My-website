import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "VOIDNOD | Apan Datta",
  description: "Personal portfolio and Web Lab of Apan Datta.",
  openGraph: {
    title: "VOIDNOD — Apan Datta's Portfolio & Web Lab",
    description: "Personal portfolio and Web Lab of Apan Datta.",
    url: "https://YOUR_DOMAIN_HERE",
    siteName: "VoidNod",
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
        {/* Removed opaque background to allow global page backgrounds to be visible */}
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
