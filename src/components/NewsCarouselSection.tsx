/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { NewsPhoto } from '../types/cinema';
import {
  Sparkles, Plus, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon, CheckCircle2, Loader2, AlertCircle
} from 'lucide-react';

interface NewsCarouselSectionProps {
  photos: NewsPhoto[];
  isAdmin: boolean;
  onUpdatePhotos: (updatedPhotos: NewsPhoto[]) => Promise<{ syncedToGitHub: boolean; error?: string }> | void;
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
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [githubSyncStatus, setGithubSyncStatus] = useState<
    { state: 'idle' | 'syncing' | 'success' | 'error'; message?: string }
  >({ state: 'idle' });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

      </div>
    </section>
  );
};
