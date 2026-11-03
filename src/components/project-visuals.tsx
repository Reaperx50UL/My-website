"use client";

import React from "react";

export function WritingMachineVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#070B14] select-none ${className}`}>
      {/* Subtle blueprint grid pattern */}
      <svg
        className="w-full h-full"
        viewBox="0 0 640 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-pattern-wm" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(14, 165, 233, 0.08)" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="cyan-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="amber-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.5" />
          </linearGradient>
          <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Blueprint Grid Background */}
        <rect width="640" height="360" fill="url(#grid-pattern-wm)" />

        {/* Corner Cybernetic Markers */}
        <g stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1">
          <path d="M 16 32 L 16 16 L 32 16" fill="none" />
          <path d="M 624 32 L 624 16 L 608 16" fill="none" />
          <path d="M 16 328 L 16 344 L 32 344" fill="none" />
          <path d="M 624 328 L 624 344 L 608 344" fill="none" />
        </g>

        {/* Status / Telemetry Top Bar */}
        <rect x="24" y="24" width="220" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
        <circle cx="36" cy="36" r="3.5" fill="#38BDF8" className="animate-pulse" />
        <text x="46" y="40" fill="#38BDF8" fontSize="10" fontFamily="monospace" fontWeight="bold">
          SYS // ARDUINO 2-AXIS GANTRY
        </text>

        <rect x="440" y="24" width="176" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1" />
        <circle cx="452" cy="36" r="3.5" fill="#F59E0B" />
        <text x="462" y="40" fill="#FDE68A" fontSize="10" fontFamily="monospace" fontWeight="bold">
          FEEDRATE: 120 mm/s [XY]
        </text>

        {/* Physical Gantry Outer Frame */}
        <rect x="36" y="60" width="370" height="260" rx="8" fill="rgba(8, 14, 28, 0.7)" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.5" />
        
        {/* Drawing Workspace Area (Bed) */}
        <rect x="52" y="76" width="338" height="228" rx="4" fill="rgba(3, 7, 18, 0.85)" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />

        {/* X-Axis Linear Rails (Dual rods) */}
        <line x1="52" y1="110" x2="390" y2="110" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <line x1="52" y1="110" x2="390" y2="110" stroke="#0EA5E9" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

        <line x1="52" y1="270" x2="390" y2="270" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <line x1="52" y1="270" x2="390" y2="270" stroke="#0EA5E9" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />

        {/* X-Axis Stepper Motor (Top Left) */}
        <g transform="translate(52, 92)">
          <rect x="0" y="0" width="34" height="34" rx="4" fill="#0F172A" stroke="#0EA5E9" strokeWidth="1.2" />
          <circle cx="17" cy="17" r="10" fill="#1E293B" stroke="#38BDF8" strokeWidth="1" />
          <circle cx="17" cy="17" r="4" fill="#0EA5E9" />
          <text x="3" y="-4" fill="#94A3B8" fontSize="8" fontFamily="monospace">M1:STEPPER-X</text>
        </g>

        {/* X-Axis Limit Switch */}
        <g transform="translate(95, 96)">
          <rect x="0" y="0" width="16" height="10" rx="2" fill="#1E293B" stroke="#F59E0B" strokeWidth="0.8" />
          <circle cx="12" cy="5" r="2" fill="#F59E0B" />
          <text x="-4" y="-3" fill="#F59E0B" fontSize="7" fontFamily="monospace">LIMIT_X</text>
        </g>

        {/* Y-Axis Moving Cross-Gantry (Vertical Beam) */}
        <g transform="translate(210, 72)">
          {/* Vertical Gantry Beam */}
          <rect x="-8" y="0" width="16" height="236" rx="3" fill="rgba(30, 41, 59, 0.85)" stroke="#38BDF8" strokeWidth="1.5" />
          <line x1="0" y1="4" x2="0" y2="232" stroke="#0EA5E9" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />

          {/* Y-Axis Stepper Motor (Mounted on Gantry) */}
          <rect x="-14" y="10" width="28" height="28" rx="3" fill="#0F172A" stroke="#0EA5E9" strokeWidth="1" />
          <circle cx="0" cy="24" r="8" fill="#1E293B" stroke="#38BDF8" strokeWidth="0.8" />
          <circle cx="0" cy="24" r="3" fill="#38BDF8" />
          <text x="-16" y="-3" fill="#94A3B8" fontSize="7" fontFamily="monospace">M2:STEPPER-Y</text>

          {/* Precision Pen Carriage & Servo Lifter */}
          <g transform="translate(0, 110)">
            {/* Carriage Block */}
            <rect x="-18" y="-14" width="36" height="32" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" filter="url(#glow-filter)" />
            {/* Z-Axis Micro Servo */}
            <rect x="-14" y="-10" width="28" height="14" rx="2" fill="#1E293B" stroke="#F59E0B" strokeWidth="0.8" />
            <circle cx="8" cy="-3" r="2.5" fill="#F59E0B" />
            <text x="-12" y="-1" fill="#FDE68A" fontSize="7" fontFamily="monospace">Z-SERVO</text>

            {/* Precision Technical Pen / Stylus */}
            <path d="M 0 4 L 4 18 L 0 32 L -4 18 Z" fill="#E2E8F0" stroke="#0EA5E9" strokeWidth="1" />
            <circle cx="0" cy="32" r="2" fill="#38BDF8" />
            
            {/* Active Drawing Contact Spark */}
            <circle cx="0" cy="32" r="5" fill="none" stroke="#38BDF8" strokeWidth="1" className="animate-ping" />
            <circle cx="0" cy="32" r="8" fill="rgba(56, 189, 248, 0.3)" />

            <text x="24" y="6" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
              PEN CARRIAGE [Z: DOWN]
            </text>
          </g>
        </g>

        {/* Drawn Vector Path on Blueprint Surface */}
        <g stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-filter)">
          {/* Mechanical Vector Text / Paths */}
          <path d="M 90 200 L 110 150 L 130 200 L 120 180 L 100 180" fill="none" />
          <path d="M 140 150 L 140 200 L 160 200" fill="none" />
          <path d="M 175 175 Q 185 150 200 150 Q 215 150 215 175 Q 215 200 200 200 Q 185 200 175 175 Z" fill="none" strokeDasharray="3 2" opacity="0.8" />
          <path d="M 90 225 L 210 200" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeDasharray="4 3" />
        </g>

        {/* Trajectory Dimension Annotations */}
        <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.8">
          <line x1="90" y1="210" x2="90" y2="235" />
          <line x1="210" y1="210" x2="210" y2="235" />
          <line x1="90" y1="230" x2="210" y2="230" stroke="#38BDF8" markerEnd="url(#arrow)" />
          <text x="135" y="242" fill="#94A3B8" fontSize="8" fontFamily="monospace">ΔX: 120.0 mm</text>
        </g>

        {/* Right Side: Arduino Uno Microcontroller Module */}
        <g transform="translate(430, 60)">
          {/* Arduino PCB Board */}
          <rect x="0" y="0" width="186" height="260" rx="8" fill="#0284C7" fillOpacity="0.18" stroke="#0284C7" strokeWidth="1.5" />
          <rect x="4" y="4" width="178" height="252" rx="6" fill="#0C253B" fillOpacity="0.85" stroke="#38BDF8" strokeWidth="0.8" />

          {/* USB & Power Jacks */}
          <rect x="15" y="-6" width="36" height="22" rx="2" fill="#475569" stroke="#94A3B8" strokeWidth="1" />
          <text x="20" y="8" fill="#E2E8F0" fontSize="7" fontFamily="monospace">USB</text>

          <rect x="130" y="-6" width="30" height="26" rx="2" fill="#1E293B" stroke="#94A3B8" strokeWidth="1" />
          <text x="134" y="10" fill="#E2E8F0" fontSize="7" fontFamily="monospace">PWR</text>

          {/* Board Silkscreen Labels */}
          <text x="16" y="40" fill="#38BDF8" fontSize="12" fontFamily="monospace" fontWeight="bold">
            ARDUINO UNO
          </text>
          <text x="16" y="52" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            ATMEGA328P CORE // 16MHz
          </text>

          {/* ATmega328P Main IC Chip */}
          <g transform="translate(42, 70)">
            <rect x="0" y="0" width="102" height="60" rx="4" fill="#0B132B" stroke="#38BDF8" strokeWidth="1.2" />
            <circle cx="8" cy="8" r="2.5" fill="#38BDF8" />
            <text x="18" y="28" fill="#E2E8F0" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ATmega328P
            </text>
            <text x="18" y="42" fill="#0EA5E9" fontSize="8" fontFamily="monospace">
              AVR RISC 8-BIT
            </text>

            {/* IC Pins Top & Bottom */}
            {[-8, -4, 0, 4, 8, 12, 16, 20, 24, 28, 32].map((x, i) => (
              <g key={i}>
                <rect x={18 + i * 6} y="-5" width="3" height="5" fill="#94A3B8" />
                <rect x={18 + i * 6} y="60" width="3" height="5" fill="#94A3B8" />
              </g>
            ))}
          </g>

          {/* Crystal Oscillator */}
          <rect x="20" y="90" width="14" height="24" rx="3" fill="#64748B" stroke="#CBD5E1" strokeWidth="0.8" />
          <text x="22" y="105" fill="#F8FAFC" fontSize="6" fontFamily="monospace">16M</text>

          {/* Digital Pin Header (PWM 9, 10, 11) */}
          <rect x="14" y="145" width="158" height="20" rx="2" fill="#0F172A" stroke="#0EA5E9" strokeWidth="0.8" />
          <text x="20" y="158" fill="#38BDF8" fontSize="8" fontFamily="monospace">
            DIGITAL PWM: PIN 9, 10, 11 [MOTORS]
          </text>

          {/* Analog In Header */}
          <rect x="14" y="172" width="158" height="20" rx="2" fill="#0F172A" stroke="#F59E0B" strokeWidth="0.8" />
          <text x="20" y="185" fill="#FDE68A" fontSize="8" fontFamily="monospace">
            SENSORS: LIMIT X/Y [A0-A2]
          </text>

          {/* Status LEDs */}
          <g transform="translate(20, 205)">
            <circle cx="10" cy="10" r="3" fill="#10B981" />
            <text x="18" y="13" fill="#6EE7B7" fontSize="7" fontFamily="monospace">ON: READY</text>

            <circle cx="75" cy="10" r="3" fill="#F59E0B" className="animate-pulse" />
            <text x="83" y="13" fill="#FDE68A" fontSize="7" fontFamily="monospace">TX/RX: ACTIVE</text>
          </g>

          {/* G-Code Execution Status */}
          <rect x="14" y="225" width="158" height="22" rx="3" fill="rgba(14, 165, 233, 0.12)" stroke="#0EA5E9" strokeWidth="0.8" />
          <text x="22" y="239" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            G01 X142.5 Y88.0 Z0.0
          </text>
        </g>
      </svg>
    </div>
  );
}

