/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { VideoItem, SeasonalThemeId } from '../types/cinema';
import { SEASONAL_THEMES } from '../utils/seasonalTheme';
import { PopcornBucketIcon, SeasonalFrameCorners } from './CinemaDecorations';
import { Play, Film } from 'lucide-react';

interface HeroFeaturedVideoProps {
  video: VideoItem | null;
  onSelectVideo: (video: VideoItem) => void;
  isAdmin: boolean;
  onEditVideo?: (video: VideoItem) => void;
  onOpenAdmin?: () => void;
  seasonalTheme?: SeasonalThemeId;
}

export const HeroFeaturedVideo: React.FC<HeroFeaturedVideoProps> = ({
  video,
  onOpenAdmin,
  seasonalTheme = 'default',
}) => {
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const themeInfo = SEASONAL_THEMES[seasonalTheme] || SEASONAL_THEMES.default;

  // Reset inline player if the featured video changes
  useEffect(() => {
    setIsPlayingInline(false);
  }, [video?.id]);

  if (!video) {
    return (
      <section id="nouvelle-publication" className={`py-24 border-b ${themeInfo.sectionBorderClass}`}>
        <div className="max-w-2xl mx-auto px-4 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-amber-400/80">
            <Film className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400/90 font-semibold">
              <PopcornBucketIcon className="w-5 h-5" />
              <span>Nouvelle publication</span>
              <PopcornBucketIcon className="w-5 h-5" />
            </div>
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
    <section
      id="nouvelle-publication"
      className={`relative pt-10 pb-16 sm:pb-20 border-b ${themeInfo.sectionBorderClass}`}
    >
      {/* Background ambient cinema & seasonal glow */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-4/5 max-w-4xl h-96 ${themeInfo.ambientGlowPrimary} blur-[130px] pointer-events-none -z-10 rounded-full`}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        
        {/* Highlighted Section Header Badge with Popcorn Bucket Icons */}
        <div className="flex flex-col items-center text-center gap-2 mb-7">
          <div
            className={`inline-flex items-center gap-3 px-5 py-2 rounded-full bg-gradient-to-r ${themeInfo.badgeGradientClass} border text-xs sm:text-sm font-cinzel font-bold tracking-[0.25em] uppercase ${themeInfo.badgeTextClass}`}
          >
            <PopcornBucketIcon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
            <span>Nouvelle Publication</span>
            <PopcornBucketIcon className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* Highlighted Prestige Cinema Frame with Seasonal Accent & Ornaments */}
        <div
          className={`w-full p-2 sm:p-3 rounded-2xl bg-gradient-to-b ${themeInfo.frameGradientClass} border-2 ${themeInfo.frameBorderClass} relative`}
        >
          {/* Decorative Corner Accents */}
          <span className={`pointer-events-none absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 ${themeInfo.frameCornerClass} rounded-tl-lg`} />
          <span className={`pointer-events-none absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 ${themeInfo.frameCornerClass} rounded-tr-lg`} />
          <span className={`pointer-events-none absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 ${themeInfo.frameCornerClass} rounded-bl-lg`} />
          <span className={`pointer-events-none absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 ${themeInfo.frameCornerClass} rounded-br-lg`} />

          {/* Seasonal Holiday Corner Badges when active */}
          <SeasonalFrameCorners theme={seasonalTheme} />

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
