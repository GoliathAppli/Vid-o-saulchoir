/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { VideoItem } from '../types/cinema';
import { X, ExternalLink, Share2, EyeOff, Film, Clock, Check, Calendar } from 'lucide-react';

interface VideoModalProps {
  video: VideoItem | null;
  onClose: () => void;
  isAdmin: boolean;
  onEdit?: (video: VideoItem) => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  video,
  onClose,
  isAdmin,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!video) return null;

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header bar */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs uppercase tracking-wider text-amber-400/90 font-medium">
              Projection · Atelier Cinéma du Saulchoir
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(video);
                }}
                className="px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded bg-amber-500/10 cursor-pointer mr-2"
              >
                Modifier
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Fermer la fenêtre (Échap)"
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          
          {/* Cinema Player (16:9) */}
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-white/10 shadow-lg">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Film Details */}
          <div className="space-y-4">
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                  <span>{video.director || 'Atelier Cinéma du Saulchoir'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    {formattedDate}
                  </span>
                  {video.duration && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        {video.duration}
                      </span>
                    </>
                  )}
                </div>

                <h2 className="font-serif-cinema text-2xl sm:text-3xl text-zinc-100 font-bold tracking-tight">
                  {video.title}
                </h2>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2.5">
                {video.isUnlisted && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-600/30 px-2.5 py-1 rounded">
                    <EyeOff className="w-3.5 h-3.5" />
                    Non répertoriée
                  </span>
                )}

                <button
                  onClick={handleShare}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Lien copié' : 'Partager'}</span>
                </button>

                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 rounded text-xs transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </a>
              </div>
            </div>

            {/* Synopsis */}
            <div className="bg-zinc-900/40 p-4 rounded-lg border border-white/5 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Synopsis & Notes de Réalisation
              </h4>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {video.synopsis || video.description || 'Aucun texte descriptif renseigné.'}
              </p>
            </div>

            {/* Technical specs & tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {video.technicalNotes && (
                <div className="bg-zinc-900/30 p-3.5 rounded border border-white/5 space-y-1">
                  <div className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spécifications de projection</span>
                  </div>
                  <p className="text-xs text-zinc-300 font-mono">
                    {video.technicalNotes}
                  </p>
                </div>
              )}

              {video.tags && video.tags.length > 0 && (
                <div className="bg-zinc-900/30 p-3.5 rounded border border-white/5 space-y-1">
                  <div className="text-xs text-zinc-400 font-medium">
                    Mots-clés & Thématiques
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 pt-1">
                    {video.tags.map((tag, idx) => (
                      <span key={idx}>
                        {tag}{idx < video.tags!.length - 1 ? ' ·' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
