/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { NewsPhoto, NewsCountdown } from '../types/cinema';
import {
  Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon,
  CheckCircle2, Loader2, AlertCircle, Clock, Timer, ChevronUp, RefreshCw, Cloud
} from 'lucide-react';

interface NewsCarouselSectionProps {
  photos: NewsPhoto[];
  isAdmin: boolean;
  onUpdatePhotos: (updatedPhotos: NewsPhoto[]) => Promise<{ syncedToGitHub: boolean; error?: string }> | void;
  countdown: NewsCountdown;
  onUpdateCountdown: (updatedCountdown: NewsCountdown) => Promise<{ syncedToGitHub: boolean; error?: string }> | void;
}

/**
 * Compresses/resizes an uploaded image file to a clean Data URL (max 1600px)
 * so multiple large photos can be stored locally and synced to GitHub smoothly.
 */
function resizeImageFile(file: File, maxWidth = 1600, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const FRENCH_MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const NewsCarouselSection: React.FC<NewsCarouselSectionProps> = ({
  photos,
  isAdmin,
  onUpdatePhotos,
  countdown,
  onUpdateCountdown,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdminInteracting, setIsAdminInteracting] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState<
    { state: 'idle' | 'syncing' | 'success' | 'error'; message?: string }
  >({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  // Resolve the countdown associated with a given photo (or fallback to legacy global countdown for first photo)
  const getCountdownForPhoto = (photo: NewsPhoto | undefined, index: number): NewsCountdown => {
    if (photo?.countdown) {
      return {
        enabled: Boolean(photo.countdown.enabled),
        targetDate: photo.countdown.targetDate || '',
        targetTime: photo.countdown.targetTime || '20:00',
        displayMode: photo.countdown.displayMode || 'days',
        updatedAt: photo.countdown.updatedAt,
      };
    }
    if (index === 0 && countdown && countdown.targetDate) {
      return {
        enabled: Boolean(countdown.enabled),
        targetDate: countdown.targetDate,
        targetTime: countdown.targetTime || '20:00',
        displayMode: countdown.displayMode || 'days',
        updatedAt: countdown.updatedAt,
      };
    }
    return {
      enabled: false,
      targetDate: '',
      targetTime: '20:00',
      displayMode: 'days',
    };
  };

  const safeIndex = photos.length > 0 ? Math.min(currentIndex, photos.length - 1) : 0;
  const activePhoto: NewsPhoto | undefined = photos[safeIndex];
  const activeCountdown: NewsCountdown =
    photos.length > 0 ? getCountdownForPhoto(activePhoto, safeIndex) : countdown;

  // Parse current active photo's targetDate (YYYY-MM-DD) or default to today's year/month/day for the selectors
  const parsedDateParts = (() => {
    if (activeCountdown.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(activeCountdown.targetDate)) {
      const [y, m, d] = activeCountdown.targetDate.split('-').map(Number);
      return { year: y, month: m, day: d };
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  })();

  const parsedTimeParts = (() => {
    if (activeCountdown.targetTime && /^\d{2}:\d{2}$/.test(activeCountdown.targetTime)) {
      const [h, m] = activeCountdown.targetTime.split(':').map(Number);
      return { hour: h, minute: m };
    }
    return { hour: 20, minute: 0 };
  })();

  // Live clock tick every 15 seconds so days/hours stay accurate in real time
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(new Date());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Keep currentIndex in bounds if photos are deleted
  useEffect(() => {
    if (currentIndex >= photos.length && photos.length > 0) {
      setCurrentIndex(0);
    }
  }, [photos.length, currentIndex]);

  // Automatic carousel rotation every 5 seconds (5000ms) when multiple photos exist
  // Pauses while Admin is actively configuring the countdown on a specific poster
  useEffect(() => {
    if (photos.length <= 1 || isAdminInteracting) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [photos.length, isAdminInteracting]);

  const triggerUpdateWithFeedback = async (updated: NewsPhoto[], customSuccessMsg?: string) => {
    setGithubSyncStatus({ state: 'syncing', message: 'Synchronisation GitHub en cours...' });
    const res = await onUpdatePhotos(updated);
    if (res && res.syncedToGitHub) {
      setGithubSyncStatus({
        state: 'success',
        message: customSuccessMsg || 'Synchronisé sur GitHub (visible sur tous les ordinateurs)',
      });
    } else if (res && res.error) {
      setGithubSyncStatus({
        state: 'error',
        message: res.error,
      });
    } else {
      setGithubSyncStatus({ state: 'idle' });
    }
  };

  // Automatically save & activate countdown for the CURRENT poster whenever Admin changes date, time, or display mode
  const applyCountdownChange = async (changes: Partial<NewsCountdown>) => {
    const fallbackDate = `${parsedDateParts.year}-${String(parsedDateParts.month).padStart(2, '0')}-${String(parsedDateParts.day).padStart(2, '0')}`;
    const nextCountdown: NewsCountdown = {
      enabled: changes.enabled !== undefined ? changes.enabled : true,
      targetDate: changes.targetDate !== undefined ? changes.targetDate : (activeCountdown.targetDate || fallbackDate),
      targetTime: changes.targetTime !== undefined ? changes.targetTime : (activeCountdown.targetTime || '20:00'),
      displayMode: changes.displayMode !== undefined ? changes.displayMode : (activeCountdown.displayMode || 'days'),
      updatedAt: new Date().toISOString(),
    };

    if (photos.length > 0) {
      const updatedPhotos = photos.map((p, idx) =>
        idx === safeIndex
          ? {
              ...p,
              countdown: nextCountdown,
            }
          : p
      );
      // Also keep legacy countdown synced if editing the first photo
      if (safeIndex === 0) {
        onUpdateCountdown(nextCountdown);
      }
      await triggerUpdateWithFeedback(
        updatedPhotos,
        nextCountdown.enabled
          ? `Compte à rebours de l'affiche n°${safeIndex + 1} synchronisé sur GitHub`
          : `Compte à rebours de l'affiche n°${safeIndex + 1} désactivé et synchronisé`
      );
    } else {
      setGithubSyncStatus({ state: 'syncing', message: 'Synchronisation du compte à rebours...' });
      const res = await onUpdateCountdown(nextCountdown);
      if (res && res.syncedToGitHub) {
        setGithubSyncStatus({
          state: 'success',
          message: 'Compte à rebours synchronisé sur GitHub',
        });
      } else if (res && res.error) {
        setGithubSyncStatus({
          state: 'error',
          message: res.error,
        });
      } else {
        setGithubSyncStatus({ state: 'idle' });
      }
    }
  };

  const handleDatePartChange = (part: 'day' | 'month' | 'year', val: number) => {
    const nextYear = part === 'year' ? val : parsedDateParts.year;
    const nextMonth = part === 'month' ? val : parsedDateParts.month;
    const maxDaysInMonth = new Date(nextYear, nextMonth, 0).getDate();
    const rawDay = part === 'day' ? val : parsedDateParts.day;
    const nextDay = Math.min(rawDay, maxDaysInMonth);

    const formattedDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
    applyCountdownChange({
      enabled: true,
      targetDate: formattedDate,
    });
  };

  const handleTimePartChange = (part: 'hour' | 'minute', val: number) => {
    const nextHour = part === 'hour' ? val : parsedTimeParts.hour;
    const nextMinute = part === 'minute' ? val : parsedTimeParts.minute;
    const formattedTime = `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`;
    applyCountdownChange({
      enabled: true,
      targetTime: formattedTime,
    });
  };

  // Compute remaining days and hours automatically for any NewsCountdown object
  const computeRemainingForCountdown = (cd: NewsCountdown | undefined) => {
    if (!cd || !cd.enabled || !cd.targetDate) return null;
    const activeDate = cd.targetDate;

    const [y, m, d] = activeDate.split('-').map(Number);
    if (!y || !m || !d) return null;

    const mode = cd.displayMode || 'days';

    if (mode === 'days') {
      const todayMidnight = new Date(nowTick.getFullYear(), nowTick.getMonth(), nowTick.getDate());
      const targetMidnight = new Date(y, m - 1, d);
      const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
      const formattedTarget = targetMidnight.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return {
        mode: 'days' as const,
        isToday: diffDays === 0,
        isPast: diffDays < 0,
        days: Math.max(0, diffDays),
        hours: 0,
        minutes: 0,
        formattedTarget,
      };
    } else {
      const timeParts = (cd.targetTime || '20:00').split(':').map(Number);
      const hr = !isNaN(timeParts[0]) ? timeParts[0] : 20;
      const min = !isNaN(timeParts[1]) ? timeParts[1] : 0;
      const targetDateTime = new Date(y, m - 1, d, hr, min, 0);
      const diffMs = targetDateTime.getTime() - nowTick.getTime();
      const isPast = diffMs <= 0;
      const clampedMs = Math.max(0, diffMs);
      const days = Math.floor(clampedMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((clampedMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((clampedMs % (1000 * 60 * 60)) / (1000 * 60));

      const datePart = targetDateTime.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const formattedTarget = `${datePart} à ${String(hr).padStart(2, '0')}h${String(min).padStart(2, '0')}`;

      return {
        mode: 'days_hours' as const,
        isToday: days === 0 && !isPast,
        isPast,
        days,
        hours,
        minutes,
        formattedTarget,
      };
    }
  };

  const remaining = computeRemainingForCountdown(activeCountdown);

  // Handle adding one or multiple photos from device
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newItems: NewsPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await resizeImageFile(files[i]);
        newItems.push({
          id: `news_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          url: dataUrl,
          addedAt: new Date().toISOString(),
          // If this is the very first photo added and a global countdown was pre-configured, attach it
          countdown:
            photos.length === 0 && i === 0 && countdown.enabled && countdown.targetDate
              ? { ...countdown }
              : {
                  enabled: false,
                  targetDate: '',
                  targetTime: '20:00',
                  displayMode: 'days',
                },
        });
      }
      const updated = [...photos, ...newItems];
      setCurrentIndex(photos.length); // jump to first newly added photo
      await triggerUpdateWithFeedback(updated);
    } catch (err) {
      console.error('Erreur lors du chargement des photos', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle deleting a photo in Admin mode
  const handleDeletePhoto = async (id: string) => {
    const updated = photos.filter(p => p.id !== id);
    await triggerUpdateWithFeedback(updated);
  };

  const goPrev = () => {
    if (photos.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  };

  const goNext = () => {
    if (photos.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % photos.length);
  };

  return (
    <section id="actualite" className="relative pt-8 pb-12 sm:pb-16 border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        {/* Section Header: ACTUALITÉ */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>Actualité</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        </div>

        {/* Admin Controls to insert one or multiple photos */}
        {isAdmin && (
          <div className="mb-6 flex flex-col items-center justify-center gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isUploading
                    ? 'Insertion des affiches en cours...'
                    : 'Insérer une ou plusieurs affiches / photos'}
                </span>
              </button>
            </div>

            {githubSyncStatus.state !== 'idle' && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                  githubSyncStatus.state === 'syncing'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : githubSyncStatus.state === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {githubSyncStatus.state === 'syncing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {githubSyncStatus.state === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {githubSyncStatus.state === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                <span>{githubSyncStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {/* UNIFIED POSTER + COUNTDOWN SHOWCASE */}
        {photos.length === 0 ? (
          <div
            onClick={() => isAdmin && fileInputRef.current?.click()}
            className={`w-full h-[260px] sm:h-[380px] rounded-xl border border-dashed border-amber-500/30 bg-zinc-950/60 flex flex-col items-center justify-center text-center p-6 transition-colors ${
              isAdmin ? 'cursor-pointer hover:border-amber-400/60' : ''
            }`}
          >
            <ImageIcon className="w-12 h-12 text-amber-400/60 mb-3" />
            <p className="font-cinzel text-base sm:text-lg text-zinc-200 font-semibold">
              Rubrique Actualité & Prochains Événements
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              {isAdmin
                ? 'Cliquez sur « Insérer une ou plusieurs affiches / photos » pour publier vos événements avec leur compte à rebours dédié.'
                : 'Activez le Mode Administrateur (cadenas en haut à droite) pour insérer vos affiches en carrousel automatique (5s).'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Single Cohesive Cinema Showcase Card uniting the Poster and its Countdown */}
            <div
              onMouseEnter={() => isAdmin && setIsAdminInteracting(true)}
              onMouseLeave={() => isAdmin && setIsAdminInteracting(false)}
              className={`relative w-full rounded-2xl overflow-hidden bg-zinc-950 transition-all duration-500 ${
                remaining
                  ? 'border-2 border-amber-400/50 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.18)]'
                  : 'border border-white/15 shadow-2xl shadow-black/80'
              }`}
            >
              {/* TOP PART: Fixed-size Large Poster Viewport (100% visible) */}
              <div className="relative w-full h-[340px] sm:h-[500px] md:h-[600px] overflow-hidden bg-zinc-950 group">
                {photos.map((photo, index) => {
                  const isActive = index === safeIndex;
                  return (
                    <div
                      key={photo.id}
                      className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-700 ease-in-out ${
                        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                      }`}
                    >
                      {/* Subtle blurred ambient background so the frame always looks full while the poster is 100% visible */}
                      <img
                        src={photo.url}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none"
                      />
                      <img
                        src={photo.url}
                        alt={`Affiche événement ${index + 1}`}
                        className="relative z-10 w-full h-full object-contain p-1 sm:p-2"
                      />
                    </div>
                  );
                })}

                {/* Left / Right Carousel Arrows when multiple posters exist */}
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Affiche précédente"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/65 hover:bg-amber-500 text-white hover:text-zinc-950 border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Affiche suivante"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/65 hover:bg-amber-500 text-white hover:text-zinc-950 border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* BOTTOM PART: Integrated Poster Countdown Pedestal (Directly fused to the poster above) */}
              {remaining && activePhoto && (
                <div className="relative overflow-hidden border-t-2 border-amber-400/50 bg-zinc-950">
                  {/* Ambient color reflection from the current poster above so the countdown visually belongs to the poster */}
                  <img
                    src={activePhoto.url}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-125"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/90 to-zinc-950/95" />

                  {/* Luminous golden seam & visual pointer linking the countdown to the poster above */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-b-lg bg-amber-500/20 border-x border-b border-amber-400/40 text-amber-300 text-[10px] sm:text-[11px] font-cinzel font-bold uppercase tracking-[0.2em] shadow-sm">
                      <ChevronUp className="w-3.5 h-3.5 text-amber-400 -mt-0.5 animate-bounce" />
                      <span>Événement à l'affiche</span>
                      {photos.length > 1 && (
                        <span className="text-amber-400/80 ml-1">
                          ({safeIndex + 1}/{photos.length})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Countdown Content Bar (Centered, without redundant date text since it is on the poster) */}
                  <div className="relative z-10 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-center">
                    <div className="flex items-center justify-center">
                      {remaining.isPast ? (
                        <div className="px-5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/50">
                          <span className="font-cinzel text-lg sm:text-2xl font-bold text-amber-300 tracking-wider uppercase drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]">
                            🎬 L'événement a commencé !
                          </span>
                        </div>
                      ) : remaining.mode === 'days' ? (
                        remaining.isToday ? (
                          <div className="px-6 py-3 rounded-xl bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                            <span className="font-cinzel text-xl sm:text-3xl font-extrabold text-amber-200 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                              🎬 C'est aujourd'hui !
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3.5 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-gradient-to-b from-amber-500/25 via-zinc-900/95 to-zinc-950 border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.28)]">
                            <span className="font-cinzel text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-400/90">
                              Dans
                            </span>
                            <span className="font-cinzel text-3xl sm:text-5xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.55)]">
                              {remaining.days}
                            </span>
                            <div className="flex flex-col text-left leading-tight">
                              <span className="font-cinzel text-xs sm:text-sm font-bold uppercase tracking-[0.18em] text-amber-300">
                                {remaining.days > 1 ? 'Jours' : 'Jour'}
                              </span>
                              <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                                {remaining.days > 1 ? 'restants' : 'restant'}
                              </span>
                            </div>
                          </div>
                        )
                      ) : (
                        /* Mode 'days_hours': Jours + Heures */
                        <div className="flex items-center gap-2.5 sm:gap-3.5">
                          {/* Days block */}
                          <div className="min-w-[90px] sm:min-w-[115px] px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-500/25 via-zinc-900/95 to-zinc-950 border-2 border-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center">
                            <span className="font-cinzel text-2xl sm:text-4xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                              {remaining.days}
                            </span>
                            <span className="mt-1 text-[10px] sm:text-[11px] font-cinzel font-bold uppercase tracking-[0.2em] text-amber-400">
                              {remaining.days > 1 ? 'Jours' : 'Jour'}
                            </span>
                          </div>

                          <span className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-400 animate-pulse">
                            :
                          </span>

                          {/* Hours block */}
                          <div className="min-w-[90px] sm:min-w-[115px] px-3.5 sm:px-5 py-2.5 rounded-xl bg-gradient-to-b from-amber-500/25 via-zinc-900/95 to-zinc-950 border-2 border-amber-400/80 shadow-[0_0_22px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center">
                            <span className="font-cinzel text-2xl sm:text-4xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                              {String(remaining.hours).padStart(2, '0')}
                            </span>
                            <span className="mt-1 text-[10px] sm:text-[11px] font-cinzel font-bold uppercase tracking-[0.2em] text-amber-400">
                              {remaining.hours > 1 ? 'Heures' : 'Heure'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Thumbnail Strip to select which poster to configure or delete */}
            {isAdmin && (
              <div
                onMouseEnter={() => setIsAdminInteracting(true)}
                onMouseLeave={() => setIsAdminInteracting(false)}
                className="flex items-center gap-3 overflow-x-auto py-2 px-1"
              >
                {photos.map((photo, idx) => {
                  const photoCd = getCountdownForPhoto(photo, idx);
                  const photoRem = computeRemainingForCountdown(photoCd);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative w-28 h-20 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        idx === safeIndex
                          ? 'border-amber-400 scale-105 shadow-[0_0_15px_rgba(251,191,36,0.35)]'
                          : 'border-white/15 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={`Affiche ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Top-left number badge */}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                        #{idx + 1}
                      </span>
                      {/* Bottom countdown status badge on thumbnail */}
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 flex items-center justify-center">
                        {photoRem ? (
                          <span className="text-[9px] font-semibold text-amber-300 truncate flex items-center gap-1">
                            <Timer className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            {photoRem.isPast
                              ? 'En cours'
                              : photoRem.isToday
                              ? "Aujourd'hui"
                              : `J - ${photoRem.days}`}
                          </span>
                        ) : (
                          <span className="text-[9px] text-zinc-400 truncate">
                            Sans compteur
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                        title="Supprimer cette affiche"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ADMIN CONFIGURATION PANEL FOR THE SELECTED POSTER'S COUNTDOWN */}
        {isAdmin && photos.length > 0 && (
          <div
            onMouseEnter={() => setIsAdminInteracting(true)}
            onMouseLeave={() => setIsAdminInteracting(false)}
            className="w-full mt-4 rounded-xl bg-zinc-900/90 border border-amber-500/40 p-4 sm:p-5 shadow-xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {/* Tiny preview of the currently selected poster */}
                {activePhoto && (
                  <img
                    src={activePhoto.url}
                    alt={`Affiche sélectionnée ${safeIndex + 1}`}
                    className="w-12 h-12 rounded-lg object-cover border border-amber-400/50 shrink-0"
                  />
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <h3 className="font-cinzel text-sm sm:text-base font-bold text-amber-200 uppercase tracking-wider">
                      Compte à rebours — Affiche n°{safeIndex + 1} sur {photos.length}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Chaque affiche peut avoir son propre compte à rebours (en option). Sélectionnez une miniature ci-dessus pour régler une autre affiche.
                  </p>
                </div>
              </div>

              {/* Enable / Disable switch button for THIS specific poster */}
              <button
                type="button"
                onClick={() => {
                  const nextEnabled = !activeCountdown.enabled;
                  applyCountdownChange({ enabled: nextEnabled });
                }}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  activeCountdown.enabled
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-zinc-800 border border-white/15 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeCountdown.enabled ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
                  }`}
                />
                <span>
                  {activeCountdown.enabled
                    ? `Actif sur l'affiche n°${safeIndex + 1} (cliquer pour retirer)`
                    : `Activer un compte à rebours sur l'affiche n°${safeIndex + 1}`}
                </span>
              </button>
            </div>

            {/* Quick poster switcher pills if multiple posters exist */}
            {photos.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap pt-3 pb-1">
                <span className="text-[11px] text-zinc-400 font-medium mr-1">
                  Choisir l'affiche à régler :
                </span>
                {photos.map((p, idx) => {
                  const hasCd = getCountdownForPhoto(p, idx).enabled && Boolean(getCountdownForPhoto(p, idx).targetDate);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        idx === safeIndex
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow'
                          : 'bg-zinc-950 text-zinc-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      <span>Affiche n°{idx + 1}</span>
                      {hasCd && <Timer className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 items-end">
              {/* 1. Date de l'événement (Jour / Mois / Année) */}
              <div className="md:col-span-6 space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                  Date de l'événement de l'affiche n°{safeIndex + 1} (calcul automatique)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Jour */}
                  <select
                    aria-label="Jour de l'événement"
                    value={parsedDateParts.day}
                    onChange={e => handleDatePartChange('day', Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    {Array.from(
                      { length: new Date(parsedDateParts.year, parsedDateParts.month, 0).getDate() },
                      (_, i) => i + 1
                    ).map(dayNum => (
                      <option key={dayNum} value={dayNum} className="bg-zinc-900 text-zinc-100">
                        {String(dayNum).padStart(2, '0')}
                      </option>
                    ))}
                  </select>

                  {/* Mois */}
                  <select
                    aria-label="Mois de l'événement"
                    value={parsedDateParts.month}
                    onChange={e => handleDatePartChange('month', Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    {FRENCH_MONTH_NAMES.map((mName, idx) => (
                      <option key={mName} value={idx + 1} className="bg-zinc-900 text-zinc-100">
                        {mName}
                      </option>
                    ))}
                  </select>

                  {/* Année */}
                  <select
                    aria-label="Année de l'événement"
                    value={parsedDateParts.year}
                    onChange={e => handleDatePartChange('year', Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i).map(yr => (
                      <option key={yr} value={yr} className="bg-zinc-900 text-zinc-100">
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Mode d'affichage : En jours uniquement vs En jours et heures */}
              <div className="md:col-span-3 space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Affichage du compteur
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyCountdownChange({ enabled: true, displayMode: 'days' })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      (activeCountdown.displayMode || 'days') === 'days'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold shadow'
                        : 'bg-zinc-950 text-zinc-300 border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    En jours
                  </button>
                  <button
                    type="button"
                    onClick={() => applyCountdownChange({ enabled: true, displayMode: 'days_hours' })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      activeCountdown.displayMode === 'days_hours'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold shadow'
                        : 'bg-zinc-950 text-zinc-300 border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    Jours & Heures
                  </button>
                </div>
              </div>

              {/* 3. Heure de l'événement (uniquement si "Jours & Heures" est choisi) */}
              {activeCountdown.displayMode === 'days_hours' && (
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                    Heure de l'événement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      aria-label="Heure de l'événement"
                      value={parsedTimeParts.hour}
                      onChange={e => handleTimePartChange('hour', Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h} className="bg-zinc-900 text-zinc-100">
                          {String(h).padStart(2, '0')} h
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Minutes de l'événement"
                      value={parsedTimeParts.minute}
                      onChange={e => handleTimePartChange('minute', Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-amber-500/40 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-xs sm:text-sm font-semibold text-zinc-100 focus:outline-none cursor-pointer"
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m} className="bg-zinc-900 text-zinc-100">
                          {String(m).padStart(2, '0')} min
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Countdown Synchronization Status Bar & Button */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {githubSyncStatus.state === 'syncing' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-400" />
                    <span>Synchronisation de la date du compteur en cours...</span>
                  </div>
                ) : githubSyncStatus.state === 'success' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>
                      {githubSyncStatus.message || 'Date du compteur synchronisée (visible sur tous les appareils)'}
                    </span>
                  </div>
                ) : githubSyncStatus.state === 'error' ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-400/40 text-red-300 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span>{githubSyncStatus.message}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-white/10 text-zinc-300 text-xs">
                    <Cloud className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>
                      {activeCountdown.updatedAt
                        ? `Compteur enregistré le ${new Date(activeCountdown.updatedAt).toLocaleDateString('fr-FR')} à ${new Date(activeCountdown.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                        : 'La date se synchronise automatiquement dès que vous la modifiez'}
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={githubSyncStatus.state === 'syncing'}
                onClick={() => applyCountdownChange({})}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${githubSyncStatus.state === 'syncing' ? 'animate-spin' : ''}`}
                />
                <span>Synchroniser le compteur</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};
