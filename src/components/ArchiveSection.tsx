/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VideoItem, VideoCategory, VIDEO_CATEGORIES, normalizeVideoCategory } from '../types/cinema';
import { storageService } from '../services/storageService';
import {
  Search, Play, EyeOff, Film, ChevronDown, ChevronRight,
  X, Plus, Check, ArrowRight, Sparkles
} from 'lucide-react';

interface ArchiveSectionProps {
  allVideos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  isAdmin: boolean;
  onEditVideo?: (video: VideoItem) => void;
  onMoveVideosToCategory?: (videoIds: string[], targetCategory: VideoCategory) => void;
}

/**
 * Custom Golden Apple SVG Drawing ("Pom's D'or")
 */
export const GoldenAppleDrawing: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Pomme d'Or"
  >
    <defs>
      <radialGradient id="goldAppleBody" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFF3B0" />
        <stop offset="35%" stopColor="#F5C542" />
        <stop offset="75%" stopColor="#D49B16" />
        <stop offset="100%" stopColor="#8A5A00" />
      </radialGradient>
      <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFE885" />
        <stop offset="50%" stopColor="#E5A91A" />
        <stop offset="100%" stopColor="#9E6B00" />
      </linearGradient>
    </defs>
    {/* Stem */}
    <path
      d="M32 16C32 11 35 6 39 5"
      stroke="#D4AF37"
      strokeWidth="3"
      strokeLinecap="round"
    />
    {/* Golden Leaf */}
    <path
      d="M33 13C38 7 48 7 50 13C46 17 38 17 33 13Z"
      fill="url(#goldLeaf)"
      stroke="#FFF0A8"
      strokeWidth="1"
    />
    {/* Apple Body */}
    <path
      d="M32 18C25 14 12 16 10 29C8 42 18 57 27 57C30 57 31 55 32 55C33 55 34 57 37 57C46 57 56 42 54 29C52 16 39 14 32 18Z"
      fill="url(#goldAppleBody)"
      stroke="#FDE08D"
      strokeWidth="1.5"
    />
    {/* Specular Shine */}
    <path
      d="M17 26C15 32 17 40 21 45"
      stroke="#FFF9D6"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.75"
    />
  </svg>
);

