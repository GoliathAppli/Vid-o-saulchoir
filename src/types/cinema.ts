/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface VideoItem {
  id: string; // YouTube Video ID
  title: string;
  description: string;
  publishedAt: string; // ISO 8601 string (e.g., 2026-09-20T18:00:00Z)
  thumbnailUrl: string;
  youtubeUrl: string;
  isUnlisted: boolean;
  duration?: string; // e.g. "14:35"
  director?: string; // e.g. "Atelier Saulchoir", "Jean-Luc M."
  genre?: 'Court-métrage' | 'Documentaire' | 'Atelier & Exercice' | 'Cinéma expérimental' | 'Masterclass & Rencontre' | string;
  tags?: string[];
  synopsis?: string;
  technicalNotes?: string; // e.g. "Format 1.85:1 · Prise de son direct · 4K"
  featuredOverride?: boolean; // Admin can pin if needed, else latest publishedAt is used
}

export interface SyncConfig {
  // YouTube OAuth 2.0 & API
  youtubeOAuthClientId?: string; // e.g. "123456789-xxxx.apps.googleusercontent.com"
  youtubeAccessToken?: string; // OAuth 2.0 Bearer token
  youtubeApiKey: string;
  youtubePlaylistId: string; // Optional if using OAuth (defaults to channel's uploads playlist)
  youtubeChannelId?: string;

  // GitHub Repository
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubFilePath: string; // e.g. "data/videos.json"

  // Automation
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number; // e.g. 30
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncMessage?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  source: 'youtube' | 'github' | 'system';
  status: 'success' | 'error' | 'warning' | 'info';
  message: string;
  itemCount?: number;
}

export interface MonthGroup {
  monthIndex: number; // 0 to 11
  monthName: string;
  videos: VideoItem[];
}

export interface YearGroup {
  year: number;
  months: MonthGroup[];
  totalVideos: number;
}
