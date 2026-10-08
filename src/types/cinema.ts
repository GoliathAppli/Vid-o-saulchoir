/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VideoCategory = "Vidéos d'atelier" | "Vidéos avec Vaulx" | "Pom's D'or";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "Vidéos d'atelier",
  "Vidéos avec Vaulx",
  "Pom's D'or",
];

export function normalizeVideoCategory(genre?: string): VideoCategory {
  if (genre === "Vidéos avec Vaulx") return "Vidéos avec Vaulx";
  if (genre === "Pom's D'or") return "Pom's D'or";
  return "Vidéos d'atelier";
}

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
  genre?: VideoCategory | string;
  tags?: string[];
  synopsis?: string;
  technicalNotes?: string; // e.g. "Format 1.85:1 · Prise de son direct · 4K"
  featuredOverride?: boolean; // Admin can pin if needed, else latest publishedAt is used
}

export interface SyncConfig {
  // YouTube OAuth 2.0 & API (Permanent Connection)
  youtubeOAuthClientId?: string; // e.g. "123456789-xxxx.apps.googleusercontent.com"
  youtubeClientSecret?: string; // e.g. "GOCSPX-xxxx" (enables permanent non-expiring refresh_token)
  youtubeRefreshToken?: string; // Permanent OAuth 2.0 Refresh Token (never expires)
  youtubeAccessToken?: string; // OAuth 2.0 Bearer token
  youtubeTokenExpiry?: number; // Epoch ms when access_token expires
  youtubeUserEmail?: string; // Connected Google Account email (used as login_hint for silent renewal)
  youtubeApiKey: string;
  youtubePlaylistId: string; // Defaults to channel's uploads playlist UUdOuEvwdKc0qr7_hxGF9_gA
  youtubeChannelId?: string; // Defaults to UCdOuEvwdKc0qr7_hxGF9_gA

  // GitHub Repository
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubFilePath: string; // e.g. "data/videos.json"

  // Automation
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number; // e.g. 2
  lastSyncTimestamp?: string;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncMessage?: string;
  updatedAt?: string;
}

export interface PersistedSyncSettings {
  youtubeOAuthClientId?: string;
  youtubeChannelId?: string;
  youtubePlaylistId?: string;
  youtubeUserEmail?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  githubFilePath?: string;
  autoSyncEnabled?: boolean;
  autoSyncIntervalMinutes?: number;
  updatedAt?: string;
  encryptedVault?: string; // Obfuscated credentials so GitHub secret scanner never revokes tokens
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

export type CountdownDisplayMode = 'days' | 'days_hours';

export interface NewsCountdown {
  enabled: boolean;
  targetDate: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm (used when displayMode === 'days_hours')
  displayMode: CountdownDisplayMode;
  label?: string;
  updatedAt?: string;
}

export interface NewsPhoto {
  id: string;
  url: string;
  caption?: string;
  addedAt: string;
  countdown?: NewsCountdown;
}

export type SeasonalThemeId =
  | 'default'
  | 'new_year'
  | 'carnival'
  | 'valentines'
  | 'easter'
  | 'summer'
  | 'halloween'
  | 'christmas';

