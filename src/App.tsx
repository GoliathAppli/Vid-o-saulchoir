/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoItem } from './types/cinema';
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

  // Partition videos dynamically:
  // - latest: the very newest video published -> "Nouvelle publication"
  // - archives: all previous videos organized by Year (Année) and Month (Mois)
  const { latest, archives } = useMemo(() => {
    return storageService.getPartitionedVideos(videos);
  }, [videos]);

  // Handler when catalog is updated (by sync, manual add, edit, or delete)
  const handleCatalogUpdated = useCallback((updatedVideos: VideoItem[]) => {
    setVideos(updatedVideos);
  }, []);

  // Handler to open video editor directly
  const handleEditVideo = (video: VideoItem) => {
    setEditingVideoTarget(video);
    setIsAdminModalOpen(true);
  };

  // Background auto-sync if configured
  useEffect(() => {
    const config = storageService.getConfig();
    if (!config.autoSyncEnabled || !config.youtubeApiKey) return;

    const intervalMs = Math.max(15, config.autoSyncIntervalMinutes || 60) * 60 * 1000;
    const timer = setInterval(() => {
      syncManager.runFullSync(config).then(res => {
        if (res.success && res.newCount > 0) {
          setVideos(res.videos);
        }
      });
    }, intervalMs);

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
        />

        {/* Section 2: "Archives" grouped chronologically by Year (Année) and Month (Mois) */}
        <ArchiveSection
          archives={archives}
          onSelectVideo={video => setSelectedVideoModal(video)}
          isAdmin={isAdmin}
          onEditVideo={handleEditVideo}
          onAddVideoClick={() => {
            setEditingVideoTarget(null);
            setIsAdminModalOpen(true);
          }}
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
