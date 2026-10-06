/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types/cinema';
import { Play, Film, Sparkles, ArrowLeft } from 'lucide-react';

interface HeroFeaturedVideoProps {
  video: VideoItem | null;
  onSelectVideo: (video: VideoItem) => void;
  isAdmin: boolean;
  onEditVideo?: (video: VideoItem) => void;
  onOpenAdmin?: () => void;
}

export const HeroFeaturedVideo: React.FC<HeroFeaturedVideoProps> = ({
  video,
  onOpenAdmin,
}) => {
  const [isPlayingInline, setIsPlayingInline] = useState(false);

  // Reset inline player if the featured video changes
  useEffect(() => {
    setIsPlayingInline(false);
  }, [video?.id]);

  if (!video) {
    return (
      <section id="nouvelle-publication" className="py-24 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-400/80">
            <Film className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-amber-400/90 font-semibold">
              Nouvelle publication
            </span>
            <h1 className="font-serif-cinema text-3xl text-zinc-100 font-semibold">
              En attente de synchronisation YouTube
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Aucune vidéo d'exemple n'est affichée. Connectez votre ID Client OAuth 2.0 YouTube dans l'espace administrateur pour synchroniser automatiquement toutes vos vidéos.
            </p>
          </div>
          {onOpenAdmin && (
            <div className="pt-2">
              <button
                onClick={onOpenAdmin}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors cursor-pointer shadow-lg shadow-amber-950/30"
              >
                Connecter OAuth 2.0 dans l'Espace Administrateur
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="nouvelle-publication" className="relative pt-8 pb-16 sm:pb-20 border-b border-white/5">
      {/* Background ambient cinema glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-96 bg-amber-500/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        {/* Centered Section Header Indicator */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 text-xs font-cinzel font-semibold tracking-[0.25em] uppercase text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nouvelle Publication</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Main 16:9 Cinema Screen */}
        <div className="w-full bg-zinc-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80 group relative">
          <div className="aspect-video w-full relative bg-zinc-950">
            {isPlayingInline ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <div
                onClick={() => setIsPlayingInline(true)}
                className="w-full h-full relative cursor-pointer group"
              >
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 brightness-[0.85] group-hover:brightness-95"
                />

                {/* Gradient Scrim for contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/20" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-amber-500/90 text-zinc-950 flex items-center justify-center shadow-lg shadow-black/60 group-hover:bg-amber-400 group-hover:scale-110 transition-all duration-300 pl-1">
                    <Play className="w-9 h-9 fill-current" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Title Only */}
        <h1 className="font-cinzel text-2xl sm:text-3xl text-zinc-100 font-bold tracking-wide leading-tight mt-6 text-center">
          {video.title}
        </h1>

        {/* Back button when video is playing inline */}
        {isPlayingInline && (
          <button
            type="button"
            onClick={() => setIsPlayingInline(false)}
            className="mt-5 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs sm:text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la page principale</span>
          </button>
        )}

      </div>
    </section>
  );
};
