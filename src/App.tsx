/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoItem, VideoCategory, NewsPhoto, NewsCountdown, SeasonalThemeId } from './types/cinema';
import { getSeasonalTheme, SEASONAL_THEMES } from './utils/seasonalTheme';
import { storageService } from './services/storageService';
import { syncManager } from './services/syncManager';
import { githubService } from './services/githubService';
import { Header } from './components/Header';
import { NewsCarouselSection } from './components/NewsCarouselSection';
import { HeroFeaturedVideo } from './components/HeroFeaturedVideo';
import { ArchiveSection } from './components/ArchiveSection';
import { VideoModal } from './components/VideoModal';
import { AdminModal } from './components/AdminModal';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';
import { SeasonalPageAtmosphere } from './components/CinemaDecorations';

export default function App() {
  // Video catalog state
  const [videos, setVideos] = useState<VideoItem[]>(() => storageService.getVideos());

  // News ("Actualité") photos & countdown state
  const [newsPhotos, setNewsPhotos] = useState<NewsPhoto[]>(() => storageService.getNewsPhotos());
  const [newsCountdown, setNewsCountdown] = useState<NewsCountdown>(() => storageService.getNewsCountdown());

  // Admin authentication state (checks sessionStorage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => storageService.isAdminAuthenticated());

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [selectedVideoModal, setSelectedVideoModal] = useState<VideoItem | null>(null);
  const [editingVideoTarget, setEditingVideoTarget] = useState<VideoItem | null>(null);

  // Page-wide Seasonal Theme state (automatic by date or selected in Admin)
  const [autoSeasonalTheme, setAutoSeasonalTheme] = useState<SeasonalThemeId>(() =>
    getSeasonalTheme(new Date())
  );
  const [selectedThemeMode, setSelectedThemeMode] = useState<SeasonalThemeId | 'auto'>(() => {
    try {
      const saved = localStorage.getItem('saulchoir_seasonal_theme_mode');
      return (saved as SeasonalThemeId | 'auto') || 'auto';
    } catch {
      return 'auto';
    }
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoSeasonalTheme(getSeasonalTheme(new Date()));
    }, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const activeThemeId: SeasonalThemeId =
    selectedThemeMode !== 'auto' ? selectedThemeMode : autoSeasonalTheme;
  const activeTheme = SEASONAL_THEMES[activeThemeId] || SEASONAL_THEMES.default;

  // Latest video published -> "Nouvelle publication"
  const { latest } = useMemo(() => {
    return storageService.getPartitionedVideos(videos);
  }, [videos]);

  // Handler when catalog is updated (by sync, manual add, edit, or delete)
  const handleCatalogUpdated = useCallback((updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
  }, []);

  // Handler when Admin inserts or deletes Actualité photos
  const handleUpdateNewsPhotos = useCallback(async (updatedPhotos: NewsPhoto[]) => {
    setNewsPhotos(updatedPhotos);
    storageService.saveNewsPhotos(updatedPhotos);

    const cfg = storageService.getConfig();
    if (cfg.githubToken && cfg.githubOwner && cfg.githubRepo) {
      try {
        await githubService.pushNewsPhotos(
          cfg.githubToken,
          cfg.githubOwner,
          cfg.githubRepo,
          cfg.githubBranch || 'main',
          updatedPhotos
        );
        return { syncedToGitHub: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur GitHub';
        console.warn('Sync photos GitHub échoué', e);
        return { syncedToGitHub: false, error: `Échec sync GitHub : ${msg}` };
      }
    }
    return {
      syncedToGitHub: false,
      error: 'Enregistré localement (ajoutez votre jeton GitHub dans Admin pour synchroniser sur tous les ordinateurs)',
    };
  }, []);

  // Handler when Admin updates the Actualité event countdown
  const handleUpdateNewsCountdown = useCallback(async (updatedCountdown: NewsCountdown) => {
    setNewsCountdown(updatedCountdown);
    storageService.saveNewsCountdown(updatedCountdown);

    const cfg = storageService.getConfig();
    if (cfg.githubToken && cfg.githubOwner && cfg.githubRepo) {
      try {
        await githubService.pushNewsCountdown(
          cfg.githubToken,
          cfg.githubOwner,
          cfg.githubRepo,
          cfg.githubBranch || 'main',
          updatedCountdown
        );
        return { syncedToGitHub: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur GitHub';
        console.warn('Sync compte à rebours GitHub échoué', e);
        return { syncedToGitHub: false, error: `Échec sync GitHub : ${msg}` };
      }
    }
    return {
      syncedToGitHub: false,
      error: 'Enregistré localement (ajoutez votre jeton GitHub dans Admin pour synchroniser sur tous les ordinateurs)',
    };
  }, []);

  // Handler to move selected videos from "Vidéos d'atelier" into "Pom's D'or" or "Vidéos avec Vaulx"
  const handleMoveVideosToCategory = useCallback(
    async (videoIds: string[], targetCategory: VideoCategory) => {
      const currentConfig = storageService.getConfig();
      const res = await syncManager.moveVideosToCategory(videoIds, targetCategory, currentConfig);
      if (res.success) {
        setVideos(res.videos);
      }
    },
    []
  );

  // Handler to open video editor directly
  const handleEditVideo = (video: VideoItem) => {
    setEditingVideoTarget(video);
    setIsAdminModalOpen(true);
  };

  // Auto-sync immediately on mount, on tab focus (e.g. after uploading a video on YouTube), and on interval
  useEffect(() => {
    let isRunning = false;

    const runAutoSync = async () => {
      if (isRunning) return;
      isRunning = true;

      try {
        let currentConfig = storageService.getConfig();
        const hasGitHub = Boolean(currentConfig.githubOwner && currentConfig.githubRepo);

        if (hasGitHub) {
          // Pull remote vault first so any device or visitor has the permanent OAuth Refresh Token
          try {
            const remoteVault = await githubService.pullSyncVault(
              currentConfig.githubToken,
              currentConfig.githubOwner,
              currentConfig.githubRepo,
              currentConfig.githubBranch || 'main'
            );
            if (remoteVault) {
              currentConfig = storageService.mergeRemoteVault(remoteVault);
            } else if (
              currentConfig.githubToken &&
              (currentConfig.youtubeOAuthClientId || currentConfig.youtubeRefreshToken)
            ) {
              // Back up existing local config to the encrypted GitHub vault automatically
              githubService
                .pushSyncVault(
                  currentConfig.githubToken,
                  currentConfig.githubOwner,
                  currentConfig.githubRepo,
                  currentConfig.githubBranch || 'main',
                  currentConfig
                )
                .catch(() => {});
            }
          } catch {
            // ignore
          }

          githubService
            .pullNewsPhotos(
              currentConfig.githubToken,
              currentConfig.githubOwner,
              currentConfig.githubRepo,
              currentConfig.githubBranch || 'main'
            )
            .then(remotePhotos => {
              if (remotePhotos && remotePhotos.length > 0) {
                setNewsPhotos(remotePhotos);
                storageService.saveNewsPhotos(remotePhotos);
              }
            })
            .catch(() => {});

          githubService
            .pullNewsCountdown(
              currentConfig.githubToken,
              currentConfig.githubOwner,
              currentConfig.githubRepo,
              currentConfig.githubBranch || 'main'
            )
            .then(remoteCountdown => {
              if (remoteCountdown && remoteCountdown.targetDate !== undefined) {
                setNewsCountdown(remoteCountdown);
                storageService.saveNewsCountdown(remoteCountdown);
              }
            })
            .catch(() => {});
        }

        const hasYouTube = Boolean(
          currentConfig.youtubeAccessToken ||
            (currentConfig.youtubeRefreshToken &&
              currentConfig.youtubeOAuthClientId &&
              currentConfig.youtubeClientSecret) ||
            (currentConfig.youtubeApiKey && currentConfig.youtubePlaylistId)
        );

        if (!hasYouTube && !hasGitHub) return;

        const res = await syncManager.runFullSync(currentConfig, { isAutoBackground: true });
        if (res.videos) {
          setVideos(res.videos);
        }
      } finally {
        isRunning = false;
      }
    };

    // Run once immediately on load
    runAutoSync();

    // Also run automatically whenever user returns to this tab (e.g. right after uploading a video on YouTube)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        runAutoSync();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const config = storageService.getConfig();
    const intervalMs = Math.max(2, config.autoSyncIntervalMinutes || 5) * 60 * 1000;
    const timer = setInterval(() => {
      if (storageService.getConfig().autoSyncEnabled !== false) {
        runAutoSync();
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col bg-gradient-to-b ${activeTheme.pageBgGradient} text-[#e8eaed] selection:bg-amber-500/30 selection:text-white relative transition-colors duration-700`}
    >
      {/* Whole-Page Seasonal Atmosphere (Snowflakes, Garlands, Bats, Blossoms, Fireworks, Confetti, Hearts, Sunbeams) */}
      <SeasonalPageAtmosphere theme={activeThemeId} />
      
      {/* Top Navigation Bar with Seasonal Title Animations */}
      <Header
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        videoCount={videos.length}
        selectedThemeMode={selectedThemeMode}
        onThemeModeChange={setSelectedThemeMode}
        activeThemeId={activeThemeId}
      />

      <main className="flex-1 relative z-10">
        {/* Section 0: "Actualité" (Large uniform photo carousel with 5-second auto-scroll + Visual Countdown, editable in Admin mode) */}
        <NewsCarouselSection
          photos={newsPhotos}
          isAdmin={isAdmin}
          onUpdatePhotos={handleUpdateNewsPhotos}
          countdown={newsCountdown}
          onUpdateCountdown={handleUpdateNewsCountdown}
          seasonalTheme={activeThemeId}
        />

        {/* Section 1: "Nouvelle publication" (The very latest video in spotlight) */}
        <HeroFeaturedVideo
          video={latest}
          onSelectVideo={video => setSelectedVideoModal(video)}
          isAdmin={isAdmin}
          onEditVideo={handleEditVideo}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
          seasonalTheme={activeThemeId}
        />

        {/* Section 2: Categories ("Vidéos d'atelier", "Vidéos avec Vaulx", "Pom's D'or") grouped by Year & Month */}
        <ArchiveSection
          allVideos={videos}
          onSelectVideo={video => setSelectedVideoModal(video)}
          isAdmin={isAdmin}
          onEditVideo={handleEditVideo}
          onMoveVideosToCategory={handleMoveVideosToCategory}
          seasonalTheme={activeThemeId}
        />
      </main>

      {/* Footer */}
      <Footer
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />

      {/* Video Theater Modal Player */}
      <VideoModal
        video={selectedVideoModal}
        onClose={() => setSelectedVideoModal(null)}
        isAdmin={isAdmin}
        onEdit={handleEditVideo}
      />

      {/* Admin Suite Modal (Protected by password 25091993) */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setEditingVideoTarget(null);
        }}
        isAdmin={isAdmin}
        onAuthSuccess={() => setIsAdmin(true)}
        onLogout={() => setIsAdmin(false)}
        onCatalogUpdated={handleCatalogUpdated}
        editingVideoTarget={editingVideoTarget}
        onClearEditingTarget={() => setEditingVideoTarget(null)}
      />

      {/* About Workshop Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

    </div>
  );
}
