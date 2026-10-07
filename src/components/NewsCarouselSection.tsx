/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { NewsPhoto, NewsCountdown, CountdownDisplayMode } from '../types/cinema';
import {
  Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon,
  CheckCircle2, Loader2, AlertCircle, Clock, Calendar, Timer, Check
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

export const NewsCarouselSection: React.FC<NewsCarouselSectionProps> = ({
  photos,
  isAdmin,
  onUpdatePhotos,
  countdown,
  onUpdateCountdown,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState<
    { state: 'idle' | 'syncing' | 'success' | 'error'; message?: string }
  >({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local draft state for Admin countdown settings
  const [draftEnabled, setDraftEnabled] = useState<boolean>(countdown.enabled);
  const [draftDate, setDraftDate] = useState<string>(countdown.targetDate || '');
  const [draftTime, setDraftTime] = useState<string>(countdown.targetTime || '20:00');
  const [draftMode, setDraftMode] = useState<CountdownDisplayMode>(countdown.displayMode || 'days');
  const [draftLabel, setDraftLabel] = useState<string>(countdown.label ?? "Avant l'événement");
  const [nowTick, setNowTick] = useState<Date>(() => new Date());

  // Sync draft state when countdown prop updates (e.g. pulled from GitHub)
  useEffect(() => {
    setDraftEnabled(countdown.enabled);
    setDraftDate(countdown.targetDate || '');
    setDraftTime(countdown.targetTime || '20:00');
    setDraftMode(countdown.displayMode || 'days');
    setDraftLabel(countdown.label ?? "Avant l'événement");
  }, [countdown]);

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
  useEffect(() => {
    if (photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [photos.length]);

  const triggerUpdateWithFeedback = async (updated: NewsPhoto[]) => {
    setGithubSyncStatus({ state: 'syncing', message: 'Synchronisation GitHub en cours...' });
    const res = await onUpdatePhotos(updated);
    if (res && res.syncedToGitHub) {
      setGithubSyncStatus({
        state: 'success',
        message: 'Synchronisé sur GitHub (visible sur tous les ordinateurs)',
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

  const handleSaveCountdown = async (override?: Partial<NewsCountdown>) => {
    const nextCountdown: NewsCountdown = {
      enabled: override?.enabled !== undefined ? override.enabled : draftEnabled,
      targetDate: override?.targetDate !== undefined ? override.targetDate : draftDate,
      targetTime: override?.targetTime !== undefined ? override.targetTime : draftTime,
      displayMode: override?.displayMode !== undefined ? override.displayMode : draftMode,
      label: override?.label !== undefined ? override.label : draftLabel,
      updatedAt: new Date().toISOString(),
    };

    // If Admin sets a date and clicks Save, automatically enable it unless explicitly disabling
    if (override?.enabled === undefined && nextCountdown.targetDate && !nextCountdown.enabled) {
      nextCountdown.enabled = true;
      setDraftEnabled(true);
    }

    setGithubSyncStatus({ state: 'syncing', message: 'Synchronisation du compte à rebours sur GitHub...' });
    const res = await onUpdateCountdown(nextCountdown);
    if (res && res.syncedToGitHub) {
      setGithubSyncStatus({
        state: 'success',
        message: 'Compte à rebours synchronisé sur GitHub (visible par tous les visiteurs)',
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

  // Compute remaining days and hours from active countdown
  const computeRemaining = () => {
    const activeDate = countdown.targetDate;
    if (!activeDate) return null;

    const [y, m, d] = activeDate.split('-').map(Number);
    if (!y || !m || !d) return null;

    const mode = countdown.displayMode || 'days';

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
      const timeParts = (countdown.targetTime || '20:00').split(':').map(Number);
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

  const remaining = countdown.enabled && countdown.targetDate ? computeRemaining() : null;

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
                    ? 'Insertion des photos en cours...'
                    : 'Insérer une ou plusieurs photos'}
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

        {/* Large Uniform Photo Carousel Frame */}
        {photos.length === 0 ? (
          <div
            onClick={() => isAdmin && fileInputRef.current?.click()}
            className={`w-full h-[260px] sm:h-[380px] rounded-xl border border-dashed border-amber-500/30 bg-zinc-950/60 flex flex-col items-center justify-center text-center p-6 transition-colors ${
              isAdmin ? 'cursor-pointer hover:border-amber-400/60' : ''
            }`}
          >
            <ImageIcon className="w-12 h-12 text-amber-400/60 mb-3" />
            <p className="font-cinzel text-base sm:text-lg text-zinc-200 font-semibold">
              Rubrique Actualité
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-md">
              {isAdmin
                ? 'Cliquez sur « Insérer une ou plusieurs photos » pour afficher vos photos en grand format avec défilement automatique toutes les 5 secondes.'
                : 'Activez le Mode Administrateur (cadenas en haut à droite) pour insérer une ou plusieurs grandes photos en carrousel automatique (5s).'}
            </p>
          </div>
        ) : (
          <div className="w-full space-y-4">
            {/* Fixed-size Large Container so every photo has the exact same large dimensions and is 100% visible */}
            <div className="relative w-full h-[340px] sm:h-[500px] md:h-[600px] rounded-xl overflow-hidden bg-zinc-950 border border-white/10 shadow-2xl shadow-black/80 group">
              {photos.map((photo, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={photo.id}
                    className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-700 ease-in-out ${
                      isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                    }`}
                  >
                    {/* Subtle blurred ambient background so the frame always looks full while the photo is 100% visible */}
                    <img
                      src={photo.url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-30 scale-110 pointer-events-none"
                    />
                    <img
                      src={photo.url}
                      alt={`Actualité ${index + 1}`}
                      className="relative z-10 w-full h-full object-contain p-1 sm:p-2"
                    />
                  </div>
                );
              })}

              {/* Left / Right Carousel Arrows when multiple photos exist */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    aria-label="Photo précédente"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-amber-500 text-white hover:text-zinc-950 border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    aria-label="Photo suivante"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-amber-500 text-white hover:text-zinc-950 border border-white/15 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Carousel Dots Indicator */}
              {photos.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                  {photos.map((photo, idx) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Aller à la photo ${idx + 1}`}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex
                          ? 'w-6 bg-amber-400'
                          : 'w-2 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Admin Thumbnail Strip to easily remove individual photos */}
            {isAdmin && (
              <div className="flex items-center gap-3 overflow-x-auto py-2 px-1">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                      idx === currentIndex ? 'border-amber-400 scale-105' : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={`Miniature ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      title="Supprimer cette photo"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-500 text-white flex items-center justify-center shadow cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISUAL EVENT COUNTDOWN UNDER THE PHOTO (Visible to all visitors when enabled) */}
        {remaining && (
          <div className="w-full mt-6 relative">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-zinc-950 border-2 border-amber-400/50 shadow-[0_0_40px_rgba(245,158,11,0.2)] p-5 sm:p-7 flex flex-col items-center text-center gap-4">
              {/* Subtle ambient gold glow */}
              <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-72 h-28 bg-amber-500/20 blur-3xl rounded-full" />

              {/* Header label */}
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs sm:text-sm font-cinzel font-bold tracking-[0.2em] uppercase">
                <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{countdown.label?.trim() || "Compte à rebours de l'événement"}</span>
              </div>

              {/* Countdown Counter Blocks */}
              {remaining.isPast ? (
                <div className="py-2 flex flex-col items-center gap-1">
                  <span className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-300 tracking-wider uppercase drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]">
                    🎬 L'événement a commencé !
                  </span>
                </div>
              ) : remaining.mode === 'days' ? (
                remaining.isToday ? (
                  <div className="py-2 flex flex-col items-center gap-1">
                    <span className="font-cinzel text-2xl sm:text-4xl font-bold text-amber-300 tracking-wider uppercase drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                      🎬 C'est aujourd'hui !
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-4 sm:gap-6 my-1">
                    <div className="min-w-[130px] sm:min-w-[165px] px-6 py-4 rounded-xl bg-gradient-to-b from-amber-500/20 via-zinc-900 to-zinc-950 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center">
                      <span className="font-cinzel text-4xl sm:text-6xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                        {remaining.days}
                      </span>
                      <span className="mt-2 text-[11px] sm:text-xs font-cinzel font-bold uppercase tracking-[0.25em] text-amber-400">
                        {remaining.days > 1 ? 'Jours restants' : 'Jour restant'}
                      </span>
                    </div>
                  </div>
                )
              ) : (
                /* Mode 'days_hours': Jours + Heures */
                <div className="flex items-center justify-center gap-3 sm:gap-5 my-1">
                  {/* Days block */}
                  <div className="min-w-[105px] sm:min-w-[140px] px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-gradient-to-b from-amber-500/20 via-zinc-900 to-zinc-950 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center">
                    <span className="font-cinzel text-3xl sm:text-5xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                      {remaining.days}
                    </span>
                    <span className="mt-2 text-[10px] sm:text-xs font-cinzel font-bold uppercase tracking-[0.22em] text-amber-400">
                      {remaining.days > 1 ? 'Jours' : 'Jour'}
                    </span>
                  </div>

                  <span className="font-cinzel text-3xl sm:text-4xl font-bold text-amber-400/80 animate-pulse">
                    :
                  </span>

                  {/* Hours block */}
                  <div className="min-w-[105px] sm:min-w-[140px] px-4 sm:px-6 py-3.5 sm:py-4 rounded-xl bg-gradient-to-b from-amber-500/20 via-zinc-900 to-zinc-950 border-2 border-amber-400/70 shadow-[0_0_25px_rgba(245,158,11,0.25)] flex flex-col items-center justify-center">
                    <span className="font-cinzel text-3xl sm:text-5xl font-extrabold text-amber-200 tracking-tight leading-none drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                      {String(remaining.hours).padStart(2, '0')}
                    </span>
                    <span className="mt-2 text-[10px] sm:text-xs font-cinzel font-bold uppercase tracking-[0.22em] text-amber-400">
                      {remaining.hours > 1 ? 'Heures' : 'Heure'}
                    </span>
                  </div>
                </div>
              )}

              {/* Formatted Target Event Date Badge */}
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-300 bg-zinc-900/90 border border-white/10 px-4 py-1.5 rounded-full">
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="capitalize">{remaining.formattedTarget}</span>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN CONFIGURATION PANEL FOR THE VISUAL COUNTDOWN (Under the photo) */}
        {isAdmin && (
          <div className="w-full mt-6 rounded-xl bg-zinc-900/80 border border-amber-500/35 p-4 sm:p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <h3 className="font-cinzel text-sm sm:text-base font-bold text-amber-200 uppercase tracking-wider">
                    Réglage du compte à rebours (Mode Admin)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Choisissez la date de l'événement affiché dans l'actualité et le format d'affichage pour les visiteurs.
                  </p>
                </div>
              </div>

              {/* Enable / Disable switch button */}
              <button
                type="button"
                onClick={() => {
                  const nextEnabled = !draftEnabled;
                  setDraftEnabled(nextEnabled);
                  handleSaveCountdown({ enabled: nextEnabled });
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                  draftEnabled
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30'
                    : 'bg-zinc-800 border border-white/15 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    draftEnabled ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-zinc-500'
                  }`}
                />
                <span>{draftEnabled ? 'Compte à rebours actif' : 'Compte à rebours masqué'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {/* 1. Display Mode: Jour vs Jour et Heure */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Mode d'affichage
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDraftMode('days')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      draftMode === 'days'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold shadow'
                        : 'bg-zinc-950 text-zinc-300 border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    En jours
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftMode('days_hours')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      draftMode === 'days_hours'
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold shadow'
                        : 'bg-zinc-950 text-zinc-300 border-white/10 hover:border-amber-500/40'
                    }`}
                  >
                    Jours & Heures
                  </button>
                </div>
              </div>

              {/* 2. Target Event Date */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Date de l'événement
                </label>
                <input
                  type="date"
                  value={draftDate}
                  onChange={e => setDraftDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                />
              </div>

              {/* 3. Target Event Time (shown when 'days_hours' is selected) */}
              {draftMode === 'days_hours' ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                    Heure de l'événement
                  </label>
                  <input
                    type="time"
                    value={draftTime}
                    onChange={e => setDraftTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                    Intitulé au-dessus du compteur
                  </label>
                  <input
                    type="text"
                    value={draftLabel}
                    onChange={e => setDraftLabel(e.target.value)}
                    placeholder="Ex: Avant l'événement"
                    className="w-full bg-zinc-950 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                  />
                </div>
              )}

              {/* 4. Save / Apply Button */}
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  disabled={!draftDate}
                  onClick={() => handleSaveCountdown({ enabled: true })}
                  className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Enregistrer & Afficher</span>
                </button>
              </div>
            </div>

            {/* Optional custom label row when in 'days_hours' mode */}
            {draftMode === 'days_hours' && (
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 shrink-0">
                  Intitulé du compte à rebours :
                </label>
                <input
                  type="text"
                  value={draftLabel}
                  onChange={e => setDraftLabel(e.target.value)}
                  placeholder="Ex: Avant l'événement"
                  className="w-full sm:max-w-xs bg-zinc-950 border border-white/15 focus:border-amber-400 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
};
