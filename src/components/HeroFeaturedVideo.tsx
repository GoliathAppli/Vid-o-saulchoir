/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types/cinema';
import { Play, Film, Sparkles } from 'lucide-react';

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
    <section id="nouvelle-publication" className="relative pt-10 pb-16 sm:pb-20 border-b border-amber-500/15">
      {/* Background ambient cinema glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-4/5 max-w-4xl h-96 bg-amber-500/12 blur-[130px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        {/* Highlighted Section Header Badge */}
        <div className="flex flex-col items-center text-center gap-2 mb-7">
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.3)] text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Nouvelle Publication</span>
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
        </div>

        {/* Highlighted Prestige Golden Cinema Frame */}
        <div className="w-full p-2 sm:p-3 rounded-2xl bg-gradient-to-b from-amber-400/35 via-amber-500/15 to-amber-400/35 border-2 border-amber-400/70 shadow-[0_0_55px_rgba(245,158,11,0.28)] relative">
          {/* Decorative Golden Corner Accents */}
          <span className="pointer-events-none absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-amber-300 rounded-tl-lg" />
          <span className="pointer-events-none absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-amber-300 rounded-tr-lg" />
          <span className="pointer-events-none absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-amber-300 rounded-bl-lg" />
          <span className="pointer-events-none absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-amber-300 rounded-br-lg" />

          <div className="w-full bg-zinc-950 rounded-xl overflow-hidden border border-amber-300/30 shadow-2xl shadow-black/90 group relative">
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
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 brightness-[0.88] group-hover:brightness-100"
                  />

                  {/* Gradient Scrim for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/20" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-zinc-950 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.7)] ring-4 ring-amber-300/40 group-hover:scale-110 transition-all duration-300 pl-1">
                      <Play className="w-9 h-9 sm:w-11 sm:h-11 fill-current" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Title Only */}
        <h1 className="font-cinzel text-2xl sm:text-3xl text-amber-100 font-bold tracking-wide leading-tight mt-6 text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
          {video.title}
        </h1>

      </div>
    </section>
  );
};
