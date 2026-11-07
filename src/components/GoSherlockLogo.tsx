import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

export default function GoSherlockLogo({ size = "md", showTagline = true }: LogoProps) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-3xl"
  };

  return (
    <div className="flex items-center gap-3 select-none">
      {/* SVG Icon Mark Glow */}
      <div className={`relative ${iconSizes[size]} flex-shrink-0 drop-shadow-[0_0_12px_rgba(0,229,255,0.45)]`}>
        <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <defs>
            <linearGradient id="cyberCyan" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00FFFF" />
              <stop offset="50%" stopColor="#00D4FF" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
            <radialGradient id="cyberGlow" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#050811" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cyber Reticle Ambient Glow */}
          <circle cx="50" cy="50" r="46" fill="url(#cyberGlow)" />

          {/* Outer Precision HUD Aperture */}
          <circle cx="50" cy="50" r="40" stroke="#00E5FF" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 6" />
          <circle cx="50" cy="50" r="36" stroke="url(#cyberCyan)" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="160 30" />

          {/* Tech Crosshair Ticks */}
          <line x1="50" y1="4" x2="50" y2="12" stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4" y1="50" x2="12" y2="50" stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="96" y1="50" x2="88" y2="50" stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round" />

          {/* Lens Body */}
          <circle cx="50" cy="50" r="28" fill="#0A1128" stroke="#00E5FF" strokeWidth="2.5" />

          {/* AI Shutter Aperture Blades */}
          <path d="M50 25 L63 42 L48 44 Z" fill="#00FFFF" fillOpacity="0.9" />
          <path d="M72 40 L65 57 L52 50 Z" fill="#00D4FF" />
          <path d="M68 65 L49 67 L52 52 Z" fill="#0284C7" />
          <path d="M42 70 L35 53 L48 50 Z" fill="#00FFFF" fillOpacity="0.75" />
          <path d="M28 50 L38 34 L49 42 Z" fill="#38BDF8" />

          {/* Central Quantum Core Point */}
          <circle cx="50" cy="50" r="5" fill="#00FFFF" />
          <circle cx="50" cy="50" r="2.5" fill="#FFFFFF" />

          {/* Magnifier Handle Angle */}
          <path d="M74 74 L102 102" stroke="#00E5FF" strokeWidth="8" strokeLinecap="round" />
          <path d="M77 77 L99 99" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Wordmark & Tagline */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline tracking-tight">
          <span className={`${textSizes[size]} font-black text-[#00E5FF] tracking-tight drop-shadow-[0_0_10px_rgba(0,229,255,0.4)]`}>
            Go
          </span>
          <span className={`${textSizes[size]} font-extrabold text-white tracking-tight ml-0.5`}>
            Sherlock
          </span>
        </div>
        {showTagline && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
            <p className="text-[10px] font-semibold tracking-wider text-cyan-200/80 uppercase">
              Autonomous Backoffice & Visual AI QA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
