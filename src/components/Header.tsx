/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { SeasonalThemeId } from '../types/cinema';
import { getSeasonalTheme, SEASONAL_THEMES } from '../utils/seasonalTheme';

interface HeaderProps {
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenAbout: () => void;
  videoCount: number;
}

/**
 * Custom SVG Decorations for each Seasonal Period (Left & Right of Title)
 */
const SeasonalDecorationSVG: React.FC<{ theme: SeasonalThemeId; side: 'left' | 'right' }> = ({
  theme,
  side,
}) => {
  if (theme === 'default') return null;

  // 1. NOUVEL AN (30 déc - 15 janv): Party Hat, Cotillons & Fireworks
  if (theme === 'new_year') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-sway" fill="none">
        {/* Party Hat (Chapeau pointu) */}
        <path d="M32 8L12 52H52L32 8Z" fill="url(#nyHat)" stroke="#FDE047" strokeWidth="2" />
        <circle cx="32" cy="8" r="5" fill="#FEF08A" className="anim-twinkle" />
        {/* Stripes & Cotillons */}
        <path d="M22 30L42 36M17 42L47 46" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="10" cy="18" r="2.5" fill="#F43F5E" />
        <circle cx="54" cy="16" r="3" fill="#FACC15" />
        <path d="M50 26C55 28 52 34 57 36" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="nyHat" x1="12" y1="8" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F59E0B" />
            <stop offset="0.5" stopColor="#EC4899" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Fireworks (Feux d'artifice) & Serpentins */}
        <circle cx="32" cy="32" r="4" fill="#FEF08A" />
        <g stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" className="anim-twinkle">
          <line x1="32" y1="8" x2="32" y2="18" />
          <line x1="32" y1="46" x2="32" y2="56" />
          <line x1="8" y1="32" x2="18" y2="32" />
          <line x1="46" y1="32" x2="56" y2="32" />
          <line x1="15" y1="15" x2="22" y2="22" />
          <line x1="42" y1="42" x2="49" y2="49" />
          <line x1="49" y1="15" x2="42" y2="22" />
          <line x1="22" y1="42" x2="15" y2="49" />
        </g>
        <circle cx="32" cy="6" r="2" fill="#38BDF8" />
        <circle cx="58" cy="32" r="2" fill="#F43F5E" />
        <circle cx="6" cy="32" r="2" fill="#A855F7" />
      </svg>
    );
  }

  // 2. CARNAVAL (1er fév - 6 fév): Festive Mask, Clown & Confetti
  if (theme === 'carnival') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-sway" fill="none">
        {/* Venetian Carnival Mask */}
        <path
          d="M8 28C8 18 20 16 32 22C44 16 56 18 56 28C56 40 45 46 36 42L32 36L28 42C19 46 8 40 8 28Z"
          fill="url(#carnMask)"
          stroke="#FDE047"
          strokeWidth="2"
        />
        <ellipse cx="21" cy="29" rx="5" ry="3.5" fill="#0B0C10" stroke="#FEF08A" strokeWidth="1.5" />
        <ellipse cx="43" cy="29" rx="5" ry="3.5" fill="#0B0C10" stroke="#FEF08A" strokeWidth="1.5" />
        {/* Confetti */}
        <circle cx="12" cy="12" r="2.5" fill="#00F5D4" />
        <circle cx="52" cy="12" r="2.5" fill="#FF007F" />
        <rect x="29" y="8" width="5" height="5" rx="1" transform="rotate(20 29 8)" fill="#FEE440" />
        <defs>
          <linearGradient id="carnMask" x1="8" y1="18" x2="56" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF007F" />
            <stop offset="0.5" stopColor="#9B5DE5" />
            <stop offset="1" stopColor="#00BBF9" />
          </linearGradient>
        </defs>
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Festive Clown / Jester Hat & Confetti */}
        <circle cx="32" cy="36" r="14" fill="#FDE68A" stroke="#F59E0B" strokeWidth="2" />
        {/* Red Clown Nose */}
        <circle cx="32" cy="37" r="4.5" fill="#EF4444" />
        {/* Eyes & Smile */}
        <circle cx="26" cy="31" r="1.8" fill="#1E293B" />
        <circle cx="38" cy="31" r="1.8" fill="#1E293B" />
        <path d="M25 42C28 46 36 46 39 42" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
        {/* Colorful Hair / Hat */}
        <circle cx="16" cy="28" r="6" fill="#EC4899" />
        <circle cx="48" cy="28" r="6" fill="#06B6D4" />
        <path d="M22 23L32 8L42 23H22Z" fill="#A855F7" stroke="#FDE047" strokeWidth="1.5" />
        <circle cx="32" cy="7" r="3" fill="#FDE047" />
      </svg>
    );
  }

  // 3. SAINT-VALENTIN (11 fév - 14 fév): Romantic Hearts & Embrace
  if (theme === 'valentines') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Two Intertwined Hearts */}
        <path
          d="M26 48C26 48 8 36 8 22C8 15 13 10 20 10C24 10 26 13 26 15C26 13 28 10 32 10C39 10 44 15 44 22C44 36 26 48 26 48Z"
          fill="#E11D48"
          stroke="#FECDD3"
          strokeWidth="1.5"
        />
        <path
          d="M42 54C42 54 28 44 28 33C28 27 32 23 37 23C40 23 42 25 42 27C42 25 44 23 47 23C52 23 56 27 56 33C56 44 42 54 42 54Z"
          fill="#FB7185"
          stroke="#FFF1F2"
          strokeWidth="1.5"
        />
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-sway" fill="none">
        {/* Embrace / Heart Halo */}
        <path
          d="M32 54C32 54 10 39 10 23C10 15 16 9 24 9C28 9 31 12 32 15C33 12 36 9 40 9C48 9 54 15 54 23C54 39 32 54 32 54Z"
          fill="url(#valGrad)"
          stroke="#FFE4E6"
          strokeWidth="2"
        />
        <circle cx="26" cy="26" r="4" fill="#FFF1F2" />
        <circle cx="38" cy="26" r="4" fill="#FFF1F2" />
        <path d="M20 38C24 32 40 32 44 38" stroke="#FFF1F2" strokeWidth="2.5" strokeLinecap="round" />
        <defs>
          <linearGradient id="valGrad" x1="10" y1="9" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FB7185" />
            <stop offset="1" stopColor="#BE123C" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 4. PÂQUES (1er avr - 30 avr): Chocolate Eggs Basket & Little Bunny
  if (theme === 'easter') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Basket of Chocolate & Decorated Eggs */}
        <path d="M14 34C14 18 50 18 50 34" stroke="#D97706" strokeWidth="3" fill="none" />
        {/* Eggs inside basket */}
        <ellipse cx="23" cy="32" rx="6" ry="8" fill="#78350F" stroke="#FDE68A" strokeWidth="1.5" />
        <ellipse cx="32" cy="30" rx="6.5" ry="9" fill="#F472B6" stroke="#FEF08A" strokeWidth="1.5" />
        <ellipse cx="41" cy="32" rx="6" ry="8" fill="#34D399" stroke="#FEF08A" strokeWidth="1.5" />
        {/* Basket body */}
        <path d="M10 34H54L48 52H16L10 34Z" fill="#B45309" stroke="#FDE68A" strokeWidth="2" />
        <path d="M14 42H50" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-sway" fill="none">
        {/* Little Easter Bunny */}
        <ellipse cx="24" cy="18" rx="4.5" ry="12" transform="rotate(-10 24 18)" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" />
        <ellipse cx="40" cy="18" rx="4.5" ry="12" transform="rotate(10 40 18)" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" />
        <ellipse cx="24" cy="19" rx="2" ry="7" transform="rotate(-10 24 19)" fill="#F9A8D4" />
        <ellipse cx="40" cy="19" rx="2" ry="7" transform="rotate(10 40 19)" fill="#F9A8D4" />
        <circle cx="32" cy="38" r="14" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="27" cy="35" r="2" fill="#1E293B" />
        <circle cx="37" cy="35" r="2" fill="#1E293B" />
        <polygon points="32,39 29,42 35,42" fill="#F472B6" />
      </svg>
    );
  }

  // 5. VACANCES D'ÉTÉ (1er juil - 31 août): Radiant Sun & Beach Waves/Palm
  if (theme === 'summer') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-spin-slow" fill="none">
        {/* Radiant Summer Sun */}
        <circle cx="32" cy="32" r="13" fill="#FACC15" stroke="#FEF08A" strokeWidth="2" />
        <g stroke="#F59E0B" strokeWidth="3" strokeLinecap="round">
          <line x1="32" y1="6" x2="32" y2="13" />
          <line x1="32" y1="51" x2="32" y2="58" />
          <line x1="6" y1="32" x2="13" y2="32" />
          <line x1="51" y1="32" x2="58" y2="32" />
          <line x1="13" y1="13" x2="18" y2="18" />
          <line x1="46" y1="46" x2="51" y2="51" />
          <line x1="51" y1="13" x2="46" y2="18" />
          <line x1="18" y1="46" x2="13" y2="51" />
        </g>
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Beach Umbrella, Sun & Ocean Waves */}
        <path d="M12 30C12 16 52 16 52 30Z" fill="#FB7185" stroke="#FEF08A" strokeWidth="1.5" />
        <path d="M24 30C24 18 40 18 40 30Z" fill="#FACC15" />
        <line x1="32" y1="30" x2="28" y2="48" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M8 50C16 46 24 54 32 50C40 46 48 54 56 50" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 56C20 52 28 60 36 56C44 52 50 58 54 56" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 6. HALLOWEEN (15 oct - 2 nov): Jack-o'-lantern Pumpkin, Flying Bat & Cobweb
  if (theme === 'halloween') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Glowing Halloween Pumpkin (Citrouille) */}
        <path d="M29 14C29 9 33 6 36 6" stroke="#4ADE80" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="32" cy="36" rx="22" ry="18" fill="#EA580C" stroke="#FB923C" strokeWidth="2" />
        <ellipse cx="32" cy="36" rx="12" ry="18" fill="#F97316" />
        {/* Glowing Eyes & Jagged Smile */}
        <polygon points="22,28 17,35 26,35" fill="#FEF08A" className="anim-twinkle" />
        <polygon points="42,28 38,35 47,35" fill="#FEF08A" className="anim-twinkle" />
        <polygon points="32,34 29,39 35,39" fill="#FEF08A" />
        <path
          d="M18 43L23 47L28 44L32 48L36 44L41 47L46 43"
          stroke="#FEF08A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-bat" fill="none">
        {/* Cobweb (Toile d'araignée) in background */}
        <g stroke="#CBD5E1" strokeOpacity="0.45" strokeWidth="1">
          <line x1="6" y1="6" x2="58" y2="58" />
          <line x1="58" y1="6" x2="6" y2="58" />
          <line x1="32" y1="2" x2="32" y2="62" />
          <line x1="2" y1="32" x2="62" y2="32" />
          <polygon points="32,12 46,18 52,32 46,46 32,52 18,46 12,32 18,18" fill="none" />
          <polygon points="32,20 40,24 44,32 40,40 32,44 24,40 20,32 24,24" fill="none" />
        </g>
        {/* Flying Bat (Chauve-souris) */}
        <path
          d="M4 26C12 18 20 22 26 30L29 24L32 27L35 24L38 30C44 22 52 18 60 26C52 30 48 36 46 42C40 38 36 40 32 46C28 40 24 38 18 42C16 36 12 30 4 26Z"
          fill="#9333EA"
          stroke="#F97316"
          strokeWidth="1.5"
        />
        <circle cx="30" cy="30" r="1.5" fill="#FEF08A" />
        <circle cx="34" cy="30" r="1.5" fill="#FEF08A" />
      </svg>
    );
  }

  // 7. NOËL (1er déc - 25 déc): Christmas Tree, Garlands, Ornaments & Snowflakes
  if (theme === 'christmas') {
    return side === 'left' ? (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-sway" fill="none">
        {/* Decorated Christmas Tree (Sapin, guirlandes, étoile & boules) */}
        <polygon points="32,6 34,11 39,11 35,14 37,19 32,16 27,19 29,14 25,11 30,11" fill="#FDE047" className="anim-twinkle" />
        <polygon points="32,16 18,32 46,32" fill="#15803D" stroke="#4ADE80" strokeWidth="1" />
        <polygon points="32,26 14,44 50,44" fill="#166534" stroke="#4ADE80" strokeWidth="1" />
        <polygon points="32,36 10,54 54,54" fill="#14532D" stroke="#4ADE80" strokeWidth="1" />
        <rect x="28" y="54" width="8" height="6" fill="#78350F" />
        {/* Golden Garlands (Guirlandes) */}
        <path d="M22 28C28 32 36 32 42 29" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
        <path d="M17 40C27 45 37 45 47 41" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
        <path d="M13 50C26 55 38 55 51 51" stroke="#FDE047" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
        {/* Christmas Baubles (Boules de Noël) */}
        <circle cx="26" cy="30" r="2.5" fill="#EF4444" />
        <circle cx="38" cy="39" r="2.5" fill="#FACC15" />
        <circle cx="22" cy="48" r="2.8" fill="#EF4444" />
        <circle cx="40" cy="49" r="2.5" fill="#38BDF8" />
      </svg>
    ) : (
      <svg viewBox="0 0 64 64" className="w-8 h-8 sm:w-11 sm:h-11 shrink-0 anim-float" fill="none">
        {/* Christmas Bauble & Snowflake (Boule de Noël & Flocon) */}
        <rect x="28" y="10" width="8" height="5" rx="1" fill="#FACC15" />
        <path d="M32 6V10" stroke="#FDE047" strokeWidth="2" />
        <circle cx="32" cy="34" r="18" fill="url(#xmasBall)" stroke="#FDE047" strokeWidth="2" />
        {/* Snowflake pattern on ornament */}
        <g stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" className="anim-twinkle">
          <line x1="32" y1="22" x2="32" y2="46" />
          <line x1="20" y1="34" x2="44" y2="34" />
          <line x1="24" y1="26" x2="40" y2="42" />
          <line x1="40" y1="26" x2="24" y2="42" />
        </g>
        <defs>
          <radialGradient id="xmasBall" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#FCA5A5" />
            <stop offset="50%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </radialGradient>
        </defs>
      </svg>
    );
  }

  return null;
};

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onOpenAdmin,
}) => {
  const [autoTheme, setAutoTheme] = useState<SeasonalThemeId>(() => getSeasonalTheme(new Date()));
  const [selectedThemeMode, setSelectedThemeMode] = useState<SeasonalThemeId | 'auto'>(() => {
    try {
      const saved = localStorage.getItem('saulchoir_seasonal_theme_mode');
      return (saved as SeasonalThemeId | 'auto') || 'auto';
    } catch {
      return 'auto';
    }
  });

  // Re-evaluate date periodically in case the page stays open across midnight
  useEffect(() => {
    const updateThemeFromDate = () => {
      setAutoTheme(getSeasonalTheme(new Date()));
    };
    updateThemeFromDate();
    const timer = setInterval(updateThemeFromDate, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleThemeChange = (mode: SeasonalThemeId | 'auto') => {
    setSelectedThemeMode(mode);
    try {
      localStorage.setItem('saulchoir_seasonal_theme_mode', mode);
    } catch {
      // ignore storage errors
    }
  };

  const activeThemeId: SeasonalThemeId =
    selectedThemeMode !== 'auto' ? selectedThemeMode : autoTheme;
  const activeTheme = SEASONAL_THEMES[activeThemeId] || SEASONAL_THEMES.default;

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-[#0b0c10]/95 backdrop-blur-md border-b ${activeTheme.headerBorderClass} transition-colors`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 relative flex flex-col items-center justify-center">
        
        {/* Centered Prominent Site Title with Automatic Seasonal Animations & SVG Decorations */}
        <a
          href="#"
          className="text-center group flex flex-col items-center px-8"
        >
          <div className="flex items-center justify-center gap-2.5 sm:gap-4">
            <SeasonalDecorationSVG theme={activeThemeId} side="left" />

            <span
              className={`font-title-cinema text-xl sm:text-3xl md:text-4xl font-bold tracking-wider uppercase leading-snug ${activeTheme.titleClass}`}
            >
              Atelier Cinéma du Saulchoir
            </span>

            <SeasonalDecorationSVG theme={activeThemeId} side="right" />
          </div>

          <span className="mt-1.5 w-24 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
        </a>

        {/* Admin-only Seasonal Theme Selector (Auto by date + preview of all 7 holidays) */}
        {isAdmin && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-300 bg-zinc-900/90 border border-amber-500/25 rounded-full px-3.5 py-1 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-400">Ambiance du titre :</span>
            <select
              value={selectedThemeMode}
              onChange={e => handleThemeChange(e.target.value as SeasonalThemeId | 'auto')}
              className="bg-transparent text-amber-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-zinc-950 text-zinc-200">
                Automatique selon la date ({SEASONAL_THEMES[autoTheme].label})
              </option>
              <option value="new_year" className="bg-zinc-950 text-zinc-200">🎉 Nouvel An (30 déc – 15 janv)</option>
              <option value="carnival" className="bg-zinc-950 text-zinc-200">🎭 Carnaval (1er fév – 6 fév)</option>
              <option value="valentines" className="bg-zinc-950 text-zinc-200">💖 Saint-Valentin (11 fév – 14 fév)</option>
              <option value="easter" className="bg-zinc-950 text-zinc-200">🐰 Pâques (1er avr – 30 avr)</option>
              <option value="summer" className="bg-zinc-950 text-zinc-200">☀️ Vacances d'été (1er juil – 31 août)</option>
              <option value="halloween" className="bg-zinc-950 text-zinc-200">🎃 Halloween (15 oct – 2 nov)</option>
              <option value="christmas" className="bg-zinc-950 text-zinc-200">🎄 Noël (1er déc – 25 déc)</option>
              <option value="default" className="bg-zinc-950 text-zinc-200">✨ Standard (Hors fêtes)</option>
            </select>
          </div>
        )}

        {/* Discreet Admin Access Button in Top-Right Corner */}
        <button
          onClick={onOpenAdmin}
          aria-label="Accéder à l'espace administrateur"
          title={isAdmin ? 'Mode Administrateur actif' : 'Administration'}
          className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all flex items-center justify-center cursor-pointer ${
            isAdmin
              ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/25 hover:bg-amber-500/20 hover:text-amber-300'
              : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5 opacity-60 hover:opacity-100'
          }`}
        >
          {isAdmin ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>

      </div>
    </header>
  );
};
