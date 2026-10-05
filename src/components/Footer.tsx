/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FooterProps {
  onOpenAdmin?: () => void;
  onOpenAbout?: () => void;
  isAdmin?: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="w-full bg-[#08090c] border-t border-white/5 py-8 text-zinc-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center text-center">
        <div>
          © {new Date().getFullYear()} Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

