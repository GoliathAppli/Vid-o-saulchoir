/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Film, Shield, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenAbout: () => void;
  isAdmin: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, onOpenAbout, isAdmin }) => {
  return (
    <footer className="w-full bg-[#08090c] border-t border-white/5 py-12 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Film className="w-3.5 h-3.5" />
          </span>
          <span className="font-serif-cinema text-sm text-zinc-300 font-semibold tracking-wide">
            Atelier Cinéma du Saulchoir
          </span>
          <span className="text-zinc-600">·</span>
          <span className="text-zinc-500">Archives & Synchronisation Audiovisuelle</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <button
            onClick={onOpenAbout}
            className="hover:text-zinc-200 transition-colors cursor-pointer"
          >
            L'Atelier
          </button>
          <a
            href="#nouvelle-publication"
            className="hover:text-zinc-200 transition-colors"
          >
            Dernière publication
          </a>
          <a
            href="#archives"
            className="hover:text-zinc-200 transition-colors"
          >
            Archives
          </a>
          <button
            onClick={onOpenAdmin}
            className="hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Lock className="w-3 h-3 text-zinc-500" />}
            <span>{isAdmin ? 'Mode Administrateur' : 'Administration'}</span>
          </button>
        </div>

        {/* Copyright */}
        <div className="text-zinc-500">
          © {new Date().getFullYear()} Atelier Cinéma du Saulchoir. Tous droits réservés.
        </div>

      </div>
    </footer>
  );
};
