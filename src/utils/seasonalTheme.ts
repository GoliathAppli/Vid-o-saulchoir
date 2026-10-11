/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SeasonalThemeId } from '../types/cinema';

export interface SeasonalThemeInfo {
  id: SeasonalThemeId;
  label: string;
  periodLabel: string;
  titleClass: string;
  headerBorderClass: string;
  // Extended page-wide theme properties
  pageBgGradient: string;
  ambientGlowPrimary: string;
  ambientGlowSecondary: string;
  sectionBorderClass: string;
  badgeGradientClass: string;
  badgeTextClass: string;
  frameGradientClass: string;
  frameBorderClass: string;
  frameCornerClass: string;
  dividerGradientClass: string;
  cardHoverBorderClass: string;
  accentIconColor: string;
  curtainHueClass: string;
}

export const SEASONAL_THEMES: Record<SeasonalThemeId, SeasonalThemeInfo> = {
  default: {
    id: 'default',
    label: 'Thème Standard (Cinéma Or)',
    periodLabel: 'Par défaut',
    titleClass: 'title-theme-default',
    headerBorderClass: 'border-amber-500/20',
    pageBgGradient: 'from-[#0b0c10] via-[#0f1016] to-[#0b0c10]',
    ambientGlowPrimary: 'bg-amber-500/12',
    ambientGlowSecondary: 'bg-red-900/10',
    sectionBorderClass: 'border-amber-500/15',
    badgeGradientClass: 'from-amber-500/20 via-amber-400/30 to-amber-500/20 border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.3)]',
    badgeTextClass: 'text-amber-300',
    frameGradientClass: 'from-amber-400/35 via-amber-500/15 to-amber-400/35',
    frameBorderClass: 'border-amber-400/70 shadow-[0_0_55px_rgba(245,158,11,0.26)]',
    frameCornerClass: 'border-amber-300',
    dividerGradientClass: 'via-amber-500/60',
    cardHoverBorderClass: 'hover:border-amber-400/50',
    accentIconColor: '#FBBF24',
    curtainHueClass: 'from-[#4a0813] via-[#2b040a] to-[#0d0608]',
  },
  new_year: {
    id: 'new_year',
    label: 'Nouvel An',
    periodLabel: '30 déc – 15 janv',
    titleClass: 'title-theme-new_year',
    headerBorderClass: 'border-yellow-300/45',
    pageBgGradient: 'from-[#090b14] via-[#101528] to-[#090b14]',
    ambientGlowPrimary: 'bg-yellow-400/15',
    ambientGlowSecondary: 'bg-sky-400/12',
    sectionBorderClass: 'border-yellow-400/25',
    badgeGradientClass: 'from-yellow-400/25 via-sky-300/25 to-yellow-400/25 border-yellow-300/70 shadow-[0_0_28px_rgba(253,224,71,0.38)]',
    badgeTextClass: 'text-yellow-200',
    frameGradientClass: 'from-yellow-300/40 via-sky-400/20 to-amber-400/40',
    frameBorderClass: 'border-yellow-300/80 shadow-[0_0_60px_rgba(250,204,21,0.32)]',
    frameCornerClass: 'border-yellow-200',
    dividerGradientClass: 'via-yellow-300/75',
    cardHoverBorderClass: 'hover:border-yellow-300/60',
    accentIconColor: '#FDE047',
    curtainHueClass: 'from-[#1e1b4b] via-[#172554] to-[#090d16]',
  },
  carnival: {
    id: 'carnival',
    label: 'Carnaval',
    periodLabel: '1er fév – 6 fév',
    titleClass: 'title-theme-carnival',
    headerBorderClass: 'border-fuchsia-500/45',
    pageBgGradient: 'from-[#12081c] via-[#170b26] to-[#0b0c14]',
    ambientGlowPrimary: 'bg-fuchsia-500/15',
    ambientGlowSecondary: 'bg-cyan-400/12',
    sectionBorderClass: 'border-fuchsia-500/25',
    badgeGradientClass: 'from-fuchsia-500/25 via-amber-400/30 to-cyan-400/25 border-fuchsia-400/70 shadow-[0_0_28px_rgba(232,121,249,0.35)]',
    badgeTextClass: 'text-amber-200',
    frameGradientClass: 'from-fuchsia-500/40 via-amber-400/25 to-cyan-400/40',
    frameBorderClass: 'border-fuchsia-400/75 shadow-[0_0_60px_rgba(217,70,239,0.3)]',
    frameCornerClass: 'border-yellow-300',
    dividerGradientClass: 'via-fuchsia-400/70',
    cardHoverBorderClass: 'hover:border-fuchsia-400/60',
    accentIconColor: '#F472B6',
    curtainHueClass: 'from-[#4a044e] via-[#2e1065] to-[#0c0612]',
  },
  valentines: {
    id: 'valentines',
    label: 'Saint-Valentin',
    periodLabel: '11 fév – 14 fév',
    titleClass: 'title-theme-valentines',
    headerBorderClass: 'border-rose-500/45',
    pageBgGradient: 'from-[#16070d] via-[#1f0913] to-[#0d0609]',
    ambientGlowPrimary: 'bg-rose-500/16',
    ambientGlowSecondary: 'bg-pink-500/12',
    sectionBorderClass: 'border-rose-500/25',
    badgeGradientClass: 'from-rose-500/30 via-pink-400/30 to-rose-500/30 border-rose-400/70 shadow-[0_0_28px_rgba(244,63,94,0.38)]',
    badgeTextClass: 'text-rose-200',
    frameGradientClass: 'from-rose-400/40 via-pink-500/20 to-amber-300/35',
    frameBorderClass: 'border-rose-400/75 shadow-[0_0_60px_rgba(244,63,94,0.32)]',
    frameCornerClass: 'border-rose-300',
    dividerGradientClass: 'via-rose-400/70',
    cardHoverBorderClass: 'hover:border-rose-400/60',
    accentIconColor: '#FB7185',
    curtainHueClass: 'from-[#650626] via-[#3b0416] to-[#110409]',
  },
  easter: {
    id: 'easter',
    label: 'Pâques',
    periodLabel: '1er avr – 30 avr',
    titleClass: 'title-theme-easter',
    headerBorderClass: 'border-emerald-400/40',
    pageBgGradient: 'from-[#091310] via-[#101c16] to-[#0b0e10]',
    ambientGlowPrimary: 'bg-emerald-400/14',
    ambientGlowSecondary: 'bg-amber-300/12',
    sectionBorderClass: 'border-emerald-400/25',
    badgeGradientClass: 'from-emerald-400/25 via-amber-300/30 to-pink-300/25 border-emerald-300/65 shadow-[0_0_25px_rgba(52,211,153,0.32)]',
    badgeTextClass: 'text-amber-200',
    frameGradientClass: 'from-emerald-300/35 via-amber-300/25 to-pink-300/35',
    frameBorderClass: 'border-emerald-300/70 shadow-[0_0_55px_rgba(52,211,153,0.28)]',
    frameCornerClass: 'border-amber-200',
    dividerGradientClass: 'via-emerald-300/65',
    cardHoverBorderClass: 'hover:border-emerald-300/60',
    accentIconColor: '#6EE7B7',
    curtainHueClass: 'from-[#3e2723] via-[#1b3022] to-[#0a100d]',
  },
  summer: {
    id: 'summer',
    label: "Vacances d'été",
    periodLabel: '1er juil – 31 août',
    titleClass: 'title-theme-summer',
    headerBorderClass: 'border-amber-400/50',
    pageBgGradient: 'from-[#08131c] via-[#0d1f2d] to-[#0b0f14]',
    ambientGlowPrimary: 'bg-amber-400/16',
    ambientGlowSecondary: 'bg-sky-400/14',
    sectionBorderClass: 'border-sky-400/25',
    badgeGradientClass: 'from-amber-400/30 via-sky-400/25 to-rose-400/25 border-amber-300/70 shadow-[0_0_28px_rgba(251,191,36,0.38)]',
    badgeTextClass: 'text-amber-200',
    frameGradientClass: 'from-amber-400/40 via-sky-400/25 to-amber-300/40',
    frameBorderClass: 'border-amber-300/80 shadow-[0_0_60px_rgba(56,189,248,0.3)]',
    frameCornerClass: 'border-yellow-300',
    dividerGradientClass: 'via-sky-400/70',
    cardHoverBorderClass: 'hover:border-sky-400/60',
    accentIconColor: '#FACC15',
    curtainHueClass: 'from-[#0c4a6e] via-[#451a03] to-[#081018]',
  },
  halloween: {
    id: 'halloween',
    label: 'Halloween',
    periodLabel: '1er oct – 2 nov',
    titleClass: 'title-theme-halloween',
    headerBorderClass: 'border-orange-500/50',
    pageBgGradient: 'from-[#120905] via-[#190a1f] to-[#0a070d]',
    ambientGlowPrimary: 'bg-orange-500/18',
    ambientGlowSecondary: 'bg-purple-600/15',
    sectionBorderClass: 'border-orange-500/30',
    badgeGradientClass: 'from-orange-500/30 via-purple-600/30 to-orange-500/30 border-orange-400/75 shadow-[0_0_30px_rgba(249,115,22,0.42)]',
    badgeTextClass: 'text-orange-200',
    frameGradientClass: 'from-orange-500/45 via-purple-700/30 to-orange-500/45',
    frameBorderClass: 'border-orange-400/80 shadow-[0_0_65px_rgba(234,88,12,0.35)]',
    frameCornerClass: 'border-orange-400',
    dividerGradientClass: 'via-orange-500/75',
    cardHoverBorderClass: 'hover:border-orange-400/65',
    accentIconColor: '#FB923C',
    curtainHueClass: 'from-[#431407] via-[#2e1065] to-[#09050e]',
  },
  christmas: {
    id: 'christmas',
    label: 'Noël',
    periodLabel: '1er déc – 25 déc',
    titleClass: 'title-theme-christmas',
    headerBorderClass: 'border-red-500/45',
    pageBgGradient: 'from-[#140709] via-[#091912] to-[#0a0c10]',
    ambientGlowPrimary: 'bg-red-500/16',
    ambientGlowSecondary: 'bg-emerald-500/14',
    sectionBorderClass: 'border-red-500/30',
    badgeGradientClass: 'from-red-600/30 via-emerald-600/25 to-amber-400/30 border-amber-300/75 shadow-[0_0_30px_rgba(239,68,68,0.38)]',
    badgeTextClass: 'text-amber-100',
    frameGradientClass: 'from-red-500/40 via-emerald-600/25 to-amber-400/40',
    frameBorderClass: 'border-amber-300/80 shadow-[0_0_65px_rgba(220,38,38,0.32)]',
    frameCornerClass: 'border-amber-300',
    dividerGradientClass: 'via-red-400/75',
    cardHoverBorderClass: 'hover:border-red-400/60',
    accentIconColor: '#F87171',
    curtainHueClass: 'from-[#5c0612] via-[#063720] to-[#0a0c0e]',
  },
};

