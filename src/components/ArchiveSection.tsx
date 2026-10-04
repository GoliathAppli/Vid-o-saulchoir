/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { VideoItem, YearGroup } from '../types/cinema';
import { Search, Calendar, Play, EyeOff, Film, Clock, ChevronDown, ChevronRight, X } from 'lucide-react';

interface ArchiveSectionProps {
  archives: YearGroup[];
  onSelectVideo: (video: VideoItem) => void;
  isAdmin: boolean;
  onEditVideo?: (video: VideoItem) => void;
  onAddVideoClick?: () => void;
}

export const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  archives,
  onSelectVideo,
  isAdmin,
  onEditVideo,
  onAddVideoClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Tous');
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>(() => {
    // Expand all years by default
    const initial: Record<number, boolean> = {};
    for (const yr of archives) {
      initial[yr.year] = true;
    }
    return initial;
  });

  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  // Collect all available genres dynamically
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const yg of archives) {
      for (const mg of yg.months) {
        for (const vid of mg.videos) {
          if (vid.genre) set.add(vid.genre);
        }
      }
    }
    return ['Tous', ...Array.from(set)];
  }, [archives]);

  // Filter the archives based on search and genre
  const filteredArchives = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return archives
      .map(yearGroup => {
        const filteredMonths = yearGroup.months
          .map(monthGroup => {
            const filteredVideos = monthGroup.videos.filter(vid => {
              const matchesSearch =
                !q ||
                vid.title.toLowerCase().includes(q) ||
                (vid.director && vid.director.toLowerCase().includes(q)) ||
                (vid.synopsis && vid.synopsis.toLowerCase().includes(q)) ||
                (vid.tags && vid.tags.some(t => t.toLowerCase().includes(q)));

              const matchesGenre =
                selectedGenre === 'Tous' || vid.genre === selectedGenre;

              return matchesSearch && matchesGenre;
            });

            return {
              ...monthGroup,
              videos: filteredVideos,
            };
          })
          .filter(monthGroup => monthGroup.videos.length > 0);

        const totalFiltered = filteredMonths.reduce(
          (acc, m) => acc + m.videos.length,
          0
        );

        return {
          ...yearGroup,
          months: filteredMonths,
          totalVideos: totalFiltered,
        };
      })
      .filter(yearGroup => yearGroup.totalVideos > 0);
  }, [archives, searchQuery, selectedGenre]);

  const totalFilteredCount = filteredArchives.reduce(
    (acc, y) => acc + y.totalVideos,
    0
  );

  return (
    <section id="archives" className="py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Filter Bar: Search + Genre pills (Interactive Filter Controls) */}
        <div className="bg-zinc-950/70 border border-white/5 rounded-lg p-4 mb-12 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, réalisateur, mot-clé..."
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

          {/* Genre Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {availableGenres.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-amber-500 text-zinc-950 font-semibold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

        </div>

        {/* Chronological Archives Display */}
        {filteredArchives.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
            <Film className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="font-cinzel text-lg text-zinc-300">Aucun film archivé à afficher.</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery || selectedGenre !== 'Tous'
                ? 'Essayez de modifier vos filtres ou termes de recherche.'
                : 'Les vidéos précédentes apparaîtront ici classées par Année et par Mois.'}
            </p>
            {(searchQuery || selectedGenre !== 'Tous') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('Tous');
                }}
                className="mt-4 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs rounded border border-zinc-700 transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
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
                            {monthGroup.videos.map(video => {
                              const pubDate = new Date(video.publishedAt);
                              const formattedDate = !isNaN(pubDate.getTime())
                                ? pubDate.toLocaleDateString('fr-FR', {
                                    day: 'numeric',
                                    month: 'long',
                                  })
                                : '';

                              return (
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* Play icon overlay on hover */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                      <div className="w-12 h-12 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform pl-0.5">
                                        <Play className="w-5 h-5 fill-current" />
                                      </div>
                                    </div>

                                    {/* Badges on thumbnail */}
                                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-zinc-200">
                                      {video.duration ? (
                                        <span className="font-mono bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10">
                                          {video.duration}
                                        </span>
                                      ) : <span />}

                                      {video.isUnlisted && (
                                        <span className="flex items-center gap-1 bg-amber-950/80 text-amber-300 backdrop-blur-sm px-2 py-0.5 rounded border border-amber-600/30">
                                          <EyeOff className="w-3 h-3" />
                                          Non répertorié
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card content */}
                                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                                    <div>
                                      {/* Clean unboxed metadata with typographic separators */}
                                      <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 mb-2">
                                        <span>{video.genre || 'Cinéma'}</span>
                                        <span aria-hidden="true">·</span>
                                        <span>{formattedDate}</span>
                                      </div>

                                      <h5 className="font-cinzel text-base sm:text-lg font-semibold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                                        {video.title}
                                      </h5>

                                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                                        {video.synopsis || video.description || 'Consulter la fiche du film.'}
                                      </p>
                                    </div>

                                    {/* Card Footer: Director + Admin action */}
                                    <div className="pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-zinc-400">
                                      <span className="truncate max-w-[200px]">
                                        {video.director || 'Atelier du Saulchoir'}
                                      </span>

                                      {isAdmin && onEditVideo && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditVideo(video);
                                          }}
                                          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-2 cursor-pointer"
                                        >
                                          Modifier
                                        </button>
                                      )}
                                    </div>

                                  </div>
                                </article>
                              );
                            })}
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
    </section>
  );
};
