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
}

export const SEASONAL_THEMES: Record<SeasonalThemeId, SeasonalThemeInfo> = {
  default: {
    id: 'default',
    label: 'Thème Standard (Cinéma Or)',
    periodLabel: 'Par défaut',
    titleClass: 'title-theme-default',
    headerBorderClass: 'border-amber-500/15',
  },
  new_year: {
    id: 'new_year',
    label: 'Nouvel An',
    periodLabel: '30 déc – 15 janv',
    titleClass: 'title-theme-new_year',
    headerBorderClass: 'border-yellow-400/40',
  },
  carnival: {
    id: 'carnival',
    label: 'Carnaval',
    periodLabel: '1er fév – 6 fév',
    titleClass: 'title-theme-carnival',
    headerBorderClass: 'border-fuchsia-500/40',
  },
  valentines: {
    id: 'valentines',
    label: 'Saint-Valentin',
    periodLabel: '11 fév – 14 fév',
    titleClass: 'title-theme-valentines',
    headerBorderClass: 'border-rose-500/40',
  },
  easter: {
    id: 'easter',
    label: 'Pâques',
    periodLabel: '1er avr – 30 avr',
    titleClass: 'title-theme-easter',
    headerBorderClass: 'border-emerald-400/35',
  },
  summer: {
    id: 'summer',
    label: "Vacances d'été",
    periodLabel: '1er juil – 31 août',
    titleClass: 'title-theme-summer',
    headerBorderClass: 'border-amber-400/45',
  },
  halloween: {
    id: 'halloween',
    label: 'Halloween',
    periodLabel: '15 oct – 2 nov',
    titleClass: 'title-theme-halloween',
    headerBorderClass: 'border-orange-500/45',
  },
  christmas: {
    id: 'christmas',
    label: 'Noël',
    periodLabel: '1er déc – 25 déc',
    titleClass: 'title-theme-christmas',
    headerBorderClass: 'border-red-500/40',
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

  // 6. Halloween (15 oct - 2 nov)
  if ((month === 9 && day >= 15) || (month === 10 && day <= 2)) {
    return 'halloween';
  }

  // 7. Noël (1er déc - 25 déc)
  if (month === 11 && day >= 1 && day <= 25) {
    return 'christmas';
  }

  // Comportement par défaut
  return 'default';
}
