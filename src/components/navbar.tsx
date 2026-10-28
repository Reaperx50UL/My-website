"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, ArrowRight, Download, Mail, ExternalLink } from "lucide-react";
import { profileData } from "@/data/profile";
import { VoidNodLogo } from "@/components/voidnod-logo";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock background scroll when mobile menu is open, restore exact position when closed
  useEffect(() => {
    if (!mobileMenuOpen) return;

    // Save current scroll position
    const scrollY = window.scrollY;
    scrollPositionRef.current = scrollY;

    // Lock body scroll with fixed positioning to prevent any mobile bounce or background movement
    document.documentElement.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    // Move focus into close button
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      // Cleanup when mobileMenuOpen becomes false or unmounts
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";

      // Restore background page scroll position instantly
      const prevBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      document.documentElement.style.scrollBehavior = prevBehavior;
    };
  }, [mobileMenuOpen]);

  // Handle Escape key and focus trap inside open drawer
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!mobileMenuOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setMobileMenuOpen(false);
        menuTriggerRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        const drawer = drawerRef.current;
        if (!drawer) return;

        const focusable = drawer.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    },
    [mobileMenuOpen]
  );

  // Close menu and handle anchor scrolling with sticky header offset
  const handleNavigation = (href: string) => {
    setMobileMenuOpen(false);
    menuTriggerRef.current?.focus();

    // If anchor link on home page
    if (href.startsWith("/#")) {
      const targetId = href.replace("/#", "");
      if (pathname === "/") {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            const headerOffset = 84;
            const elementPosition = el.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;
            window.scrollTo({
              top: Math.max(0, offsetPosition),
              behavior: "smooth",
            });
          }
        }, 50);
      }
    }
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#about" },
    { name: "Skills", href: "/#skills" },
    { name: "Education", href: "/#education" },
    { name: "Experience", href: "/#experience" },
    { name: "Projects", href: "/#projects" },
    { name: "Web Lab", href: "/web-lab" },
    { name: "Resume", href: profileData.resumePath, isExternal: true },
    { name: "Contact", href: "/#contact" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
          scrolled
            ? "bg-background/85 backdrop-blur-md border-white/5 py-3 shadow-lg"
            : "bg-transparent py-4 sm:py-5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link
            href="/"
            aria-label="VoidNod Home"
            className="flex items-center group py-1"
            onClick={() => handleNavigation("/")}
          >
            <div className="relative group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(14,165,233,0.4)] transition-all duration-300">
              <VoidNodLogo />
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Main desktop navigation">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? "noopener noreferrer" : undefined}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 rounded-md px-1 py-0.5"
              >
                {link.name}
              </Link>
            ))}
            {profileData.status && (
              <div className="flex items-center gap-2 text-xs border border-primary/20 bg-primary/5 px-3 py-1.5 rounded-full text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {profileData.status}
              </div>
            )}
          </nav>

          {/* Mobile Toggle Button */}
          <button
            ref={menuTriggerRef}
            type="button"
            className="lg:hidden text-foreground p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-white/10 active:bg-white/15 focus-visible:outline-2 focus-visible:outline-cyan-400 flex items-center justify-center transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Modal */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          onKeyDown={handleKeyDown}
          className="lg:hidden fixed inset-0 z-[100] flex justify-end"
        >
          {/* Backdrop: Dark and opaque with backdrop blur, tapping closes the drawer */}
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300 touch-none"
            onClick={() => {
              setMobileMenuOpen(false);
              menuTriggerRef.current?.focus();
            }}
            aria-hidden="true"
          />

          {/* Viewport-sized Navigation Drawer */}
          <div
            ref={drawerRef}
            className="relative w-full max-w-sm sm:max-w-md bg-[#050814] border-l border-white/10 shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] z-[101] overflow-hidden select-none animate-in slide-in-from-right duration-200"
          >
            {/* Drawer Header with Logo and Close Button */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0 bg-[#070B18] pt-[max(1rem,env(safe-area-inset-top,0px))]">
              <Link
                href="/"
                aria-label="VoidNod Home"
                onClick={() => handleNavigation("/")}
                className="flex items-center py-1"
              >
                <VoidNodLogo />
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  menuTriggerRef.current?.focus();
                }}
                className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
                aria-label="Close navigation menu"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            {/* Drawer Scrollable Navigation Links */}
            <nav
              className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-1.5 focus:outline-none"
              aria-label="Mobile menu links"
            >
              {profileData.status && (
                <div className="flex items-center gap-2 text-xs border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 rounded-xl text-cyan-300 mb-4 font-mono shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  <span className="truncate">{profileData.status}</span>
                </div>
              )}

              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  target={link.isExternal ? "_blank" : undefined}
                  rel={link.isExternal ? "noopener noreferrer" : undefined}
                  className="min-h-[48px] px-3.5 py-2.5 rounded-xl text-base font-medium text-slate-200 hover:text-cyan-300 hover:bg-cyan-500/10 active:bg-cyan-500/15 flex items-center justify-between group transition-colors border border-transparent hover:border-cyan-500/20 focus-visible:outline-2 focus-visible:outline-cyan-400"
                  onClick={() => handleNavigation(link.href)}
                >
                  <span className="group-hover:translate-x-1 transition-transform">
                    {link.name}
                  </span>
                  {link.isExternal ? (
                    <ExternalLink size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  ) : (
                    <ArrowRight size={16} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </Link>
              ))}

              {/* Quick Actions in Drawer */}
              <div className="pt-6 mt-4 border-t border-white/10 space-y-2.5">
                <Link
                  href={profileData.resumePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleNavigation(profileData.resumePath)}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-cyan-400 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                >
                  <Download size={16} />
                  <span>Download Resume</span>
                </Link>

                <Link
                  href="/#contact"
                  onClick={() => handleNavigation("/#contact")}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-medium text-sm flex items-center justify-center gap-2 border border-white/10 active:scale-[0.98] transition-all"
                >
                  <Mail size={16} />
                  <span>Get in Touch</span>
                </Link>
              </div>
            </nav>

            {/* Drawer Footer Safe Area */}
            <div className="px-5 py-3 border-t border-white/10 bg-[#070B18]/70 text-center text-xs font-mono text-slate-400 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              VOIDNOD · {new Date().getFullYear()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
