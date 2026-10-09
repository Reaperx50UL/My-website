import React from 'react';

export function VoidNodSymbol({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="orbitalGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      
      {/* Outer energy field */}
      <circle cx="16" cy="16" r="11" stroke="url(#glowGradient)" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.5" />
      
      {/* Back ring */}
      <path d="M 2 16 A 14 4 0 0 1 30 16" transform="rotate(-20 16 16)" stroke="url(#glowGradient)" strokeWidth="0.75" />
      
      {/* Central Void (blocks the back ring) */}
      <circle cx="16" cy="16" r="7.5" fill="#050505" stroke="url(#orbitalGradient)" strokeWidth="1.5" />
      
      {/* Front ring */}
      <path d="M 30 16 A 14 4 0 0 1 2 16" transform="rotate(-20 16 16)" stroke="url(#orbitalGradient)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Central glow core */}
      <circle cx="16" cy="16" r="6.5" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

export function VoidNodWordmark({ className = "h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="textGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* V */}
        <path d="M0 4 L8 20 L16 4" />
        
        {/* O 1 - Orbital */}
        <circle cx="36" cy="12" r="6.5" />
        <path d="M 25 12 A 11 3.5 0 0 1 47 12" transform="rotate(-25 36 12)" stroke="url(#textGradient)" strokeWidth="0.5" opacity="0.5" />
        <path d="M 47 12 A 11 3.5 0 0 1 25 12" transform="rotate(-25 36 12)" stroke="url(#textGradient)" strokeWidth="1.5" />
        
        {/* I */}
        <path d="M56 4 L56 20" />
        
        {/* D 1 */}
        <path d="M66 4 L75 4 A 8 8 0 0 1 83 12 A 8 8 0 0 1 75 20 L66 20 Z" />
        
        {/* N */}
        <path d="M93 20 L93 4 L109 20 L109 4" />
        
        {/* O 2 - Normal */}
        <circle cx="130" cy="12" r="6.5" />
        
        {/* D 2 */}
        <path d="M150 4 L159 4 A 8 8 0 0 1 167 12 A 8 8 0 0 1 159 20 L150 20 Z" />
      </g>
    </svg>
  );
}

export function VoidNodLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <VoidNodSymbol className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
      <VoidNodWordmark className="h-4 sm:h-5 text-foreground shrink-0 mt-0.5" />
    </div>
  );
}
