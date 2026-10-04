/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, Film, Sliders, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenAbout: () => void;
  videoCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onOpenAdmin,
  onOpenAbout,
  videoCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0c10]/95 backdrop-blur-md border-b border-white/5 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Zone 1: Single text element wordmark (Display Font) */}
        <a
          href="#"
          className="font-serif-cinema text-xl sm:text-2xl tracking-wide text-zinc-100 hover:text-amber-300/90 transition-colors flex items-center gap-3 group"
        >
          <span className="w-8 h-8 rounded-sm bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400/50 transition-colors shrink-0">
            <Film className="w-4 h-4" />
          </span>
          <span className="font-semibold text-zinc-100">Atelier Cinéma du Saulchoir</span>
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a
            href="#nouvelle-publication"
            className="hover:text-zinc-100 transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-amber-400 hover:after:w-full after:transition-all"
          >
            Nouvelle publication
          </a>
          <a
            href="#archives"
            className="hover:text-zinc-100 transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-amber-400 hover:after:w-full after:transition-all"
          >
            Archives ({videoCount})
          </a>
          <button
            onClick={onOpenAbout}
            className="hover:text-zinc-100 transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-px after:bg-amber-400 hover:after:w-full after:transition-all cursor-pointer"
          >
            L'Atelier
          </button>
        </nav>

        {/* Zone 3: Primary Action (Admin Access) */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAdmin}
            aria-label="Accéder à l'espace administrateur"
            className={`px-3.5 py-2 text-xs font-medium rounded transition-all flex items-center gap-2 cursor-pointer border ${
              isAdmin
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
          >
            {isAdmin ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span className="whitespace-nowrap">Mode Admin</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="whitespace-nowrap">Espace Administrateur</span>
              </>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