/**
 * Determines which seasonal theme to apply based on the given date.
 * Automatically handles year-end cross-over (Dec 30 -> Jan 15).
 */
export function getSeasonalTheme(date: Date = new Date()): SeasonalThemeId {
  const month = date.getMonth(); // 0 = Jan, 1 = Feb, ..., 11 = Dec
  const day = date.getDate();   // 1..31

  // 1. Nouvel An (30 déc - 15 janv)
  if ((month === 11 && day >= 30) || (month === 0 && day <= 15)) {
    return 'new_year';
  }

  // 2. Carnaval (1er fév - 6 fév)
  if (month === 1 && day >= 1 && day <= 6) {
    return 'carnival';
  }

  // 3. Saint-Valentin (11 fév - 14 fév)
  if (month === 1 && day >= 11 && day <= 14) {
    return 'valentines';
  }

  // 4. Pâques (1er avr - 30 avr)
  if (month === 3 && day >= 1 && day <= 30) {
    return 'easter';
  }

  // 5. Vacances d'été (1er juil - 31 août)
  if (month === 6 || month === 7) {
    return 'summer';
  }

  // 6. Halloween (1er oct - 2 nov)
  if ((month === 9 && day >= 1) || (month === 10 && day <= 2)) {
    return 'halloween';
  }

  // 7. Noël (1er déc - 25 déc)
  if (month === 11 && day >= 1 && day <= 25) {
    return 'christmas';
  }

  // Comportement par défaut
  return 'default';
}
