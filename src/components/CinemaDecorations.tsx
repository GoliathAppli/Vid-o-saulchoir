/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SeasonalThemeId } from '../types/cinema';

/**
 * Custom Cinema Popcorn Bucket SVG Icon
 * Used on "Actualité" and "Nouvelle Publication" section titles
 */
export const PopcornBucketIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    {/* Fluffy Golden Popcorn Kernels on Top */}
    <circle cx="22" cy="18" r="7" fill="#FDE047" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="42" cy="18" r="7" fill="#FDE047" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="32" cy="13" r="8.5" fill="#FEF08A" stroke="#D97706" strokeWidth="1.5" />
    <circle cx="15" cy="24" r="6" fill="#FACC15" stroke="#B45309" strokeWidth="1.5" />
    <circle cx="49" cy="24" r="6" fill="#FACC15" stroke="#B45309" strokeWidth="1.5" />
    <circle cx="25" cy="23" r="6.5" fill="#FEF9C3" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="39" cy="23" r="6.5" fill="#FEF9C3" stroke="#D97706" strokeWidth="1.2" />
    <circle cx="32" cy="21" r="6" fill="#FDE047" />
    {/* Kernel warm butter highlights */}
    <circle cx="30" cy="11" r="2.2" fill="#FFFFFF" opacity="0.7" />
    <circle cx="20" cy="16" r="1.8" fill="#FFFFFF" opacity="0.6" />
    <circle cx="43" cy="16" r="1.8" fill="#FFFFFF" opacity="0.6" />

    {/* Classic Cinema Striped Bucket Body (Trapezoid) */}
    <path
      d="M12 26H52L46 58H18L12 26Z"
      fill="#FFFFFF"
      stroke="#F59E0B"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Red Vertical Cinema Stripes */}
    <path d="M12.5 26H20L22.5 58H18L12.5 26Z" fill="#DC2626" />
    <path d="M28 26H36L35 58H29L28 26Z" fill="#DC2626" />
    <path d="M44 26H51.5L46 58H41.5L44 26Z" fill="#DC2626" />

    {/* Golden Scalloped Rim & Center Cinema Medallion */}
    <rect x="10" y="24" width="44" height="4" rx="2" fill="#FBBF24" stroke="#B45309" strokeWidth="1.2" />
    <ellipse cx="32" cy="42" rx="7.5" ry="6" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.8" />
    <polygon points="32,38 33.4,40.8 36.5,41.2 34.2,43.3 34.8,46.3 32,44.8 29.2,46.3 29.8,43.3 27.5,41.2 30.6,40.8" fill="#D97706" />

    {/* Bottom Golden Base Line */}
    <rect x="17" y="56.5" width="30" height="3" rx="1.5" fill="#FBBF24" stroke="#B45309" strokeWidth="1" />
  </svg>
);

/**
 * Rich Cinema Theater Stage Backdrop for the "Actualité" Frame
 * Appears behind posters/images when they don't cover the full aspect ratio,
 * featuring velvet stage curtains, 35mm film strips, projector light beams, and theater ambiance.
 */