export function DcMotorVisual({ className = "w-full h-full" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[#070B14] select-none ${className}`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 640 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid-pattern-dc" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(14, 165, 233, 0.08)" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="heat-grad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <linearGradient id="bus-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
          </linearGradient>
          <filter id="glow-dc" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Blueprint Grid Background */}
        <rect width="640" height="360" fill="url(#grid-pattern-dc)" />

        {/* Corner Cybernetic Markers */}
        <g stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1">
          <path d="M 16 32 L 16 16 L 32 16" fill="none" />
          <path d="M 624 32 L 624 16 L 608 16" fill="none" />
          <path d="M 16 328 L 16 344 L 32 344" fill="none" />
          <path d="M 624 328 L 624 344 L 608 344" fill="none" />
        </g>

        {/* Top Header Information Bar */}
        <rect x="24" y="20" width="260" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(56, 189, 248, 0.25)" strokeWidth="1" />
        <circle cx="36" cy="32" r="3.5" fill="#38BDF8" className="animate-pulse" />
        <text x="46" y="36" fill="#38BDF8" fontSize="10" fontFamily="monospace" fontWeight="bold">
          CLOSED-LOOP // 8085 + ADC0808 DC MOTOR
        </text>

        <rect x="420" y="20" width="196" height="24" rx="4" fill="rgba(15, 23, 42, 0.75)" stroke="rgba(245, 158, 11, 0.25)" strokeWidth="1" />
        <circle cx="432" cy="32" r="3.5" fill="#F59E0B" />
        <text x="442" y="36" fill="#FDE68A" fontSize="10" fontFamily="monospace" fontWeight="bold">
          DYNAMIC PWM: 65% [1850 RPM]
        </text>

        {/* Signal Flow Connection Bus Lines */}
        <g stroke="#0EA5E9" strokeWidth="2" strokeDasharray="6 4" opacity="0.75" filter="url(#glow-dc)">
          {/* Sensor to ADC */}
          <path d="M 140 180 L 175 180" />
          {/* ADC to 8085 */}
          <path d="M 295 180 L 330 180" />
          {/* 8085 to Motor Driver */}
          <path d="M 460 180 L 495 180" />
        </g>

        {/* Dynamic Flow Arrow Indicators */}
        <polygon points="175,176 183,180 175,184" fill="#38BDF8" />
        <polygon points="330,176 338,180 330,184" fill="#38BDF8" />
        <polygon points="495,176 503,180 495,184" fill="#38BDF8" />

        {/* STAGE 1: Temperature Sensor Element (LM35 / Thermal Probe) */}
        <g transform="translate(24, 70)">
          <rect x="0" y="0" width="116" height="220" rx="8" fill="rgba(8, 14, 28, 0.75)" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.2" />
          <text x="12" y="22" fill="#F59E0B" fontSize="9" fontFamily="monospace" fontWeight="bold">
            STAGE 01 // SENSE
          </text>
          <text x="12" y="34" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            TEMP PROBE (ANALOG)
          </text>

          {/* Thermometer Graphic */}
          <rect x="48" y="50" width="16" height="110" rx="8" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
          <rect x="52" y="80" width="8" height="74" rx="4" fill="url(#heat-grad)" />
          <circle cx="56" cy="154" r="12" fill="#EF4444" stroke="#475569" strokeWidth="1.5" />
          <circle cx="56" cy="154" r="7" fill="#F87171" />

          {/* Temperature Tick Marks */}
          <g stroke="#94A3B8" strokeWidth="1">
            <line x1="68" y1="65" x2="74" y2="65" /><text x="78" y="68" fill="#EF4444" fontSize="7" fontFamily="monospace">75°C</text>
            <line x1="68" y1="95" x2="74" y2="95" /><text x="78" y="98" fill="#F59E0B" fontSize="7" fontFamily="monospace">50°C</text>
            <line x1="68" y1="125" x2="74" y2="125" /><text x="78" y="128" fill="#38BDF8" fontSize="7" fontFamily="monospace">25°C</text>
          </g>

          {/* Analog Output Signal Readout */}
          <rect x="10" y="176" width="96" height="32" rx="4" fill="#0A0F1D" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="0.8" />
          <text x="16" y="190" fill="#FDE68A" fontSize="8" fontFamily="monospace" fontWeight="bold">
            V_OUT: 425 mV
          </text>
          <text x="16" y="201" fill="#94A3B8" fontSize="7" fontFamily="monospace">
            10 mV / °C LINEAR
          </text>
        </g>

        {/* STAGE 2: ADC0808 8-Bit Converter Chip */}
        <g transform="translate(180, 70)">
          <rect x="0" y="0" width="115" height="220" rx="8" fill="rgba(8, 14, 28, 0.75)" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1.2" />
          <text x="10" y="22" fill="#38BDF8" fontSize="9" fontFamily="monospace" fontWeight="bold">
            STAGE 02 // A/D
          </text>
          <text x="10" y="34" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            ADC0808 (8-BIT SAR)
          </text>

          {/* Chip Body */}
          <g transform="translate(18, 48)">
            <rect x="0" y="0" width="78" height="120" rx="4" fill="#0F172A" stroke="#0EA5E9" strokeWidth="1.2" />
            <circle cx="39" cy="6" r="3" fill="#1E293B" stroke="#0EA5E9" strokeWidth="0.8" />

            <text x="14" y="30" fill="#E2E8F0" fontSize="9" fontFamily="monospace" fontWeight="bold">
              ADC0808
            </text>
            <text x="14" y="44" fill="#38BDF8" fontSize="7" fontFamily="monospace">
              IN0 ──► SAR
            </text>
            <text x="14" y="58" fill="#FDE68A" fontSize="7" fontFamily="monospace">
              EOC: HIGH
            </text>
            <text x="14" y="72" fill="#94A3B8" fontSize="7" fontFamily="monospace">
              START / OE
            </text>

            {/* Chip Dual-Inline Pins */}
            {[-6, 10, 26, 42, 58, 74, 90, 106].map((y, i) => (
              <g key={i}>
                <rect x="-6" y={14 + i * 12} width="6" height="3" fill="#94A3B8" />
                <rect x="78" y={14 + i * 12} width="6" height="3" fill="#94A3B8" />
              </g>
            ))}
          </g>

          {/* Digital Bus Readout */}
          <rect x="10" y="176" width="95" height="32" rx="4" fill="#0A0F1D" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="0.8" />
          <text x="16" y="190" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            DIGITAL: 0x6C
          </text>
          <text x="16" y="201" fill="#94A3B8" fontSize="7" fontFamily="monospace">
            D0-D7 [8-BIT BUS]
          </text>
        </g>

        {/* STAGE 3: Intel 8085 Microprocessor */}
        <g transform="translate(335, 70)">
          <rect x="0" y="0" width="125" height="220" rx="8" fill="rgba(8, 14, 28, 0.75)" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.5" />
          <text x="12" y="22" fill="#38BDF8" fontSize="9" fontFamily="monospace" fontWeight="bold">
            STAGE 03 // CPU
          </text>
          <text x="12" y="34" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            8085 MICROPROCESSOR
          </text>

          {/* 8085 IC Body */}
          <g transform="translate(18, 48)">
            <rect x="0" y="0" width="88" height="120" rx="4" fill="#0B132B" stroke="#38BDF8" strokeWidth="1.2" filter="url(#glow-dc)" />
            <circle cx="44" cy="6" r="3" fill="#0F172A" stroke="#38BDF8" strokeWidth="0.8" />

            <text x="16" y="26" fill="#F8FAFC" fontSize="10" fontFamily="monospace" fontWeight="bold">
              INTEL 8085
            </text>
            <text x="16" y="38" fill="#38BDF8" fontSize="7" fontFamily="monospace">
              CLK: 3.072 MHz
            </text>
            <text x="16" y="52" fill="#94A3B8" fontSize="7" fontFamily="monospace">
              ALE / RD / WR
            </text>
            <text x="16" y="66" fill="#FDE68A" fontSize="7" fontFamily="monospace">
              ALU: COMPARE
            </text>
            <text x="16" y="80" fill="#34D399" fontSize="7" fontFamily="monospace">
              PWM OUT ──►
            </text>

            {/* Pins Left & Right */}
            {[-6, 10, 26, 42, 58, 74, 90, 106].map((y, i) => (
              <g key={i}>
                <rect x="-6" y={14 + i * 12} width="6" height="3" fill="#CBD5E1" />
                <rect x="88" y={14 + i * 12} width="6" height="3" fill="#CBD5E1" />
              </g>
            ))}
          </g>

          {/* Assembly Routine Executing */}
          <rect x="10" y="176" width="105" height="32" rx="4" fill="#0A0F1D" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="0.8" />
          <text x="16" y="190" fill="#38BDF8" fontSize="8" fontFamily="monospace" fontWeight="bold">
            IN 01H ; READ ADC
          </text>
          <text x="16" y="201" fill="#94A3B8" fontSize="7" fontFamily="monospace">
            CPI 40H ; SPEED MOD
          </text>
        </g>

        {/* STAGE 4: DC Motor & Dynamic Actuation */}
        <g transform="translate(500, 70)">
          <rect x="0" y="0" width="116" height="220" rx="8" fill="rgba(8, 14, 28, 0.75)" stroke="rgba(245, 158, 11, 0.35)" strokeWidth="1.2" />
          <text x="10" y="22" fill="#F59E0B" fontSize="9" fontFamily="monospace" fontWeight="bold">
            STAGE 04 // MOTOR
          </text>
          <text x="10" y="34" fill="#94A3B8" fontSize="8" fontFamily="monospace">
            12V DC ACTUATOR
          </text>

          {/* Motor Housing & Rotating Rotor */}
          <g transform="translate(18, 52)">
            {/* Outer Stator Magnet */}
            <circle cx="40" cy="48" r="36" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
            <circle cx="40" cy="48" r="28" fill="#1E293B" stroke="#475569" strokeWidth="1" />
            
            {/* Stator Poles (N / S) */}
            <rect x="8" y="38" width="8" height="20" rx="1" fill="#EF4444" />
            <text x="10" y="52" fill="#FFFFFF" fontSize="7" fontFamily="monospace" fontWeight="bold">N</text>

            <rect x="64" y="38" width="8" height="20" rx="1" fill="#0284C7" />
            <text x="66" y="52" fill="#FFFFFF" fontSize="7" fontFamily="monospace" fontWeight="bold">S</text>

            {/* Armature Rotor Coils */}
            <g transform="translate(40, 48)">
              <circle cx="0" cy="0" r="16" fill="#0B132B" stroke="#F59E0B" strokeWidth="1.5" />
              <line x1="-12" y1="0" x2="12" y2="0" stroke="#F59E0B" strokeWidth="2" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="#F59E0B" strokeWidth="2" />
              <circle cx="0" cy="0" r="4" fill="#FDE68A" />

              {/* Kinetic Rotation Indicator Arcs */}
              <path d="M -22 -10 A 24 24 0 0 1 22 -10" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 3" />
              <polygon points="22,-14 26,-9 20,-8" fill="#38BDF8" />

              <path d="M 22 10 A 24 24 0 0 1 -22 10" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="3 3" />
              <polygon points="-22,14 -26,9 -20,8" fill="#38BDF8" />
            </g>
          </g>

          {/* Motor Speed / Status Gauge */}
          <rect x="10" y="176" width="96" height="32" rx="4" fill="#0A0F1D" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="0.8" />
          <text x="16" y="190" fill="#FDE68A" fontSize="8" fontFamily="monospace" fontWeight="bold">
            RPM: 1850 ± 20
          </text>
          <text x="16" y="201" fill="#94A3B8" fontSize="7" fontFamily="monospace">
            H-BRIDGE DRIVER
          </text>
        </g>
      </svg>
    </div>
  );
}
