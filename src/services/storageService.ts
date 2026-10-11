/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig, SyncLogEntry, YearGroup, MonthGroup, NewsPhoto, NewsCountdown, normalizeVideoCategory } from '../types/cinema';
import bundledVideosData from '../../data/videos.json';
import bundledNewsPhotosData from '../../data/news_photos.json';
import bundledNewsCountdownData from '../../data/news_countdown.json';
import bundledSyncVaultData from '../../data/sync_vault.json';
import { decryptVaultPayload } from './githubService';

const STORAGE_KEYS = {
  LEGACY_VIDEOS: 'atelier_cinema_videos_catalog',
  VIDEOS: 'atelier_cinema_videos_v2',
  NEWS_PHOTOS: 'atelier_cinema_news_photos_v1',
  NEWS_COUNTDOWN: 'atelier_cinema_news_countdown_v1',
  CONFIG: 'atelier_cinema_sync_config',
  LOGS: 'atelier_cinema_sync_logs',
  ADMIN_SESSION: 'atelier_cinema_admin_auth',
};

const DEFAULT_COUNTDOWN: NewsCountdown = {
  enabled: false,
  targetDate: '',
  targetTime: '20:00',
  displayMode: 'days',
  label: "Avant l'événement",
};

const DEFAULT_CONFIG: SyncConfig = {
  youtubeOAuthClientId: '',
  youtubeClientSecret: '',
  youtubeRefreshToken: '',
  youtubeAccessToken: '',
  youtubeTokenExpiresAt: undefined,
  youtubeChannelTitle: '',
  youtubeApiKey: '',
  youtubePlaylistId: '',
  youtubeChannelId: '',
  githubToken: '',
  githubOwner: 'goliathappli',
  githubRepo: 'Vid-o-saulchoir',
  githubBranch: 'main',
  githubFilePath: 'data/videos.json',
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 5,
  lastSyncTimestamp: undefined,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'En attente de la connexion OAuth 2.0 YouTube permanente.',
};

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const storageService = {
  getVideos(): VideoItem[] {
    try {
      // Purge legacy sample catalog if present
      if (localStorage.getItem(STORAGE_KEYS.LEGACY_VIDEOS)) {
        localStorage.removeItem(STORAGE_KEYS.LEGACY_VIDEOS);
      }

      const bundledList: VideoItem[] = Array.isArray(bundledVideosData)
        ? (bundledVideosData as VideoItem[])
        : [];
      const bundledCategoryMap = new Map<string, string>();
      for (const bv of bundledList) {
        if (bv && bv.id && bv.genre) {
          bundledCategoryMap.set(bv.id, normalizeVideoCategory(bv.genre));
        }
      }

      const stored = localStorage.getItem(STORAGE_KEYS.VIDEOS);
      if (stored) {
        const parsed: VideoItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(v => {
            const localCat = normalizeVideoCategory(v.genre);
            const bundledCat = bundledCategoryMap.get(v.id);
            const finalGenre =
              localCat === "Vidéos d'atelier" && bundledCat && bundledCat !== "Vidéos d'atelier"
                ? bundledCat
                : localCat;
            return {
              ...v,
              genre: finalGenre,
            };
          });
        }
      }

      if (bundledList.length > 0) {
        return bundledList.map(v => ({
          ...v,
          genre: normalizeVideoCategory(v.genre),
        }));
      }
    } catch (e) {
      console.error('Erreur lecture vidéos locales', e);
    }
    return [];
  },

  saveVideos(videos: VideoItem[]): void {
    try {
      // Normalize category and keep sorted by publication date descending
      const sorted = [...videos]
        .map(v => ({
          ...v,
          genre: normalizeVideoCategory(v.genre),
        }))
        .sort((a, b) => 
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(sorted));
    } catch (e) {
      console.error('Erreur sauvegarde vidéos locales', e);
    }
  },

  getNewsPhotos(): NewsPhoto[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEWS_PHOTOS);
      if (stored) {
        const parsed: NewsPhoto[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      if (Array.isArray(bundledNewsPhotosData) && bundledNewsPhotosData.length > 0) {
        return bundledNewsPhotosData as NewsPhoto[];
      }
    } catch (e) {
      console.error('Erreur lecture photos actualité', e);
    }
    return [];
  },

  saveNewsPhotos(photos: NewsPhoto[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NEWS_PHOTOS, JSON.stringify(photos));
    } catch (e) {
      console.error('Erreur sauvegarde photos actualité', e);
    }
  },

  getNewsCountdown(): NewsCountdown {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEWS_COUNTDOWN);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.targetDate) {
          return {
            ...DEFAULT_COUNTDOWN,
            ...parsed,
          };
        }
      }
      if (bundledNewsCountdownData && typeof bundledNewsCountdownData === 'object') {
        return {
          ...DEFAULT_COUNTDOWN,
          ...(bundledNewsCountdownData as Partial<NewsCountdown>),
        };
      }
    } catch (e) {
      console.error('Erreur lecture compte à rebours actualité', e);
    }
    return DEFAULT_COUNTDOWN;
  },

  saveNewsCountdown(countdown: NewsCountdown): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NEWS_COUNTDOWN, JSON.stringify(countdown));
    } catch (e) {
      console.error('Erreur sauvegarde compte à rebours actualité', e);
    }
  },

  getConfig(): SyncConfig {
    let baseConfig: SyncConfig = { ...DEFAULT_CONFIG };

    try {
      if (
        bundledSyncVaultData &&
        typeof bundledSyncVaultData === 'object' &&
        typeof (bundledSyncVaultData as { vault?: string }).vault === 'string' &&
        (bundledSyncVaultData as { vault?: string }).vault
      ) {
        const decrypted = decryptVaultPayload((bundledSyncVaultData as { vault: string }).vault);
        if (decrypted) {
          baseConfig = {
            ...baseConfig,
            ...decrypted,
          };
        }
      }
    } catch {
      // ignore bundled vault parse errors
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...baseConfig,
          ...parsed,
          youtubeOAuthClientId: parsed.youtubeOAuthClientId || baseConfig.youtubeOAuthClientId || '',
          youtubeClientSecret: parsed.youtubeClientSecret || baseConfig.youtubeClientSecret || '',
          youtubeRefreshToken: parsed.youtubeRefreshToken || baseConfig.youtubeRefreshToken || '',
          youtubeAccessToken: parsed.youtubeAccessToken || baseConfig.youtubeAccessToken || '',
          youtubeTokenExpiresAt: parsed.youtubeTokenExpiresAt || baseConfig.youtubeTokenExpiresAt,
          youtubeChannelTitle: parsed.youtubeChannelTitle || baseConfig.youtubeChannelTitle || '',
          youtubePlaylistId: parsed.youtubePlaylistId || baseConfig.youtubePlaylistId || '',
          githubToken: parsed.githubToken || baseConfig.githubToken || '',
          githubOwner: parsed.githubOwner || baseConfig.githubOwner || DEFAULT_CONFIG.githubOwner,
          githubRepo: parsed.githubRepo || baseConfig.githubRepo || DEFAULT_CONFIG.githubRepo,
        };
      }
    } catch (e) {
      console.error('Erreur lecture config', e);
    }
    return baseConfig;
  },

  saveConfig(config: SyncConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Erreur sauvegarde config', e);
    }
  },

  mergeRemoteVault(remoteVault: Partial<SyncConfig>): SyncConfig {
    const current = this.getConfig();
    const merged: SyncConfig = {
      ...current,
      youtubeOAuthClientId: current.youtubeOAuthClientId || remoteVault.youtubeOAuthClientId || '',
      youtubeClientSecret: current.youtubeClientSecret || remoteVault.youtubeClientSecret || '',
      youtubeRefreshToken: current.youtubeRefreshToken || remoteVault.youtubeRefreshToken || '',
      youtubeAccessToken: current.youtubeAccessToken || remoteVault.youtubeAccessToken || '',
      youtubeTokenExpiresAt: current.youtubeTokenExpiresAt || remoteVault.youtubeTokenExpiresAt,
      youtubeChannelTitle: current.youtubeChannelTitle || remoteVault.youtubeChannelTitle || '',
      youtubePlaylistId: current.youtubePlaylistId || remoteVault.youtubePlaylistId || '',
      youtubeChannelId: current.youtubeChannelId || remoteVault.youtubeChannelId || '',
      githubToken: current.githubToken || remoteVault.githubToken || '',
      githubOwner: current.githubOwner || remoteVault.githubOwner || DEFAULT_CONFIG.githubOwner,
      githubRepo: current.githubRepo || remoteVault.githubRepo || DEFAULT_CONFIG.githubRepo,
      githubBranch: current.githubBranch || remoteVault.githubBranch || DEFAULT_CONFIG.githubBranch,
      githubFilePath: current.githubFilePath || remoteVault.githubFilePath || DEFAULT_CONFIG.githubFilePath,
      autoSyncEnabled: true,
    };
    this.saveConfig(merged);
    return merged;
  },

  getLogs(): SyncLogEntry[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erreur lecture logs', e);
    }
    return [];
  },

  addLog(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getLogs();
    const newEntry: SyncLogEntry = {
      ...entry,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...logs.slice(0, 49)]; // keep 50 logs max
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
    } catch (e) {
      console.error('Erreur écriture log', e);
    }
  },

  clearLogs(): void {
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  },

  // Clear local catalog completely
  resetCatalog(): VideoItem[] {
    localStorage.removeItem(STORAGE_KEYS.LEGACY_VIDEOS);
    localStorage.removeItem(STORAGE_KEYS.VIDEOS);
    return [];
  },

  /**
   * Groups any list of videos hierarchically by Year (Année) then Month (Mois)
   */
  groupVideosByDate(videoList: VideoItem[]): YearGroup[] {
    if (!videoList || videoList.length === 0) return [];

    const yearMap = new Map<number, Map<number, VideoItem[]>>();

    for (const vid of videoList) {
      const d = new Date(vid.publishedAt);
      const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
      const month = isNaN(d.getMonth()) ? 0 : d.getMonth();

      if (!yearMap.has(year)) {
        yearMap.set(year, new Map<number, VideoItem[]>());
      }
      const monthMap = yearMap.get(year)!;
      if (!monthMap.has(month)) {
        monthMap.set(month, []);
      }
      monthMap.get(month)!.push(vid);
    }

    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    return sortedYears.map(year => {
      const monthMap = yearMap.get(year)!;
      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => b - a);

      const months: MonthGroup[] = sortedMonths.map(monthIdx => ({
        monthIndex: monthIdx,
        monthName: FRENCH_MONTHS[monthIdx] || `Mois ${monthIdx + 1}`,
        videos: monthMap.get(monthIdx)!.sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        )
      }));

      const totalVideos = months.reduce((acc, m) => acc + m.videos.length, 0);

      return {
        year,
        months,
        totalVideos
      };
    });
  },

  /**
   * Returns:
   * 1. latest: The single most recent video ("Nouvelle publication")
   * 2. archives: All other previous videos, grouped hierarchically by Year then Month
   */
  getPartitionedVideos(allVideos: VideoItem[]): {
    latest: VideoItem | null;
    archives: YearGroup[];
  } {
    if (!allVideos || allVideos.length === 0) {
      return { latest: null, archives: [] };
    }

    // Sort descending by publication date
    const sorted = [...allVideos].sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    // If an item has featuredOverride === true, we can place it as latest,
    // otherwise strictly the very first one (most recent publishedAt)
    let latestIndex = sorted.findIndex(v => v.featuredOverride);
    if (latestIndex === -1) {
      latestIndex = 0;
    }

    const latest = sorted[latestIndex];
    const previousVideos = sorted.filter((_, idx) => idx !== latestIndex);
    const archives = this.groupVideosByDate(previousVideos);

    return { latest, archives };
  },

  // Admin authentication check (permanent in localStorage until explicit logout)
  isAdminAuthenticated(): boolean {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true' ||
        sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true'
      );
    } catch {
      return false;
    }
  },

  setAdminAuthenticated(auth: boolean): void {
    try {
      if (auth) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
        sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
      }
    } catch {
      // ignore storage errors
    }
  }
};
