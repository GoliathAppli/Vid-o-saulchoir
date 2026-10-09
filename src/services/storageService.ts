/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig, SyncLogEntry, YearGroup, MonthGroup, NewsPhoto, NewsCountdown, PersistedSyncSettings, normalizeVideoCategory } from '../types/cinema';
import bundledVideosData from '../../data/videos.json';
import bundledNewsPhotosData from '../../data/news_photos.json';
import bundledNewsCountdownData from '../../data/news_countdown.json';
import bundledSyncSettingsData from '../../data/sync_settings.json';

const STORAGE_KEYS = {
  LEGACY_VIDEOS: 'atelier_cinema_videos_catalog',
  VIDEOS: 'atelier_cinema_videos_v2',
  NEWS_PHOTOS: 'atelier_cinema_news_photos_v1',
  NEWS_COUNTDOWN: 'atelier_cinema_news_countdown_v1',
  CONFIG: 'atelier_cinema_sync_config',
  LOGS: 'atelier_cinema_sync_logs',
  ADMIN_SESSION: 'atelier_cinema_admin_auth',
};

const VAULT_SECRET = 'Saulchoir_Atelier_Cinema_25091993_PermanentSyncKey';

interface VaultPayload {
  youtubeOAuthClientId?: string;
  youtubeClientSecret?: string;
  youtubeRefreshToken?: string;
  youtubeAccessToken?: string;
  youtubeTokenExpiry?: number;
  youtubeUserEmail?: string;
  youtubeApiKey?: string;
  githubToken?: string;
}

function encodeVault(payload: VaultPayload): string {
  try {
    const json = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(json);
    const keyBytes = encoder.encode(VAULT_SECRET);
    const out = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      out[i] = (dataBytes[i] ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff)) & 0xff;
    }
    let hex = '';
    for (let i = 0; i < out.length; i++) {
      hex += out[i].toString(16).padStart(2, '0');
    }
    return 'acs1_' + hex;
  } catch {
    return '';
  }
}

