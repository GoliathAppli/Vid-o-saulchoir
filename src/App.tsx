/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoItem, VideoCategory } from './types/cinema';
import { storageService } from './services/storageService';
import { syncManager } from './services/syncManager';
import { Header } from './components/Header';
import { HeroFeaturedVideo } from './components/HeroFeaturedVideo';
import { ArchiveSection } from './components/ArchiveSection';
import { VideoModal } from './components/VideoModal';
import { AdminModal } from './components/AdminModal';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';

export default function App() {
  // Video catalog state
  const [videos, setVideos] = useState<VideoItem[]>(() => storageService.getVideos());

  // Admin authentication state (checks sessionStorage)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => storageService.isAdminAuthenticated());

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [selectedVideoModal, setSelectedVideoModal] = useState<VideoItem | null>(null);
  const [editingVideoTarget, setEditingVideoTarget] = useState<VideoItem | null>(null);

  // Latest video published -> "Nouvelle publication"
  const { latest } = useMemo(() => {
    return storageService.getPartitionedVideos(videos);
  }, [videos]);

  // Handler when catalog is updated (by sync, manual add, edit, or delete)
  const handleCatalogUpdated = useCallback((updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
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

  // Auto-sync immediately on mount if API/Playlist or GitHub are configured, plus background interval
  useEffect(() => {
    const runAutoSync = () => {
      const currentConfig = storageService.getConfig();
      const hasYouTube = Boolean(
        currentConfig.youtubeAccessToken ||
        (currentConfig.youtubeApiKey && currentConfig.youtubePlaylistId)
      );
      const hasGitHub = Boolean(currentConfig.githubOwner && currentConfig.githubRepo);

      if (!hasYouTube && !hasGitHub) return;

      syncManager.runFullSync(currentConfig).then(res => {
        if (res.videos) {
          setVideos(res.videos);
        }
      });
    };

    // Run once immediately on load
    runAutoSync();

    const config = storageService.getConfig();
    if (!config.autoSyncEnabled) return;

    const intervalMs = Math.max(5, config.autoSyncIntervalMinutes || 15) * 60 * 1000;
    const timer = setInterval(runAutoSync, intervalMs);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-[#e8eaed] selection:bg-amber-500/30 selection:text-white">
      
      {/* Top Navigation Bar with strict Top Bar Contract */}
      <Header
        isAdmin={isAdmin}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        videoCount={videos.length}
      />

      <main className="flex-1">
        {/* Section 1: "Nouvelle publication" (The very latest video in spotlight) */}
        <HeroFeaturedVideo
          video={latest}
          onSelectVideo={video => setSelectedVideoModal(video)}
          isAdmin={isAdmin}
          onEditVideo={handleEditVideo}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
        />

        {/* Section 2: Categories ("Vidéos d'atelier", "Vidéos avec Vaulx", "Pom's D'or") grouped by Year & Month */}
        <ArchiveSection
          allVideos={videos}
          onSelectVideo={video => setSelectedVideoModal(video)}
          isAdmin={isAdmin}
          onEditVideo={handleEditVideo}
          onMoveVideosToCategory={handleMoveVideosToCategory}
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
