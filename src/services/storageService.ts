/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig, SyncLogEntry, YearGroup, MonthGroup } from '../types/cinema';

const STORAGE_KEYS = {
  LEGACY_VIDEOS: 'atelier_cinema_videos_catalog',
  VIDEOS: 'atelier_cinema_videos_v2',
  CONFIG: 'atelier_cinema_sync_config',
  LOGS: 'atelier_cinema_sync_logs',
  ADMIN_SESSION: 'atelier_cinema_admin_auth',
};

const DEFAULT_CONFIG: SyncConfig = {
  youtubeOAuthClientId: '',
  youtubeAccessToken: '',
  youtubeApiKey: '',
  youtubePlaylistId: '',
  youtubeChannelId: '',
  githubToken: '',
  githubOwner: '',
  githubRepo: '',
  githubBranch: 'main',
  githubFilePath: 'data/videos.json',
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 15,
  lastSyncTimestamp: undefined,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'En attente de la connexion OAuth 2.0 YouTube ou GitHub.',
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

      const stored = localStorage.getItem(STORAGE_KEYS.VIDEOS);
      if (stored) {
        const parsed: VideoItem[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erreur lecture vidéos locales', e);
    }
    return [];
  },

  saveVideos(videos: VideoItem[]): void {
    try {
      // Keep sorted by publication date descending
      const sorted = [...videos].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(sorted));
    } catch (e) {
      console.error('Erreur sauvegarde vidéos locales', e);
    }
  },

  getConfig(): SyncConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Erreur lecture config', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: SyncConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Erreur sauvegarde config', e);
    }
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

    // Group previous videos by Year then Month
    const yearMap = new Map<number, Map<number, VideoItem[]>>();

    for (const vid of previousVideos) {
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

    // Convert into sorted YearGroup array
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    const archives: YearGroup[] = sortedYears.map(year => {
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

    return { latest, archives };
  },

  // Admin authentication check
  isAdminAuthenticated(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
  },

  setAdminAuthenticated(auth: boolean): void {
    if (auth) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  }
};