export const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  allVideos,
  onSelectVideo,
  isAdmin,
  onEditVideo,
  onMoveVideosToCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>("Vidéos d'atelier");
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  // State for the Admin "Ajouter / Déplacer depuis Vidéos d'atelier" modal
  const [pickerTargetCategory, setPickerTargetCategory] = useState<VideoCategory | null>(null);
  const [selectedVideoIdsToMove, setSelectedVideoIdsToMove] = useState<string[]>([]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: prev[year] === false ? true : false,
    }));
  };

  // Count videos per category
  const categoryCounts = useMemo(() => {
    const counts: Record<VideoCategory, number> = {
      "Vidéos d'atelier": 0,
      "Vidéos avec Vaulx": 0,
      "Pom's D'or": 0,
    };
    for (const vid of allVideos) {
      const cat = normalizeVideoCategory(vid.genre);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allVideos]);

  // Videos in "Vidéos d'atelier" (source pool when moving to "Pom's D'or" or "Vidéos avec Vaulx")
  const workshopVideos = useMemo(() => {
    return allVideos
      .filter(v => normalizeVideoCategory(v.genre) === "Vidéos d'atelier")
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [allVideos]);

  // Videos available to pick in the modal
  const sourceVideosForPicker = useMemo(() => {
    if (!pickerTargetCategory) return [];
    if (pickerTargetCategory === "Vidéos d'atelier") {
      // If admin clicked "+ Ajouter" on "Vidéos d'atelier", let them bring back videos from other categories
      return allVideos
        .filter(v => normalizeVideoCategory(v.genre) !== "Vidéos d'atelier")
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
    // Standard flow requested: select among all videos in "Vidéos d'atelier"
    return workshopVideos;
  }, [pickerTargetCategory, workshopVideos, allVideos]);

  // Filter videos for the active category and search query, then group by Year (Année) and Month (Mois)
  const filteredArchives = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const matchingVideos = allVideos.filter(vid => {
      const vidCategory = normalizeVideoCategory(vid.genre);
      if (vidCategory !== selectedCategory) return false;

      if (!q) return true;
      return (
        vid.title.toLowerCase().includes(q) ||
        (vid.director && vid.director.toLowerCase().includes(q)) ||
        (vid.synopsis && vid.synopsis.toLowerCase().includes(q)) ||
        (vid.tags && vid.tags.some(t => t.toLowerCase().includes(q)))
      );
    });

    return storageService.groupVideosByDate(matchingVideos);
  }, [allVideos, selectedCategory, searchQuery]);

  // Open the Admin picker modal for a chosen target category
  const handleOpenCategoryPicker = (category: VideoCategory, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCategory(category);
    setPickerTargetCategory(category);
    setSelectedVideoIdsToMove([]);
  };

  const toggleSelectVideoToMove = (id: string) => {
    setSelectedVideoIdsToMove(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConfirmMoveVideos = () => {
    if (!pickerTargetCategory || selectedVideoIdsToMove.length === 0) return;
    if (onMoveVideosToCategory) {
      onMoveVideosToCategory(selectedVideoIdsToMove, pickerTargetCategory);
    }
    setSelectedCategory(pickerTargetCategory);
    setPickerTargetCategory(null);
    setSelectedVideoIdsToMove([]);
  };

  return (
    <section id="archives" className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 3 MAIN CATEGORIES ("Vidéos d'atelier", "Vidéos avec Vaulx", "Pom's D'or") */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {VIDEO_CATEGORIES.map(category => {
            const isSelected = selectedCategory === category;
            const isPomsDor = category === "Pom's D'or";
            const isAtelier = category === "Vidéos d'atelier";
            const count = categoryCounts[category] || 0;

            return (
              <div
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`group relative rounded-2xl p-6 border-2 transition-all duration-300 cursor-pointer flex flex-col items-center justify-between text-center gap-3.5 ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/30 via-amber-950/40 to-zinc-950 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35)] -translate-y-1 scale-[1.02]'
                    : 'bg-gradient-to-b from-zinc-900/90 to-zinc-950 hover:from-zinc-800/90 hover:to-zinc-900 border-amber-500/30 hover:border-amber-400/70 shadow-xl shadow-black/60 hover:-translate-y-1'
                }`}
              >
                {/* Top luminous indicator bar */}
                <span
                  className={`w-16 h-1 rounded-full transition-all duration-300 ${
                    isSelected
                      ? 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)] w-24'
                      : 'bg-amber-500/30 group-hover:bg-amber-400/60'
                  }`}
                />

                <div className="flex flex-col items-center gap-2.5">
                  <div className="flex items-center justify-center gap-3">
                    {isPomsDor ? (
                      <GoldenAppleDrawing className="w-9 h-9 drop-shadow-[0_0_10px_rgba(245,197,66,0.65)]" />
                    ) : isAtelier ? (
                      <span className="text-2xl sm:text-3xl leading-none drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" role="img" aria-label="Clap de cinéma">
                        🎬
                      </span>
                    ) : (
                      <span className="text-2xl sm:text-3xl leading-none drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" role="img" aria-label="Caméra">
                        🎥
                      </span>
                    )}
                    <h2
                      className={`font-cinzel text-lg sm:text-xl font-bold tracking-wider uppercase transition-colors ${
                        isSelected
                          ? 'text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                          : 'text-zinc-100 group-hover:text-amber-200'
                      }`}
                    >
                      {category}
                    </h2>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 border-amber-300 shadow-sm'
                        : 'bg-zinc-900/90 text-amber-300/90 border-amber-500/25 group-hover:border-amber-400/50'
                    }`}
                  >
                    {count} {count > 1 ? 'vidéos classées' : 'vidéo classée'}
                  </span>
                </div>

                {/* Admin-only "+ Ajouter" button directly on the category */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenCategoryPicker(category, e)}
                    className="mt-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Ajouter</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Search Bar + Active Category Header */}
        <div className="bg-zinc-950/70 border border-white/5 rounded-lg p-4 mb-12 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={`Rechercher dans ${selectedCategory}...`}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded pl-10 pr-9 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => handleOpenCategoryPicker(selectedCategory)}
              className="w-full sm:w-auto px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {selectedCategory === "Vidéos d'atelier"
                  ? "Rapatrier des vidéos vers « Vidéos d'atelier »"
                  : `Ajouter des vidéos d'atelier dans « ${selectedCategory} »`}
              </span>
            </button>
          )}
        </div>

        {/* Selected Category Title Banner */}
        <div className="flex flex-col items-center justify-center text-center mb-12">
          <div className="flex items-center justify-center gap-3">
            {selectedCategory === "Pom's D'or" ? (
              <GoldenAppleDrawing className="w-9 h-9" />
            ) : selectedCategory === "Vidéos d'atelier" ? (
              <span className="text-2xl sm:text-3xl leading-none" role="img" aria-label="Clap de cinéma">
                🎬
              </span>
            ) : (
              <span className="text-2xl sm:text-3xl leading-none" role="img" aria-label="Caméra">
                🎥
              </span>
            )}
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold text-amber-300 tracking-widest uppercase">
              {selectedCategory}
            </h2>
          </div>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mt-3" />
        </div>

        {/* Chronological Archives Display (By Year / Month) for Selected Category */}
        {filteredArchives.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 space-y-4">
            {selectedCategory === "Pom's D'or" ? (
              <div className="flex justify-center">
                <GoldenAppleDrawing className="w-12 h-12 opacity-80" />
              </div>
            ) : (
              <Film className="w-10 h-10 mx-auto text-zinc-600" />
            )}
            <div>
              <p className="font-cinzel text-lg text-zinc-300">
                Aucune vidéo dans « {selectedCategory} » pour le moment.
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {selectedCategory === "Vidéos d'atelier"
                  ? "Toute nouvelle vidéo synchronisée depuis YouTube s'ajoutera automatiquement ici, classée par Année et par Mois."
                  : isAdmin
                  ? `Cliquez sur le bouton « + Ajouter » pour sélectionner des vidéos de la catégorie « Vidéos d'atelier » et les déplacer ici.`
                  : "Les vidéos de cette catégorie apparaîtront ici classées par Année et par Mois."}
              </p>
            </div>

            {isAdmin && selectedCategory !== "Vidéos d'atelier" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenCategoryPicker(selectedCategory)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter des vidéos depuis « Vidéos d'atelier »</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-16">
            {filteredArchives.map(yearGroup => {
              const isExpanded = expandedYears[yearGroup.year] !== false;

              return (
                <div key={yearGroup.year} className="relative">
                  
                  {/* MAIN SECTION: ANNÉE (Year) - Centered */}
                  <div
                    onClick={() => toggleYear(yearGroup.year)}
                    className="relative flex flex-col items-center justify-center py-4 border-b-2 border-amber-500/40 cursor-pointer group select-none mb-8 text-center"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <button className="text-amber-400 group-hover:text-amber-300 transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </button>
                      <h3 className="font-cinzel text-2xl sm:text-3xl font-bold text-zinc-100 tracking-wider uppercase">
                        Année {yearGroup.year}
                      </h3>
                    </div>

                    <span className="mt-1.5 sm:mt-0 sm:absolute sm:right-0 text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-white/5">
                      {yearGroup.totalVideos} {yearGroup.totalVideos > 1 ? 'œuvres' : 'œuvre'}
                    </span>
                  </div>

                  {/* Months inside Year */}
                  {isExpanded && (
                    <div className="space-y-12">
                      {yearGroup.months.map(monthGroup => (
                        <div key={monthGroup.monthIndex} className="relative">
                          
                          {/* SUB-SECTION: MOIS (Month) - Centered */}
                          <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/25" />
                            <div className="flex items-center gap-2.5 px-3">
                              <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                              <h4 className="font-cinzel text-lg sm:text-xl text-amber-100/90 font-semibold tracking-wider uppercase text-center">
                                {monthGroup.monthName} {yearGroup.year}
                              </h4>
                              <span className="text-xs text-zinc-500 font-mono">
                                ({monthGroup.videos.length})
                              </span>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/25" />
                          </div>

                          {/* Grid of video cards for this month */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {monthGroup.videos.map(video => (
                              <article
                                key={video.id}
                                onClick={() => onSelectVideo(video)}
                                className="group bg-zinc-950/60 hover:bg-zinc-900/60 border border-white/5 hover:border-amber-500/30 rounded-lg overflow-hidden transition-all duration-300 flex flex-col cursor-pointer shadow-lg hover:shadow-black/50 text-center"
                              >
                                {/* 16:9 Thumbnail container */}
                                <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                                  <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-90 group-hover:brightness-100"
                                  />

                                  {/* Vignette Scrim */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

                                  {/* Play icon overlay on hover */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-12 h-12 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform pl-0.5">
                                      <Play className="w-5 h-5 fill-current" />
                                    </div>
                                  </div>
                                </div>

                                {/* Card content: Only Title */}
                                <div className="p-4 flex items-center justify-center">
                                  <h5 className="font-cinzel text-base sm:text-lg font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors">
                                    {video.title}
                                  </h5>
                                </div>
                              </article>
                            ))}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ADMIN MODAL: Select videos from "Vidéos d'atelier" to move into the target category */}
      {isAdmin && pickerTargetCategory && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setPickerTargetCategory(null)}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-3xl bg-zinc-950 border border-amber-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pickerTargetCategory === "Pom's D'or" ? (
                  <GoldenAppleDrawing className="w-7 h-7" />
                ) : (
                  <Sparkles className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h3 className="font-cinzel text-lg text-zinc-100 font-bold uppercase tracking-wide">
                    Ajouter dans « {pickerTargetCategory} »
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {pickerTargetCategory === "Vidéos d'atelier"
                      ? "Sélectionnez les vidéos à remettre dans « Vidéos d'atelier »."
                      : "Sélectionnez parmi les vidéos de « Vidéos d'atelier » celles à déplacer automatiquement ici."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPickerTargetCategory(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Video Selection List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {sourceVideosForPicker.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs space-y-2">
                  <Film className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-300 font-medium">
                    Aucune vidéo disponible dans « Vidéos d'atelier » à déplacer.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Synchronisez d'abord vos vidéos YouTube pour qu'elles apparaissent dans « Vidéos d'atelier ».
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sourceVideosForPicker.map(vid => {
                    const isChecked = selectedVideoIdsToMove.includes(vid.id);
                    const dateStr = new Date(vid.publishedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={vid.id}
                        onClick={() => toggleSelectVideoToMove(vid.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center gap-3.5 text-left ${
                          isChecked
                            ? 'bg-amber-500/15 border-amber-400 shadow-md'
                            : 'bg-zinc-900/60 hover:bg-zinc-900 border-white/10'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'border-zinc-600 bg-zinc-950'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <img
                          src={vid.thumbnailUrl}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          className="w-20 aspect-video object-cover rounded bg-zinc-800 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-zinc-100 truncate">
                            {vid.title}
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-0.5">
                            {dateStr}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-zinc-900/90 border-t border-white/10 flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-400">
                {selectedVideoIdsToMove.length} vidéo(s) sélectionnée(s)
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPickerTargetCategory(null)}
                  className="px-4 py-2 rounded text-xs text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={selectedVideoIdsToMove.length === 0}
                  onClick={handleConfirmMoveVideos}
                  className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg disabled:opacity-40"
                >
                  <span>Déplacer vers « {pickerTargetCategory} »</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