function decodeVault(encoded?: string): VaultPayload | null {
  try {
    if (!encoded || !encoded.startsWith('acs1_')) return null;
    const hex = encoded.slice(5);
    if (!hex || hex.length % 2 !== 0) return null;
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(VAULT_SECRET);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      const byteVal = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      bytes[i] = (byteVal ^ keyBytes[i % keyBytes.length] ^ ((i * 31) & 0xff)) & 0xff;
    }
    const decoder = new TextDecoder('utf-8');
    const json = decoder.decode(bytes);
    return JSON.parse(json) as VaultPayload;
  } catch {
    return null;
  }
}

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
  youtubeTokenExpiry: undefined,
  youtubeUserEmail: '',
  youtubeApiKey: '',
  youtubePlaylistId: 'UUdOuEvwdKc0qr7_hxGF9_gA',
  youtubeChannelId: 'UCdOuEvwdKc0qr7_hxGF9_gA',
  githubToken: '',
  githubOwner: 'goliathappli',
  githubRepo: 'Vid-o-saulchoir',
  githubBranch: 'main',
  githubFilePath: 'data/videos.json',
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 2,
  lastSyncTimestamp: undefined,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'Synchronisation permanente prête.',
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
    try {
      const bundledSettings = (bundledSyncSettingsData || {}) as PersistedSyncSettings;
      const bundledVault = decodeVault(bundledSettings.encryptedVault) || {};

      const baseConfig: SyncConfig = {
        ...DEFAULT_CONFIG,
        youtubeOAuthClientId:
          bundledVault.youtubeOAuthClientId ||
          bundledSettings.youtubeOAuthClientId ||
          DEFAULT_CONFIG.youtubeOAuthClientId,
        youtubeClientSecret:
          bundledVault.youtubeClientSecret || DEFAULT_CONFIG.youtubeClientSecret,
        youtubeRefreshToken:
          bundledVault.youtubeRefreshToken || DEFAULT_CONFIG.youtubeRefreshToken,
        youtubeAccessToken:
          bundledVault.youtubeAccessToken || DEFAULT_CONFIG.youtubeAccessToken,
        youtubeTokenExpiry:
          bundledVault.youtubeTokenExpiry || DEFAULT_CONFIG.youtubeTokenExpiry,
        youtubeUserEmail:
          bundledVault.youtubeUserEmail ||
          bundledSettings.youtubeUserEmail ||
          DEFAULT_CONFIG.youtubeUserEmail,
        youtubeApiKey: bundledVault.youtubeApiKey || DEFAULT_CONFIG.youtubeApiKey,
        youtubePlaylistId:
          bundledSettings.youtubePlaylistId || DEFAULT_CONFIG.youtubePlaylistId,
        youtubeChannelId:
          bundledSettings.youtubeChannelId || DEFAULT_CONFIG.youtubeChannelId,
        githubToken: bundledVault.githubToken || DEFAULT_CONFIG.githubToken,
        githubOwner: bundledSettings.githubOwner || DEFAULT_CONFIG.githubOwner,
        githubRepo: bundledSettings.githubRepo || DEFAULT_CONFIG.githubRepo,
      };

      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<SyncConfig>;
        return {
          ...baseConfig,
          ...parsed,
          youtubeOAuthClientId:
            parsed.youtubeOAuthClientId || baseConfig.youtubeOAuthClientId || '',
          youtubeClientSecret:
            parsed.youtubeClientSecret || baseConfig.youtubeClientSecret || '',
          youtubeRefreshToken:
            parsed.youtubeRefreshToken || baseConfig.youtubeRefreshToken || '',
          youtubeAccessToken:
            parsed.youtubeAccessToken || baseConfig.youtubeAccessToken || '',
          youtubeTokenExpiry:
            parsed.youtubeTokenExpiry || baseConfig.youtubeTokenExpiry,
          youtubeUserEmail:
            parsed.youtubeUserEmail || baseConfig.youtubeUserEmail || '',
          youtubeApiKey: parsed.youtubeApiKey || baseConfig.youtubeApiKey || '',
          youtubePlaylistId:
            parsed.youtubePlaylistId || baseConfig.youtubePlaylistId,
          youtubeChannelId:
            parsed.youtubeChannelId || baseConfig.youtubeChannelId,
          githubToken: parsed.githubToken || baseConfig.githubToken || '',
          githubOwner: parsed.githubOwner || baseConfig.githubOwner,
          githubRepo: parsed.githubRepo || baseConfig.githubRepo,
          autoSyncIntervalMinutes: parsed.autoSyncIntervalMinutes || 2,
        };
      }
      return baseConfig;
    } catch (e) {
      console.error('Erreur lecture config', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: SyncConfig): void {
    try {
      const existing = this.getConfig();
      const merged: SyncConfig = {
        ...existing,
        ...config,
        youtubeOAuthClientId:
          config.youtubeOAuthClientId !== undefined
            ? config.youtubeOAuthClientId.trim()
            : existing.youtubeOAuthClientId || '',
        youtubeClientSecret:
          config.youtubeClientSecret !== undefined
            ? config.youtubeClientSecret.trim()
            : existing.youtubeClientSecret || '',
        youtubeRefreshToken:
          config.youtubeRefreshToken !== undefined
            ? config.youtubeRefreshToken.trim()
            : existing.youtubeRefreshToken || '',
        youtubeAccessToken:
          config.youtubeAccessToken !== undefined
            ? config.youtubeAccessToken.trim()
            : existing.youtubeAccessToken || '',
        youtubeTokenExpiry:
          config.youtubeTokenExpiry !== undefined
            ? config.youtubeTokenExpiry
            : existing.youtubeTokenExpiry,
        youtubeUserEmail:
          config.youtubeUserEmail !== undefined
            ? config.youtubeUserEmail.trim()
            : existing.youtubeUserEmail || '',
        youtubeApiKey:
          config.youtubeApiKey !== undefined
            ? config.youtubeApiKey.trim()
            : existing.youtubeApiKey || '',
        githubToken:
          config.githubToken !== undefined && config.githubToken !== ''
            ? config.githubToken.trim()
            : existing.githubToken || '',
        youtubePlaylistId:
          config.youtubePlaylistId || existing.youtubePlaylistId || DEFAULT_CONFIG.youtubePlaylistId,
        youtubeChannelId:
          config.youtubeChannelId || existing.youtubeChannelId || DEFAULT_CONFIG.youtubeChannelId,
        githubOwner: config.githubOwner || existing.githubOwner || DEFAULT_CONFIG.githubOwner,
        githubRepo: config.githubRepo || existing.githubRepo || DEFAULT_CONFIG.githubRepo,
      };
      if (merged.youtubeOAuthClientId) {
        localStorage.removeItem('atelier_cinema_oauth_cleared');
      }
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(merged));
    } catch (e) {
      console.error('Erreur sauvegarde config', e);
    }
  },

  clearOAuthCredentials(): SyncConfig {
    const existing = this.getConfig();
    const cleaned: SyncConfig = {
      ...existing,
      youtubeOAuthClientId: '',
      youtubeClientSecret: '',
      youtubeRefreshToken: '',
      youtubeAccessToken: '',
      youtubeTokenExpiry: undefined,
      youtubeUserEmail: '',
    };
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(cleaned));
    localStorage.setItem('atelier_cinema_oauth_cleared', 'true');
    return cleaned;
  },

  encodeSyncSettings(config: SyncConfig): PersistedSyncSettings {
    const encryptedVault = encodeVault({
      youtubeOAuthClientId: config.youtubeOAuthClientId || '',
      youtubeClientSecret: config.youtubeClientSecret || '',
      youtubeRefreshToken: config.youtubeRefreshToken || '',
      youtubeAccessToken: config.youtubeAccessToken || '',
      youtubeTokenExpiry: config.youtubeTokenExpiry,
      youtubeUserEmail: config.youtubeUserEmail || '',
      youtubeApiKey: config.youtubeApiKey || '',
      githubToken: config.githubToken || '',
    });

    return {
      youtubeOAuthClientId: config.youtubeOAuthClientId || '',
      youtubeChannelId: config.youtubeChannelId || 'UCdOuEvwdKc0qr7_hxGF9_gA',
      youtubePlaylistId: config.youtubePlaylistId || 'UUdOuEvwdKc0qr7_hxGF9_gA',
      youtubeUserEmail: config.youtubeUserEmail || '',
      githubOwner: config.githubOwner || 'goliathappli',
      githubRepo: config.githubRepo || 'Vid-o-saulchoir',
      githubBranch: config.githubBranch || 'main',
      githubFilePath: config.githubFilePath || 'data/videos.json',
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: config.autoSyncIntervalMinutes || 2,
      updatedAt: new Date().toISOString(),
      encryptedVault,
    };
  },

  mergeRemoteSyncSettings(remote: PersistedSyncSettings | null): SyncConfig {
    const local = this.getConfig();
    if (!remote) return local;

    const oauthCleared = localStorage.getItem('atelier_cinema_oauth_cleared') === 'true';
    const vault = decodeVault(remote.encryptedVault) || {};

    // Prefer whichever access token expires later (unless OAuth was explicitly cleared)
    let bestAccessToken = oauthCleared ? '' : (local.youtubeAccessToken || vault.youtubeAccessToken || '');
    let bestTokenExpiry = oauthCleared ? undefined : (local.youtubeTokenExpiry || vault.youtubeTokenExpiry);
    if (
      !oauthCleared &&
      vault.youtubeAccessToken &&
      vault.youtubeTokenExpiry &&
      (!local.youtubeTokenExpiry || vault.youtubeTokenExpiry > local.youtubeTokenExpiry)
    ) {
      bestAccessToken = vault.youtubeAccessToken;
      bestTokenExpiry = vault.youtubeTokenExpiry;
    }

    const merged: SyncConfig = {
      ...local,
      youtubeOAuthClientId: oauthCleared
        ? (local.youtubeOAuthClientId || '')
        : (local.youtubeOAuthClientId ||
            vault.youtubeOAuthClientId ||
            remote.youtubeOAuthClientId ||
            ''),
      youtubeClientSecret: oauthCleared
        ? (local.youtubeClientSecret || '')
        : (local.youtubeClientSecret || vault.youtubeClientSecret || ''),
      youtubeRefreshToken: oauthCleared
        ? (local.youtubeRefreshToken || '')
        : (local.youtubeRefreshToken || vault.youtubeRefreshToken || ''),
      youtubeAccessToken: bestAccessToken,
      youtubeTokenExpiry: bestTokenExpiry,
      youtubeUserEmail: oauthCleared
        ? (local.youtubeUserEmail || '')
        : (local.youtubeUserEmail ||
            vault.youtubeUserEmail ||
            remote.youtubeUserEmail ||
            ''),
      youtubeApiKey: local.youtubeApiKey || vault.youtubeApiKey || '',
      youtubePlaylistId:
        local.youtubePlaylistId ||
        remote.youtubePlaylistId ||
        'UUdOuEvwdKc0qr7_hxGF9_gA',
      youtubeChannelId:
        local.youtubeChannelId ||
        remote.youtubeChannelId ||
        'UCdOuEvwdKc0qr7_hxGF9_gA',
      githubToken: local.githubToken || vault.githubToken || '',
      githubOwner: local.githubOwner || remote.githubOwner || 'goliathappli',
      githubRepo: local.githubRepo || remote.githubRepo || 'Vid-o-saulchoir',
      githubBranch: local.githubBranch || remote.githubBranch || 'main',
      githubFilePath:
        local.githubFilePath || remote.githubFilePath || 'data/videos.json',
      autoSyncEnabled: true,
      autoSyncIntervalMinutes:
        local.autoSyncIntervalMinutes || remote.autoSyncIntervalMinutes || 2,
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

  // Admin authentication check (persisted in localStorage so connection stays permanent)
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
