"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 relative"
      >
        <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full z-[-1]" />
        <Terminal className="w-24 h-24 text-primary mx-auto mb-6 opacity-80" />
        <h1 className="text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/50">
          404
        </h1>
      </motion.div>
      
      <motion.h2 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-2xl font-semibold mb-4"
      >
        System Pathway Not Found
      </motion.h2>
      
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-muted-foreground mb-10 max-w-md"
      >
        The requested module or directory does not exist in the current environment configuration.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-6 py-3 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 hover:glow-primary-hover transition-all"
        >
          Return to Root
        </Link>
      </motion.div>
    </div>
  );
}