export const CinemaStageBackdrop: React.FC<{
  photoUrl?: string;
  seasonalTheme?: SeasonalThemeId;
}> = ({ photoUrl, seasonalTheme = 'default' }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Deep Cinema Auditorium Base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#2a0810_0%,_#120408_55%,_#070508_100%)]" />

      {/* 2. Soft Color Reflection of the Current Poster */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-125 saturate-150"
        />
      )}

      {/* 3. Subtle Art-Deco Cinema Wallpaper Pattern in Exposed Side Areas */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.45) 1px, transparent 1px), radial-gradient(circle at 0% 0%, rgba(220, 38, 38, 0.35) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
          backgroundPosition: '0 0, 14px 14px',
        }}
      />

      {/* 4. Overhead Cinema Projector Light Beams */}
      <div
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-[120%] h-[85%] opacity-40"
        style={{
          background:
            'conic-gradient(from 180deg at 50% 0%, transparent 32%, rgba(253, 224, 71, 0.16) 44%, rgba(255, 251, 235, 0.28) 50%, rgba(253, 224, 71, 0.16) 56%, transparent 68%)',
          filter: 'blur(18px)',
        }}
      />

      {/* 5. Left & Right Draped Red Velvet Theater Curtains (Visible when poster is vertical/smaller) */}
      <div className="absolute inset-y-0 left-0 w-20 sm:w-36 md:w-48 flex">
        <div
          className="w-full h-full opacity-90 shadow-[15px_0_35px_rgba(0,0,0,0.85)]"
          style={{
            background:
              'repeating-linear-gradient(90deg, #450a0a 0px, #7f1d1d 10px, #991b1b 16px, #450a0a 26px, #2a0404 34px)',
          }}
        />
        {/* Golden Curtain Tie-back Cord */}
        <div className="absolute top-1/2 -translate-y-1/2 right-1 w-1.5 h-24 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.6)] opacity-80" />
      </div>

      <div className="absolute inset-y-0 right-0 w-20 sm:w-36 md:w-48 flex">
        <div
          className="w-full h-full opacity-90 shadow-[-15px_0_35px_rgba(0,0,0,0.85)]"
          style={{
            background:
              'repeating-linear-gradient(270deg, #450a0a 0px, #7f1d1d 10px, #991b1b 16px, #450a0a 26px, #2a0404 34px)',
          }}
        />
        {/* Golden Curtain Tie-back Cord */}
        <div className="absolute top-1/2 -translate-y-1/2 left-1 w-1.5 h-24 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.6)] opacity-80" />
      </div>

      {/* 6. Top Draped Cinema Valance (Pelmet) */}
      <div
        className="absolute top-0 inset-x-0 h-5 sm:h-7 opacity-85 border-b border-amber-400/40 shadow-[0_6px_20px_rgba(0,0,0,0.8)]"
        style={{
          background:
            'repeating-linear-gradient(90deg, #450a0a 0px, #991b1b 18px, #450a0a 36px)',
        }}
      />

      {/* 7. 35mm Film Strip Sprocket Holes on Left and Right Outer Rails */}
      <div className="hidden sm:flex absolute inset-y-6 left-2.5 w-4 flex-col justify-between py-2 opacity-45">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={`sprocket-l-${i}`}
            className="w-3.5 h-2.5 rounded-[2px] bg-amber-200/80 border border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
          />
        ))}
      </div>
      <div className="hidden sm:flex absolute inset-y-6 right-2.5 w-4 flex-col justify-between py-2 opacity-45">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={`sprocket-r-${i}`}
            className="w-3.5 h-2.5 rounded-[2px] bg-amber-200/80 border border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.4)]"
          />
        ))}
      </div>

      {/* 8. Bottom Stage Footlights & Velvet Seat Silhouettes */}
      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black via-black/75 to-transparent flex items-end justify-center gap-2 sm:gap-3 px-8 pb-1 opacity-55">
        {Array.from({ length: 11 }).map((_, idx) => (
          <div
            key={`seat-${idx}`}
            className="w-7 sm:w-10 h-3.5 sm:h-4 rounded-t-lg bg-gradient-to-b from-red-950 to-black border-t border-amber-500/20"
          />
        ))}
      </div>

      {/* 9. Subtle Seasonal Accent Glow inside the Stage */}
      {seasonalTheme === 'christmas' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-red-600/10 via-transparent to-emerald-500/10" />
      )}
      {seasonalTheme === 'halloween' && (
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/15 via-transparent to-purple-600/15" />
      )}
    </div>
  );
};

/**
 * Cinema Marquee Bulbs Row (Top & Bottom of the Actualité Cinema Frame)
 */
