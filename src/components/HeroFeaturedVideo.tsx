/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { VideoItem } from '../types/cinema';
import { Play, Share2, ExternalLink, EyeOff, Clock, Film, Check, Sparkles } from 'lucide-react';

interface HeroFeaturedVideoProps {
  video: VideoItem | null;
  onSelectVideo: (video: VideoItem) => void;
  isAdmin: boolean;
  onEditVideo?: (video: VideoItem) => void;
  onOpenAdmin?: () => void;
}

export const HeroFeaturedVideo: React.FC<HeroFeaturedVideoProps> = ({
  video,
  onSelectVideo,
  isAdmin,
  onEditVideo,
  onOpenAdmin,
}) => {
  const [isPlayingInline, setIsPlayingInline] = useState(false);
  const [copied, setCopied] = useState(false);

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
              Aucune vidéo d'exemple n'est affichée. Connectez votre ID Client OAuth 2.0 YouTube dans l'espace administrateur pour synchroniser automatiquement toutes vos vidéos (y compris non répertoriées).
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

  // Format date in French
  const pubDate = new Date(video.publishedAt);
  const formattedDate = !isNaN(pubDate.getTime())
    ? pubDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : video.publishedAt;

  const handleShare = () => {
    navigator.clipboard.writeText(video.youtubeUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="nouvelle-publication" className="relative pt-8 pb-16 sm:pb-24 border-b border-white/5">
      {/* Background ambient cinema glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-96 bg-amber-500/5 blur-[120px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Centered Section Header Indicator */}
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-cinzel font-semibold tracking-[0.25em] uppercase text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nouvelle Publication</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
            <span>{formattedDate}</span>
            {video.isUnlisted && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-zinc-300">
                  <EyeOff className="w-3 h-3 text-amber-400/80" />
                  Non répertoriée
                </span>
              </>
            )}
            {isAdmin && onEditVideo && (
              <button
                onClick={() => onEditVideo(video)}
                className="ml-2 text-amber-400/90 hover:text-amber-300 underline underline-offset-4 cursor-pointer"
              >
                Éditer ce film
              </button>
            )}
          </div>
        </div>

        {/* Cinematic Grid: Video Player + Film Dossier */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main 16:9 Cinema Screen (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/80 group relative">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-amber-500/90 text-zinc-950 flex items-center justify-center shadow-lg shadow-black/60 group-hover:bg-amber-400 group-hover:scale-110 transition-all duration-300 pl-1">
                      <Play className="w-9 h-9 fill-current" />
                    </div>
                  </div>

                  {/* Overlay Badges */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-zinc-200">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono">{video.duration || 'Durée non spécifiée'}</span>
                      {video.genre && (
                        <>
                          <span className="text-zinc-500">·</span>
                          <span>{video.genre}</span>
                        </>
                      )}
                    </div>
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-amber-300">
                      Lancer la lecture
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Film Dossier & Synopsis (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full space-y-6 text-center lg:text-left">
            <div>
              <div className="text-xs font-cinzel uppercase tracking-widest text-amber-400/90 font-semibold mb-2">
                {video.director || 'Atelier Cinéma du Saulchoir'}
              </div>

              <h1 className="font-cinzel text-2xl sm:text-3xl text-zinc-100 font-bold tracking-wide leading-tight mb-4 text-balance">
                {video.title}
              </h1>

              {/* Tags / Metadata inline */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 text-xs text-zinc-400 mb-6">
                <span>{video.genre || 'Cinéma'}</span>
                <span aria-hidden="true">·</span>
                <span>{formattedDate}</span>
                {video.duration && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{video.duration}</span>
                  </>
                )}
              </div>

              {/* Synopsis */}
              <div className="prose prose-invert prose-sm text-zinc-300 leading-relaxed mb-6">
                <p className="line-clamp-6 text-sm text-zinc-300">
                  {video.synopsis || video.description || 'Aucun synopsis disponible.'}
                </p>
              </div>

              {/* Technical notes */}
              {video.technicalNotes && (
                <div className="p-3.5 rounded bg-zinc-900/60 border border-white/5 text-xs text-zinc-400 space-y-1 mb-6">
                  <div className="text-zinc-300 font-medium flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fiche technique</span>
                  </div>
                  <p className="text-zinc-400 font-mono text-[11px] leading-relaxed">
                    {video.technicalNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions: Full Details Modal, Share, External YouTube */}
            <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onSelectVideo(video)}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors text-center cursor-pointer shadow-md shadow-amber-900/20"
              >
                Ouvrir la fiche complète
              </button>

              <button
                onClick={handleShare}
                aria-label="Partager la vidéo"
                className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Copier le lien YouTube"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié !' : 'Partager'}</span>
              </button>

              <a
                href={video.youtubeUrl}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Voir directement sur YouTube"
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded transition-colors"
                title="Ouvrir sur YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
