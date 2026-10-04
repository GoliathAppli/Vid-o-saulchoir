/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig } from '../types/cinema';
import { storageService } from './storageService';
import { youtubeService, extractYouTubeId } from './youtubeService';
import { githubService } from './githubService';

export const syncManager = {
  /**
   * Run complete sync:
   * 1. Pull YouTube videos (if configured)
   * 2. Merge with existing catalog
   * 3. Push to GitHub (if configured)
   * 4. Save locally
   */
  async runFullSync(config: SyncConfig): Promise<{
    success: boolean;
    message: string;
    videos: VideoItem[];
    newCount: number;
  }> {
    let currentVideos = storageService.getVideos();
    let newItemsCount = 0;
    const actionsTaken: string[] = [];

    try {
      // 1. YouTube Sync
      if (config.youtubeApiKey && config.youtubePlaylistId) {
        try {
          const ytVideos = await youtubeService.fetchPlaylistVideos(
            config.youtubePlaylistId,
            config.youtubeApiKey,
            config.youtubeAccessToken
          );

          if (ytVideos.length > 0) {
            const existingMap = new Map<string, VideoItem>();
            for (const v of currentVideos) {
              existingMap.set(v.id, v);
            }

            for (const yt of ytVideos) {
              if (!existingMap.has(yt.id)) {
                // Brand new video found!
                newItemsCount++;
                currentVideos.unshift(yt);
              } else {
                // Update existing without losing manual synopsis/notes
                const existing = existingMap.get(yt.id)!;
                existing.title = yt.title || existing.title;
                existing.publishedAt = yt.publishedAt || existing.publishedAt;
                existing.thumbnailUrl = yt.thumbnailUrl || existing.thumbnailUrl;
                existing.duration = yt.duration || existing.duration;
              }
            }

            actionsTaken.push(`${ytVideos.length} vidéo(s) synchronisée(s) depuis YouTube`);
            storageService.addLog({
              source: 'youtube',
              status: 'success',
              message: `Synchronisation YouTube réussie (${ytVideos.length} vidéo(s) récupérée(s), ${newItemsCount} nouvelle(s)).`,
              itemCount: ytVideos.length,
            });
          }
        } catch (ytErr) {
          const errMsg = ytErr instanceof Error ? ytErr.message : 'Erreur inconnue YouTube';
          storageService.addLog({
            source: 'youtube',
            status: 'warning',
            message: `Avertissement YouTube : ${errMsg}`,
          });
          actionsTaken.push(`Échec partiel YouTube : ${errMsg}`);
        }
      }

      // 2. Sort current videos by publication date descending
      currentVideos = [...currentVideos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Save locally
      storageService.saveVideos(currentVideos);

      // 3. GitHub Sync (push latest state to repo)
      if (config.githubToken && config.githubOwner && config.githubRepo) {
        try {
          const commitMsg = newItemsCount > 0
            ? `Sync auto : ${newItemsCount} nouvelle(s) vidéo(s) ajoutée(s) (${new Date().toLocaleDateString('fr-FR')})`
            : `Sync auto : actualisation du catalogue (${new Date().toLocaleDateString('fr-FR')})`;

          const ghRes = await githubService.pushVideos(
            config.githubToken,
            config.githubOwner,
            config.githubRepo,
            config.githubBranch || 'main',
            config.githubFilePath || 'data/videos.json',
            currentVideos,
            commitMsg
          );

          if (ghRes.success) {
            actionsTaken.push(`Sauvegardé sur GitHub (${config.githubOwner}/${config.githubRepo})`);
            storageService.addLog({
              source: 'github',
              status: 'success',
              message: `Catalogue poussé avec succès sur GitHub (${currentVideos.length} vidéos archivées).`,
              itemCount: currentVideos.length,
            });
          }
        } catch (ghErr) {
          const errMsg = ghErr instanceof Error ? ghErr.message : 'Erreur inconnue GitHub';
          storageService.addLog({
            source: 'github',
            status: 'warning',
            message: `Avertissement GitHub : ${errMsg}`,
          });
          actionsTaken.push(`Échec sauvegarde GitHub : ${errMsg}`);
        }
      }

      const summary = actionsTaken.length > 0
        ? actionsTaken.join(' · ')
        : 'Catalogue local à jour (aucun service distant configuré).';

      const updatedConfig: SyncConfig = {
        ...config,
        lastSyncTimestamp: new Date().toISOString(),
        lastSyncStatus: 'success',
        lastSyncMessage: summary,
      };
      storageService.saveConfig(updatedConfig);

      return {
        success: true,
        message: summary,
        videos: currentVideos,
        newCount: newItemsCount,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      const updatedConfig: SyncConfig = {
        ...config,
        lastSyncTimestamp: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncMessage: `Erreur : ${errMsg}`,
      };
      storageService.saveConfig(updatedConfig);

      storageService.addLog({
        source: 'system',
        status: 'error',
        message: `Échec de la synchronisation : ${errMsg}`,
      });

      return {
        success: false,
        message: errMsg,
        videos: currentVideos,
        newCount: 0,
      };
    }
  },

  /**
   * Pull specifically from GitHub repo to local
   */
  async pullFromGitHub(config: SyncConfig): Promise<{
    success: boolean;
    message: string;
    videos: VideoItem[];
  }> {
    try {
      const res = await githubService.pullVideos(
        config.githubToken,
        config.githubOwner,
        config.githubRepo,
        config.githubBranch,
        config.githubFilePath
      );

      storageService.saveVideos(res.videos);

      storageService.addLog({
        source: 'github',
        status: 'success',
        message: `Catalogue synchronisé depuis GitHub (${res.videos.length} vidéos chargées).`,
        itemCount: res.videos.length,
      });

      return {
        success: true,
        message: `${res.videos.length} vidéos récupérées depuis le dépôt GitHub.`,
        videos: res.videos,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur GitHub';
      storageService.addLog({
        source: 'github',
        status: 'error',
        message: `Échec import GitHub : ${msg}`,
      });
      return {
        success: false,
        message: msg,
        videos: storageService.getVideos(),
      };
    }
  },

  /**
   * Add a single video (e.g. unlisted video link added directly by Admin)
   */
  async addOrUpdateVideo(
    videoData: Partial<VideoItem> & { urlOrId: string },
    config: SyncConfig
  ): Promise<{ success: boolean; video?: VideoItem; message: string }> {
    const videoId = extractYouTubeId(videoData.urlOrId);
    if (!videoId) {
      return {
        success: false,
        message: 'L\'URL ou l\'identifiant YouTube fourni est invalide.',
      };
    }

    let currentVideos = storageService.getVideos();
    let enrichedData: Partial<VideoItem> = {};

    // Try YouTube API enrichment if apiKey is available
    if (config.youtubeApiKey) {
      try {
        const details = await youtubeService.fetchVideoDetails(
          videoId,
          config.youtubeApiKey,
          config.youtubeAccessToken
        );
        if (details) {
          enrichedData = details;
        }
      } catch {
        // continue with manual details
      }
    }

    const defaultThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const finalVideo: VideoItem = {
      id: videoId,
      title: videoData.title?.trim() || enrichedData.title || `Vidéo ${videoId}`,
      description: videoData.description?.trim() || enrichedData.description || '',
      synopsis: videoData.synopsis?.trim() || videoData.description?.trim() || enrichedData.description?.slice(0, 300) || 'Aucun synopsis renseigné pour ce film.',
      publishedAt: videoData.publishedAt || enrichedData.publishedAt || new Date().toISOString(),
      thumbnailUrl: videoData.thumbnailUrl?.trim() || enrichedData.thumbnailUrl || defaultThumbnail,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      isUnlisted: videoData.isUnlisted !== undefined ? videoData.isUnlisted : (enrichedData.isUnlisted ?? true),
      duration: videoData.duration?.trim() || enrichedData.duration || '12:00',
      director: videoData.director?.trim() || enrichedData.director || 'Atelier Cinéma du Saulchoir',
      genre: videoData.genre || 'Court-métrage',
      tags: videoData.tags || enrichedData.tags || ['Atelier', 'Saulchoir'],
      technicalNotes: videoData.technicalNotes?.trim() || 'Format 1.85:1 · Son direct',
      featuredOverride: videoData.featuredOverride || false,
    };

    // Remove if already exists, then insert and sort
    currentVideos = currentVideos.filter(v => v.id !== videoId);
    currentVideos.unshift(finalVideo);
    currentVideos.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    storageService.saveVideos(currentVideos);

    storageService.addLog({
      source: 'system',
      status: 'success',
      message: `Ajout / mise à jour de la vidéo "${finalVideo.title}" (${finalVideo.isUnlisted ? 'Non répertoriée' : 'Publique'}).`,
    });

    // If GitHub credentials set, push update
    if (config.githubToken && config.githubOwner && config.githubRepo) {
      githubService.pushVideos(
        config.githubToken,
        config.githubOwner,
        config.githubRepo,
        config.githubBranch || 'main',
        config.githubFilePath || 'data/videos.json',
        currentVideos,
        `Ajout vidéo : "${finalVideo.title}" (${finalVideo.id})`
      ).catch(e => console.warn('Sync GitHub asynchrone échoué', e));
    }

    return {
      success: true,
      video: finalVideo,
      message: `La vidéo "${finalVideo.title}" a été enregistrée avec succès.`,
    };
  },

  /**
   * Delete a video from catalog
   */
  async deleteVideo(videoId: string, config: SyncConfig): Promise<{ success: boolean; message: string }> {
    let currentVideos = storageService.getVideos();
    const target = currentVideos.find(v => v.id === videoId);
    if (!target) {
      return { success: false, message: 'Vidéo introuvable.' };
    }

    currentVideos = currentVideos.filter(v => v.id !== videoId);
    storageService.saveVideos(currentVideos);

    storageService.addLog({
      source: 'system',
      status: 'info',
      message: `Suppression de la vidéo "${target.title}" (${videoId}).`,
    });

    if (config.githubToken && config.githubOwner && config.githubRepo) {
      githubService.pushVideos(
        config.githubToken,
        config.githubOwner,
        config.githubRepo,
        config.githubBranch || 'main',
        config.githubFilePath || 'data/videos.json',
        currentVideos,
        `Suppression vidéo : "${target.title}" (${videoId})`
      ).catch(e => console.warn('Sync GitHub asynchrone échoué', e));
    }

    return { success: true, message: `La vidéo "${target.title}" a été supprimée.` };
  }
};