export const CinemaMarqueeBulbs: React.FC<{ count?: number }> = ({ count = 15 }) => (
  <div className="flex items-center justify-between px-4 sm:px-8 py-1 pointer-events-none select-none" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-200 shadow-[0_0_8px_#fbbf24,0_0_14px_#f59e0b] ${
          i % 2 === 0 ? 'anim-twinkle' : ''
        }`}
        style={{ animationDelay: `${(i % 5) * 0.35}s` }}
      />
    ))}
  </div>
);

/**
 * Seasonal Corner Ornaments placed on Major Frames (Actualité & Nouvelle Publication)
 */
export const SeasonalFrameCorners: React.FC<{ theme: SeasonalThemeId }> = ({ theme }) => {
  if (theme === 'default') return null;

  const badgeContent: Record<Exclude<SeasonalThemeId, 'default'>, { tl: string; tr: string; bl: string; br: string }> = {
    new_year: { tl: '✨', tr: '🥂', bl: '🎆', br: '✨' },
    carnival: { tl: '🎭', tr: '🎊', bl: '🎪', br: '🎭' },
    valentines: { tl: '💖', tr: '🌹', bl: '💘', br: '💖' },
    easter: { tl: '🥚', tr: '🐰', bl: '🌷', br: '🐣' },
    summer: { tl: '☀️', tr: '🌴', bl: '🌊', br: '🐚' },
    halloween: { tl: '🎃', tr: '🦇', bl: '🕸️', br: '🎃' },
    christmas: { tl: '🎄', tr: '❄️', bl: '🎁', br: '⭐' },
  };

  const icons = badgeContent[theme];
  if (!icons) return null;

  return (
    <div className="pointer-events-none select-none" aria-hidden="true">
      <span className="absolute -top-3 -left-2.5 z-30 text-base sm:text-xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] anim-float">
        {icons.tl}
      </span>
      <span className="absolute -top-3 -right-2.5 z-30 text-base sm:text-xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] anim-sway">
        {icons.tr}
      </span>
      <span className="absolute -bottom-3 -left-2.5 z-30 text-base sm:text-xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] anim-sway">
        {icons.bl}
      </span>
      <span className="absolute -bottom-3 -right-2.5 z-30 text-base sm:text-xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] anim-float">
        {icons.br}
      </span>
    </div>
  );
};

/**
 * Whole-Page Seasonal Atmosphere Overlay & Header Garland
 * Extends the seasonal holiday theme across the entire page when active
 */
export const SeasonalPageAtmosphere: React.FC<{ theme: SeasonalThemeId }> = ({ theme }) => {
  if (theme === 'default') return null;

  // 18 subtle floating particles distributed across the viewport
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${(i * 5.7 + 3) % 96}%`,
    delay: `${(i * 0.9) % 11}s`,
    duration: `${13 + (i % 7) * 2.5}s`,
    size: i % 3 === 0 ? 'text-base sm:text-lg' : 'text-xs sm:text-sm',
  }));

  const getParticleSymbol = (idx: number): string => {
    switch (theme) {
      case 'christmas':
        return ['❄️', '❅', '✦', '🎄', '⭐'][idx % 5];
      case 'halloween':
        return ['🦇', '🎃', '🕸️', '🍂', '✨'][idx % 5];
      case 'easter':
        return ['🥚', '🌸', '🌷', '🐣', '🦋'][idx % 5];
      case 'valentines':
        return ['💖', '💕', '🌹', '✨', '💘'][idx % 5];
      case 'carnival':
        return ['🎊', '🎭', '✨', '🎉', '🎈'][idx % 5];
      case 'new_year':
        return ['✨', '🥂', '🎆', '⭐', '🎊'][idx % 5];
      case 'summer':
        return ['☀️', '🌴', '🌊', '🌺', '✨'][idx % 5];
      default:
        return '✨';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none" aria-hidden="true">
      {/* Top Festive Ribbon / Garland right under the Header */}
      {theme === 'christmas' && (
        <div className="absolute top-[74px] sm:top-[84px] inset-x-0 flex justify-around items-center px-4 opacity-80">
          {Array.from({ length: 16 }).map((_, i) => {
            const bulbColors = [
              'bg-red-500 shadow-[0_0_10px_#ef4444]',
              'bg-amber-300 shadow-[0_0_10px_#fcd34d]',
              'bg-emerald-400 shadow-[0_0_10px_#34d399]',
              'bg-sky-300 shadow-[0_0_10px_#7dd3fc]',
            ];
            return (
              <span
                key={`xmas-bulb-${i}`}
                className={`w-2 h-2.5 rounded-full ${bulbColors[i % bulbColors.length]} anim-twinkle`}
                style={{ animationDelay: `${(i % 4) * 0.4}s` }}
              />
            );
          })}
        </div>
      )}

      {theme === 'halloween' && (
        <>
          {/* Subtle Decorative Cobwebs in Top Screen Corners */}
          <svg
            viewBox="0 0 120 120"
            className="absolute top-[72px] left-0 w-24 h-24 sm:w-32 sm:h-32 text-orange-400/20"
            fill="none"
          >
            <path d="M0 0L120 20M0 0L100 60M0 0L60 100M0 0L20 120" stroke="currentColor" strokeWidth="1.2" />
            <path d="M35 6C32 22 22 32 6 35" stroke="currentColor" strokeWidth="1.2" />
            <path d="M68 11C62 42 42 62 11 68" stroke="currentColor" strokeWidth="1.2" />
            <path d="M100 17C90 62 62 90 17 100" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <svg
            viewBox="0 0 120 120"
            className="absolute top-[72px] right-0 w-24 h-24 sm:w-32 sm:h-32 text-orange-400/20 -scale-x-100"
            fill="none"
          >
            <path d="M0 0L120 20M0 0L100 60M0 0L60 100M0 0L20 120" stroke="currentColor" strokeWidth="1.2" />
            <path d="M35 6C32 22 22 32 6 35" stroke="currentColor" strokeWidth="1.2" />
            <path d="M68 11C62 42 42 62 11 68" stroke="currentColor" strokeWidth="1.2" />
            <path d="M100 17C90 62 62 90 17 100" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </>
      )}

      {/* Gentle Page-Wide Falling / Floating Seasonal Elements */}
      {particles.map(p => (
        <span
          key={p.id}
          className={` seasonal-particle ${p.size} opacity-45`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        >
          {getParticleSymbol(p.id)}
        </span>
      ))}
    </div>
  );
};
