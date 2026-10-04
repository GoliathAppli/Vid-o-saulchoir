/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { X, Film, Camera, Clapperboard, Sparkles } from 'lucide-react';
import heroImg from '../assets/images/atelier_cinema_hero_1790262016828.jpg';
import clapperImg from '../assets/images/cinema_clapperboard_art_1790262029883.jpg';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-3xl bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </span>
            <span className="font-serif-cinema text-lg text-zinc-100 font-semibold tracking-wide">
              L'Atelier Cinéma du Saulchoir
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-white/10">
            <img
              src={heroImg}
              alt="Atelier Cinéma du Saulchoir"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-1">
                Lieu de Création & Transmission
              </div>
              <h3 className="font-serif-cinema text-2xl text-white font-bold">
                Le regard, l'écoute, le montage
              </h3>
            </div>
          </div>

          <div className="prose prose-invert prose-sm text-zinc-300 space-y-4 leading-relaxed">
            <p>
              Fondé comme un espace de recherche cinématographique, d'apprentissage pratique et de création libre, l'<strong>Atelier Cinéma du Saulchoir</strong> réunit étudiants, cinéastes invités et passionnés d'arts visuels autour d'une même exigence : interroger le réel par l'image et le son.
            </p>
            <p>
              Du travail de la lumière naturelle aux dispositifs sonores immersifs, chaque session explore la porosité entre documentaire d'observation, fiction intimiste et cinéma expérimental.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Camera className="w-4 h-4" />
                <span>Pellicule & Numérique</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pratique conjointe du 35mm / 16mm argentique et des capteurs de cinéma numérique grand format pour développer une sensibilité tactile à la matière filmique.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Clapperboard className="w-4 h-4" />
                <span>Diffusion & Archives</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Chaque œuvre bénéficie d'une diffusion dédiée, avec mise en ligne prioritaire et archivage chronologique permanent synchronisé en continu.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">À propos des vidéos non répertoriées : </span>
              Les travaux d'ateliers et montages préliminaires partagés en mode non répertorié sur YouTube restent accessibles aux membres via cette plateforme dédiée sans être exposés aux moteurs publics généraux de YouTube.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
