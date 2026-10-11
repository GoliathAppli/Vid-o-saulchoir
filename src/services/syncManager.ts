/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig, VideoCategory, normalizeVideoCategory } from '../types/cinema';
import { storageService } from './storageService';
import { youtubeService, extractYouTubeId, extractPlaylistId } from './youtubeService';
import { githubService } from './githubService';

export const syncManager = {
  /**
   * Run complete sync:
   * 1. Pull YouTube videos (if configured)
   * 2. Merge with existing catalog
   * 3. Push to GitHub (if configured)
   * 4. Save locally
   */
  async runFullSync(
    config: SyncConfig,
    options?: { isAutoBackground?: boolean }
  ): Promise<{
    success: boolean;
    message: string;
    videos: VideoItem[];
    newCount: number;
    updatedConfig?: SyncConfig;
  }> {
    let activeConfig: SyncConfig = { ...config };
    let currentVideos = storageService.getVideos();
    let newItemsCount = 0;
    let hasError = false;
    const actionsTaken: string[] = [];

    try {
      // 0a. Pull permanent encrypted config vault from GitHub if any local credential is missing
      if (activeConfig.githubOwner && activeConfig.githubRepo) {
        const needsVaultPull =
          !activeConfig.youtubeRefreshToken ||
          !activeConfig.youtubeOAuthClientId ||
          !activeConfig.githubToken;

        if (needsVaultPull) {
          try {
            const remoteVault = await githubService.pullSyncVault(
              activeConfig.githubToken,
              activeConfig.githubOwner,
              activeConfig.githubRepo,
              activeConfig.githubBranch || 'main'
            );
            if (remoteVault) {
              activeConfig = storageService.mergeRemoteVault(remoteVault);
            }
          } catch {
            // ignore if vault not created yet
          }
        }
      }

      const cleanPlaylistId = extractPlaylistId(activeConfig.youtubePlaylistId || '');

      // 0b. If GitHub repo is configured, pull the shared catalog from GitHub so any computer stays in sync
      if (activeConfig.githubOwner && activeConfig.githubRepo) {
        try {
          const ghPull = await githubService.pullVideos(
            activeConfig.githubToken,
            activeConfig.githubOwner,
            activeConfig.githubRepo,
            activeConfig.githubBranch || 'main',
            activeConfig.githubFilePath || 'data/videos.json'
          );
          if (ghPull.videos && ghPull.videos.length > 0) {
            const localMap = new Map<string, VideoItem>();
            for (const v of currentVideos) {
              localMap.set(v.id, v);
            }
            for (const ghVid of ghPull.videos) {
              const existingLocal = localMap.get(ghVid.id);
              const ghCat = normalizeVideoCategory(ghVid.genre);
              const localCat = existingLocal ? normalizeVideoCategory(existingLocal.genre) : "Vidéos d'atelier";
              const mergedGenre =
                ghCat === "Vidéos d'atelier" && localCat !== "Vidéos d'atelier"
                  ? localCat
                  : ghCat;
              localMap.set(ghVid.id, {
                ...ghVid,
                genre: mergedGenre,
              });
            }
            currentVideos = Array.from(localMap.values());
            actionsTaken.push(`${ghPull.videos.length} vidéo(s) chargée(s) depuis GitHub`);
          }
        } catch {
          // File may not exist yet on GitHub, ignore
        }
      }

      // 1. YouTube Sync via OAuth 2.0 (automatically renews Access Token using permanent Refresh Token if needed)
      const tokenCheck = await youtubeService.ensureValidAccessToken(activeConfig, false);
      if (tokenCheck.accessToken) {
        activeConfig.youtubeAccessToken = tokenCheck.accessToken;
        if (tokenCheck.expiresAt) {
          activeConfig.youtubeTokenExpiresAt = tokenCheck.expiresAt;
        }
      }

      const canSyncYouTube = Boolean(
        activeConfig.youtubeAccessToken ||
          (activeConfig.youtubeRefreshToken &&
            activeConfig.youtubeOAuthClientId &&
            activeConfig.youtubeClientSecret) ||
          (activeConfig.youtubeApiKey && cleanPlaylistId)
      );

      if (canSyncYouTube) {
        try {
          let ytVideos: VideoItem[];
          try {
            ytVideos = await youtubeService.fetchPlaylistVideos(
              cleanPlaylistId,
              activeConfig.youtubeApiKey,
              activeConfig.youtubeAccessToken
            );
          } catch (firstErr) {
            const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
            const isProjectServiceDisabled =
              firstMsg.includes('has not been used in project') ||
              firstMsg.includes('it is disabled') ||
              firstMsg.includes('accessNotConfigured');

            // Only force-refresh the OAuth token if the error could be an expired token (not a project config error)
            if (
              !isProjectServiceDisabled &&
              activeConfig.youtubeRefreshToken &&
              activeConfig.youtubeOAuthClientId &&
              activeConfig.youtubeClientSecret
            ) {
              const forced = await youtubeService.ensureValidAccessToken(activeConfig, true);
              activeConfig.youtubeAccessToken = forced.accessToken;
              activeConfig.youtubeTokenExpiresAt = forced.expiresAt;
              ytVideos = await youtubeService.fetchPlaylistVideos(
                cleanPlaylistId,
                activeConfig.youtubeApiKey,
                activeConfig.youtubeAccessToken
              );
            } else if (isProjectServiceDisabled) {
              // Try zero-API RSS fallback while waiting for the 1-click Google Cloud project activation
              const rssVideos = await youtubeService.fetchRssFallbackVideos(
                cleanPlaylistId || activeConfig.youtubeChannelId || ''
              );
              if (rssVideos.length > 0) {
                ytVideos = rssVideos;
              } else {
                throw firstErr;
              }
            } else {
              throw firstErr;
            }
          }

          const existingMap = new Map<string, VideoItem>();
          for (const v of currentVideos) {
            existingMap.set(v.id, v);
          }

          for (const yt of ytVideos) {
            if (!existingMap.has(yt.id)) {
              newItemsCount++;
              currentVideos.unshift({
                ...yt,
                genre: "Vidéos d'atelier",
              });
            } else {
              // Update existing without losing manual category/synopsis/notes
              const existing = existingMap.get(yt.id)!;
              existing.title = yt.title || existing.title;
              existing.publishedAt = yt.publishedAt || existing.publishedAt;
              existing.thumbnailUrl = yt.thumbnailUrl || existing.thumbnailUrl;
              existing.duration = yt.duration || existing.duration;
              existing.isUnlisted = yt.isUnlisted;
              existing.genre = normalizeVideoCategory(existing.genre);
            }
          }

          actionsTaken.push(`${ytVideos.length} vidéo(s) synchronisée(s) via OAuth YouTube (${newItemsCount} nouvelle(s))`);
          if (!options?.isAutoBackground || newItemsCount > 0) {
            storageService.addLog({
              source: 'youtube',
              status: 'success',
              message: `Synchronisation OAuth YouTube réussie (${ytVideos.length} vidéo(s) récupérée(s), ${newItemsCount} nouvelle(s)).`,
              itemCount: ytVideos.length,
            });
          }
        } catch (ytErr) {
          const rawMsg = ytErr instanceof Error ? ytErr.message : 'Erreur inconnue YouTube';
          const enableInfo = youtubeService.extractProjectEnableUrl(rawMsg, activeConfig.youtubeOAuthClientId);

          if (enableInfo && (rawMsg.includes('has not been used in project') || rawMsg.includes('it is disabled'))) {
            const friendlyMsg = `Votre connexion OAuth est bien enregistrée, mais Google Cloud demande d'activer une seule fois le connecteur YouTube sur votre projet OAuth (${enableInfo.projectId}) : ${enableInfo.url}`;
            if (!options?.isAutoBackground) {
              hasError = true;
              storageService.addLog({
                source: 'youtube',
                status: 'error',
                message: friendlyMsg,
              });
              actionsTaken.push(friendlyMsg);
            }
          } else {
            if (!options?.isAutoBackground) {
              hasError = true;
              storageService.addLog({
                source: 'youtube',
                status: 'error',
                message: `Erreur YouTube : ${rawMsg}`,
              });
            }
            actionsTaken.push(`Échec YouTube : ${rawMsg}`);
          }
        }
      }

      // 2. Sort current videos by publication date descending
      currentVideos = [...currentVideos].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      // Save locally
      storageService.saveVideos(currentVideos);

      // 3. GitHub Sync (push latest state to repo when new videos are detected or when manually triggered)
      const shouldPushToGitHub =
        Boolean(activeConfig.githubToken && activeConfig.githubOwner && activeConfig.githubRepo && currentVideos.length > 0) &&
        (!options?.isAutoBackground || newItemsCount > 0);

      if (shouldPushToGitHub) {
        try {
          const commitMsg = newItemsCount > 0
            ? `Sync auto OAuth : ${newItemsCount} nouvelle(s) vidéo(s) ajoutée(s) (${new Date().toLocaleDateString('fr-FR')})`
            : `Sync auto : actualisation du catalogue (${new Date().toLocaleDateString('fr-FR')})`;

          const ghRes = await githubService.pushVideos(
            activeConfig.githubToken,
            activeConfig.githubOwner,
            activeConfig.githubRepo,
            activeConfig.githubBranch || 'main',
            activeConfig.githubFilePath || 'data/videos.json',
            currentVideos,
            commitMsg
          );

          if (ghRes.success) {
            actionsTaken.push(`Sauvegardé sur GitHub (${activeConfig.githubOwner}/${activeConfig.githubRepo})`);
            storageService.addLog({
              source: 'github',
              status: 'success',
              message: `Catalogue poussé avec succès sur GitHub (${currentVideos.length} vidéos archivées).`,
              itemCount: currentVideos.length,
            });
          }

          if (!options?.isAutoBackground) {
            // Also push encrypted permanent config vault so fields are never lost on any device
            await githubService
              .pushSyncVault(
                activeConfig.githubToken,
                activeConfig.githubOwner,
                activeConfig.githubRepo,
                activeConfig.githubBranch || 'main',
                activeConfig
              )
              .catch(() => {});

            // Also push Actualité photos (data/news_photos.json) if any exist locally
            const localPhotos = storageService.getNewsPhotos();
            if (localPhotos.length > 0) {
              await githubService.pushNewsPhotos(
                activeConfig.githubToken,
                activeConfig.githubOwner,
                activeConfig.githubRepo,
                activeConfig.githubBranch || 'main',
                localPhotos
              );
            }

            // Also push Actualité countdown (data/news_countdown.json) if configured
            const localCountdown = storageService.getNewsCountdown();
            if (localCountdown.targetDate) {
              await githubService.pushNewsCountdown(
                activeConfig.githubToken,
                activeConfig.githubOwner,
                activeConfig.githubRepo,
                activeConfig.githubBranch || 'main',
                localCountdown
              );
            }
          }
        } catch (ghErr) {
          hasError = true;
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
        : 'Veuillez connecter votre OAuth 2.0 YouTube permanent (ou le dépôt GitHub) pour synchroniser.';

      const updatedConfig: SyncConfig = {
        ...activeConfig,
        youtubePlaylistId: cleanPlaylistId || activeConfig.youtubePlaylistId,
        lastSyncTimestamp: new Date().toISOString(),
        lastSyncStatus: hasError ? 'error' : 'success',
        lastSyncMessage: summary,
      };
      storageService.saveConfig(updatedConfig);

      return {
        success: !hasError && actionsTaken.length > 0,
        message: summary,
        videos: currentVideos,
        newCount: newItemsCount,
        updatedConfig,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      const updatedConfig: SyncConfig = {
        ...activeConfig,
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
        updatedConfig,
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

    // Try YouTube API enrichment if OAuth token or apiKey is available
    if (config.youtubeAccessToken || config.youtubeApiKey) {
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
      genre: normalizeVideoCategory(videoData.genre),
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
  },

  /**
   * Move selected videos into target category ("Vidéos d'atelier", "Vidéos avec Vaulx", or "Pom's D'or")
   */
  async moveVideosToCategory(
    videoIds: string[],
    targetCategory: VideoCategory,
    config: SyncConfig
  ): Promise<{ success: boolean; videos: VideoItem[]; message: string }> {
    const idSet = new Set(videoIds);
    const currentVideos = storageService.getVideos().map(v => {
      if (idSet.has(v.id)) {
        return {
          ...v,
          genre: targetCategory,
        };
      }
      return v;
    });

    storageService.saveVideos(currentVideos);

    storageService.addLog({
      source: 'system',
      status: 'success',
      message: `${videoIds.length} vidéo(s) déplacée(s) dans la catégorie "${targetCategory}".`,
      itemCount: videoIds.length,
    });

    if (config.githubToken && config.githubOwner && config.githubRepo) {
      githubService.pushVideos(
        config.githubToken,
        config.githubOwner,
        config.githubRepo,
        config.githubBranch || 'main',
        config.githubFilePath || 'data/videos.json',
        currentVideos,
        `Classement : ${videoIds.length} vidéo(s) déplacée(s) vers "${targetCategory}"`
      ).catch(e => console.warn('Sync GitHub asynchrone échoué', e));
    }

    return {
      success: true,
      videos: storageService.getVideos(),
      message: `${videoIds.length} vidéo(s) déplacée(s) vers "${targetCategory}".`,
    };
  }
};
