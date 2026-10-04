/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onOpenAbout: () => void;
  videoCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAdmin,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0c10]/95 backdrop-blur-md border-b border-amber-500/15 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 relative flex items-center justify-center">
        
        {/* Centered Prominent Site Title */}
        <a
          href="#"
          className="text-center group flex flex-col items-center px-8"
        >
          <span className="font-title-cinema text-xl sm:text-3xl md:text-4xl font-bold tracking-wider uppercase bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_2px_14px_rgba(245,158,11,0.35)] leading-snug">
            Atelier Cinéma du Saulchoir
          </span>
          <span className="mt-1.5 w-24 sm:w-36 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent" />
        </a>

        {/* Discreet Admin Access Button in Top-Right Corner */}
        <button
          onClick={onOpenAdmin}
          aria-label="Accéder à l'espace administrateur"
          title={isAdmin ? 'Mode Administrateur actif' : 'Administration'}
          className={`absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all flex items-center justify-center cursor-pointer ${
            isAdmin
              ? 'bg-amber-500/10 text-amber-400/80 border border-amber-500/25 hover:bg-amber-500/20 hover:text-amber-300'
              : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5 opacity-60 hover:opacity-100'
          }`}
        >
          {isAdmin ? (
            <ShieldCheck className="w-4 h-4" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>

      </div>
    </header>
  );
};
