/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig } from '../types/cinema';

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already clean 11 character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex matching various YouTube URL patterns (including Shorts and live)
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Extracts the playlist ID (e.g. "PLc1MoYNc9HeM") from either a full YouTube URL
 * like "https://youtube.com/playlist?list=PLc1MoYNc9HeM&si=..." or a raw ID.
 */
export function extractPlaylistId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();

  // Check if there is a list= parameter in a URL
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listMatch && listMatch[1]) {
    return listMatch[1];
  }

  // If user pasted something like "PLc1MoYNc9HeM&si=..." without the full URL
  if (trimmed.includes('&')) {
    return trimmed.split('&')[0].replace(/^list=/i, '');
  }

  return trimmed.replace(/^list=/i, '');
}

export function formatDurationISO(isoDuration?: string): string {
  if (!isoDuration) return '10:00';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '10:00';

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hint?: string;
            prompt?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string; hint?: string }) => void };
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: 'popup' | 'redirect';
            select_account?: boolean;
            callback: (response: {
              code?: string;
              error?: string;
              error_description?: string;
            }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

async function waitForGoogleOAuthScript(timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      return true;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  return Boolean(typeof window !== 'undefined' && window.google?.accounts?.oauth2);
}

export const youtubeService = {
  /**
   * Opens the Google OAuth 2.0 popup.
   * - If clientSecret is provided, uses Authorization Code flow to obtain a PERMANENT refresh_token
   *   that never expires and renews automatically in the background 24/7.
   * - Otherwise uses Token Client flow and also records token expiry & user email for silent renewal.
   */
  async connectOAuthPermanent(
    clientId: string,
    clientSecret?: string,
    existingHint?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: number;
    userEmail?: string;
  }> {
    const cleanClientId = clientId.trim();
    const cleanSecret = (clientSecret || '').trim();
    if (!cleanClientId) {
      throw new Error(
        'Veuillez renseigner votre ID Client OAuth Google (ex: xxxx.apps.googleusercontent.com).'
      );
    }

    const ready = await waitForGoogleOAuthScript(5000);
    if (!ready || !window.google?.accounts?.oauth2) {
      throw new Error(
        'Le module Google OAuth est en cours de chargement. Réessayez dans une seconde.'
      );
    }

    // 1. If Client Secret is provided, get a permanent Refresh Token via Code Client
    if (cleanSecret && window.google.accounts.oauth2.initCodeClient) {
      try {
        const code = await new Promise<string>((resolve, reject) => {
          const codeClient = window.google!.accounts!.oauth2!.initCodeClient({
            client_id: cleanClientId,
            scope: 'https://www.googleapis.com/auth/youtube.readonly email profile',
            ux_mode: 'popup',
            select_account: false,
            callback: response => {
              if (response.error) {
                reject(new Error(response.error_description || response.error));
              } else if (response.code) {
                resolve(response.code);
              } else {
                reject(new Error('Aucun code OAuth reçu de Google.'));
              }
            },
            error_callback: err => {
              reject(new Error(err?.message || 'Fenêtre OAuth fermée ou bloquée.'));
            },
          });
          codeClient.requestCode();
        });

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: cleanClientId,
            client_secret: cleanSecret,
            redirect_uri: 'postmessage',
            grant_type: 'authorization_code',
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            const expiresInSec = Number(tokenData.expires_in) || 3599;
            const userEmail = await this.fetchAuthenticatedUserEmail(tokenData.access_token);
            return {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token || undefined,
              tokenExpiry: Date.now() + expiresInSec * 1000,
              userEmail,
            };
          }
        }
      } catch (e) {
        console.warn('Fallback vers TokenClient OAuth standard :', e);
      }
    }

    // 2. Standard Token Client flow (without requiring Client Secret)
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
          client_id: cleanClientId,
          scope: 'https://www.googleapis.com/auth/youtube.readonly email profile',
          hint: existingHint || undefined,
          callback: async response => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else if (response.access_token) {
              const expiresInSec = Number(response.expires_in) || 3599;
              const userEmail = await this.fetchAuthenticatedUserEmail(response.access_token);
              resolve({
                accessToken: response.access_token,
                tokenExpiry: Date.now() + expiresInSec * 1000,
                userEmail,
              });
            } else {
              reject(new Error('Aucun jeton OAuth reçu de Google.'));
            }
          },
          error_callback: err => {
            reject(new Error(err?.message || 'La fenêtre de connexion Google a été fermée.'));
          },
        });

        // Do NOT force 'consent' every time (which causes repeated blocking screens);
        // use empty prompt if hint exists, or select_account once
        tokenClient.requestAccessToken({
          prompt: existingHint ? '' : 'select_account',
          hint: existingHint || undefined,
        });
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error("Erreur lors de l'initialisation OAuth 2.0")
        );
      }
    });
  },

  /**
   * Backwards-compatible wrapper that returns the access token string
   */
  async requestOAuthAccessToken(clientId: string): Promise<string> {
    const res = await this.connectOAuthPermanent(clientId);
    return res.accessToken;
  },

  /**
   * Fetches the user's Google email so future silent token renewals (prompt: '') work seamlessly
   */
  async fetchAuthenticatedUserEmail(accessToken: string): Promise<string | undefined> {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken.trim()}` },
      });
      if (!res.ok) return undefined;
      const data = await res.json();
      return data.email || undefined;
    } catch {
      return undefined;
    }
  },

  /**
   * Silently refreshes the OAuth Access Token in the background:
   * 1. Via permanent Refresh Token + Client Secret if available (100% automatic, never expires)
   * 2. Or via Google Identity Services silent token renewal (prompt: '')
   */
  async ensureValidAccessToken(config: SyncConfig): Promise<{
    accessToken: string;
    tokenExpiry?: number;
    refreshed: boolean;
  }> {
    const now = Date.now();
    const currentToken = (config.youtubeAccessToken || '').trim();
    const expiry = config.youtubeTokenExpiry || 0;

    // If current token is still valid for at least 3 minutes, verify or use it directly
    if (currentToken && expiry > now + 3 * 60 * 1000) {
      return { accessToken: currentToken, tokenExpiry: expiry, refreshed: false };
    }

    // If we have a current token without a known expiry, test if it still works on YouTube API
    if (currentToken && !expiry) {
      try {
        const testRes = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
          {
            headers: { Authorization: `Bearer ${currentToken}` },
          }
        );
        if (testRes.ok) {
          const newExpiry = now + 30 * 60 * 1000;
          return { accessToken: currentToken, tokenExpiry: newExpiry, refreshed: false };
        }
      } catch {
        // Proceed to refresh
      }
    }

    // Method 1: Permanent Refresh Token exchange (works 24/7 on any computer without any popup)
    const clientId = (config.youtubeOAuthClientId || '').trim();
    const clientSecret = (config.youtubeClientSecret || '').trim();
    const refreshToken = (config.youtubeRefreshToken || '').trim();

    if (clientId && clientSecret && refreshToken) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            const expiresInSec = Number(data.expires_in) || 3599;
            return {
              accessToken: data.access_token,
              tokenExpiry: Date.now() + expiresInSec * 1000,
              refreshed: true,
            };
          }
        }
      } catch (e) {
        console.warn('Échec du rafraîchissement via refresh_token :', e);
      }
    }

    // Method 2: Silent Google Identity Services renewal (prompt: '')
    if (clientId) {
      const scriptReady = await waitForGoogleOAuthScript(3500);
      if (scriptReady && window.google?.accounts?.oauth2) {
        try {
          const silentToken = await new Promise<{ token: string; expiry: number } | null>(
            resolve => {
              const timeout = setTimeout(() => resolve(null), 6000);
              try {
                const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
                  client_id: clientId,
                  scope: 'https://www.googleapis.com/auth/youtube.readonly',
                  hint: config.youtubeUserEmail || undefined,
                  prompt: '',
                  callback: response => {
                    clearTimeout(timeout);
                    if (response.access_token) {
                      const exp = Date.now() + (Number(response.expires_in) || 3599) * 1000;
                      resolve({ token: response.access_token, expiry: exp });
                    } else {
                      resolve(null);
                    }
                  },
                  error_callback: () => {
                    clearTimeout(timeout);
                    resolve(null);
                  },
                });
                tokenClient.requestAccessToken({
                  prompt: '',
                  hint: config.youtubeUserEmail || undefined,
                });
              } catch {
                clearTimeout(timeout);
                resolve(null);
              }
            }
          );

          if (silentToken?.token) {
            return {
              accessToken: silentToken.token,
              tokenExpiry: silentToken.expiry,
              refreshed: true,
            };
          }
        } catch {
          // Ignore silent error
        }
      }
    }

    return { accessToken: currentToken, tokenExpiry: expiry, refreshed: false };
  },

  /**
   * Resolves the authenticated YouTube channel's "uploads" playlist ID via OAuth 2.0
   */
  async getAuthenticatedUploadsPlaylistId(accessToken: string): Promise<{
    uploadsPlaylistId: string;
    channelTitle: string;
  }> {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken.trim()}`,
        },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erreur OAuth YouTube HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('Aucune chaîne YouTube associée à ce compte Google.');
    }

    const channel = data.items[0];
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) {
      throw new Error('Impossible de récupérer la playlist des mises en ligne de la chaîne.');
    }

    return {
      uploadsPlaylistId,
      channelTitle: channel.snippet?.title || 'Chaîne YouTube',
    };
  },

  /**
   * Test API connectivity with OAuth Access Token, Playlist ID, and/or API Key
   */
  async testConnection(apiKey: string, playlistId?: string, accessToken?: string): Promise<{
    success: boolean;
    message: string;
    itemCount?: number;
    title?: string;
    resolvedPlaylistId?: string;
  }> {
    if (!apiKey && !accessToken) {
      return {
        success: false,
        message: 'Veuillez connecter votre compte via OAuth 2.0 (ou renseigner un jeton / clé API).',
      };
    }

    try {
      let cleanPlaylistId = playlistId ? extractPlaylistId(playlistId) : '';

      // If OAuth token is provided and no playlist ID is set, test via the channel's own uploads playlist
      if (!cleanPlaylistId && accessToken) {
        const channelInfo = await this.getAuthenticatedUploadsPlaylistId(accessToken);
        cleanPlaylistId = channelInfo.uploadsPlaylistId;
      }

      if (cleanPlaylistId) {
        let url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(cleanPlaylistId)}`;
        if (apiKey) url += `&key=${encodeURIComponent(apiKey.trim())}`;

        const headers: HeadersInit = {};
        if (accessToken) headers['Authorization'] = `Bearer ${accessToken.trim()}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Erreur HTTP ${res.status}`);
        }

        const data = await res.json();
        if (!data.items || data.items.length === 0) {
          return {
            success: false,
            message: `Playlist "${cleanPlaylistId}" introuvable ou privée sans autorisation.`,
          };
        }

        const pl = data.items[0];
        return {
          success: true,
          message: `Connexion établie avec "${pl.snippet.title}" (${pl.contentDetails?.itemCount ?? 0} vidéo(s)).`,
          title: pl.snippet.title,
          itemCount: pl.contentDetails?.itemCount ?? 0,
          resolvedPlaylistId: cleanPlaylistId,
        };
      } else {
        // Test with simple popular search or channel query to verify key
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Clé d'API invalide (${res.status})`);
        }
        return {
          success: true,
          message: 'Clé d\'API YouTube validée avec succès.',
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue de connexion à l\'API YouTube';
      return {
        success: false,
        message: `Échec de connexion : ${msg}`,
      };
    }
  },

  /**
   * Fetch a single video's metadata by ID
   */
  async fetchVideoDetails(videoId: string, apiKey: string, accessToken?: string): Promise<Partial<VideoItem> | null> {
    try {
      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`;
      if (apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

      const headers: HeadersInit = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const res = await fetch(url, { headers });
      if (!res.ok) return null;

      const data = await res.json();
      if (!data.items || data.items.length === 0) return null;

      const item = data.items[0];
      const snippet = item.snippet;
      const contentDetails = item.contentDetails;
      const status = item.status;

      const isUnlisted = status?.privacyStatus === 'unlisted';
      const duration = formatDurationISO(contentDetails?.duration);
      const thumbnail =
        snippet.thumbnails?.maxres?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      return {
        id: videoId,
        title: snippet.title,
        description: snippet.description,
        publishedAt: snippet.publishedAt,
        thumbnailUrl: thumbnail,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        isUnlisted,
        duration,
        tags: snippet.tags || ['Atelier', 'Saulchoir'],
        director: snippet.channelTitle || 'Atelier Cinéma du Saulchoir',
      };
    } catch (e) {
      console.error('Erreur fetchVideoDetails', e);
      return null;
    }
  },

  /**
   * Fetch all videos from an unlisted or public playlist
   * This is the standard way to retrieve unlisted videos without full manager OAuth!
   */
  async fetchPlaylistVideos(
    playlistId: string,
    apiKey: string,
    accessToken?: string
  ): Promise<VideoItem[]> {
    let cleanPlaylistId = extractPlaylistId(playlistId);

    // If no playlistId was entered, resolve the authenticated YouTube channel's uploads playlist via OAuth
    if (!cleanPlaylistId && accessToken) {
      const channelInfo = await this.getAuthenticatedUploadsPlaylistId(accessToken);
      cleanPlaylistId = channelInfo.uploadsPlaylistId;
    }

    if (!cleanPlaylistId) {
      throw new Error('Identifiant de playlist YouTube manquant ou connexion OAuth non effectuée.');
    }

    const videos: VideoItem[] = [];
    let pageToken = '';

    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken.trim()}`;

    try {
      do {
        let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&playlistId=${encodeURIComponent(cleanPlaylistId)}&maxResults=50`;
        if (apiKey) url += `&key=${encodeURIComponent(apiKey.trim())}`;
        if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

        const res = await fetch(url, { headers, cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Erreur YouTube HTTP ${res.status}`);
        }

        const data = await res.json();
        const items = data.items || [];

        for (const item of items) {
          const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          if (!vidId) continue;

          const snippet = item.snippet;
          const status = item.status;

          // Skip deleted or inaccessible private videos in playlist
          if (
            snippet?.title === 'Deleted video' ||
            snippet?.title === 'Private video' ||
            status?.privacyStatus === 'private'
          ) {
            continue;
          }

          const isUnlisted = status?.privacyStatus === 'unlisted';

          const thumb =
            snippet.thumbnails?.maxres?.url ||
            snippet.thumbnails?.standard?.url ||
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.medium?.url ||
            `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;

          videos.push({
            id: vidId,
            title: snippet.title || 'Sans titre',
            description: snippet.description || '',
            synopsis: snippet.description ? snippet.description.slice(0, 350) : undefined,
            publishedAt: item.contentDetails?.videoPublishedAt || snippet.publishedAt || new Date().toISOString(),
            thumbnailUrl: thumb,
            youtubeUrl: `https://www.youtube.com/watch?v=${vidId}`,
            isUnlisted: isUnlisted,
            duration: '12:00', // default, enriched below
            director: snippet.videoOwnerChannelTitle || snippet.channelTitle || 'Atelier Cinéma du Saulchoir',
            genre: "Vidéos d'atelier",
            tags: ['Atelier', 'Saulchoir', isUnlisted ? 'Non répertorié' : 'Public'],
          });
        }

        pageToken = data.nextPageToken || '';
      } while (pageToken);

      // Also query forMine=true when OAuth accessToken is available so newly uploaded unlisted videos & Shorts appear immediately
      if (accessToken) {
        try {
          const seenIds = new Set(videos.map(v => v.id));
          const mineUrl =
            'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&order=date';
          const mineRes = await fetch(mineUrl, { headers, cache: 'no-store' });
          if (mineRes.ok) {
            const mineData = await mineRes.json();
            for (const item of mineData.items || []) {
              const vidId = item.id?.videoId;
              if (!vidId || seenIds.has(vidId)) continue;
              const snippet = item.snippet || {};
              if (snippet.title === 'Deleted video' || snippet.title === 'Private video') continue;
              seenIds.add(vidId);
              const thumb =
                snippet.thumbnails?.maxres?.url ||
                snippet.thumbnails?.standard?.url ||
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`;
              videos.push({
                id: vidId,
                title: snippet.title || 'Sans titre',
                description: snippet.description || '',
                synopsis: snippet.description ? snippet.description.slice(0, 350) : undefined,
                publishedAt: snippet.publishedAt || new Date().toISOString(),
                thumbnailUrl: thumb,
                youtubeUrl: `https://www.youtube.com/watch?v=${vidId}`,
                isUnlisted: true,
                duration: '12:00',
                director: snippet.channelTitle || 'Atelier Cinéma du Saulchoir',
                genre: "Vidéos d'atelier",
                tags: ['Atelier', 'Saulchoir', 'Non répertorié'],
              });
            }
          }
        } catch {
          // non-blocking
        }
      }

      // Now attempt to fetch durations and privacy status for these items in batches of 50 (works with OAuth token or API key)
      if ((apiKey || accessToken) && videos.length > 0) {
        try {
          const privateIds = new Set<string>();
          for (let i = 0; i < videos.length; i += 50) {
            const batch = videos.slice(i, i + 50);
            const ids = batch.map(v => v.id).join(',');
            let durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${ids}`;
            if (apiKey) durUrl += `&key=${encodeURIComponent(apiKey.trim())}`;
            const durRes = await fetch(durUrl, { headers, cache: 'no-store' });
            if (durRes.ok) {
              const durData = await durRes.json();
              const durMap = new Map<string, { duration: string; isUnlisted: boolean; isPrivate: boolean }>();
              for (const it of durData.items || []) {
                durMap.set(it.id, {
                  duration: formatDurationISO(it.contentDetails?.duration),
                  isUnlisted: it.status?.privacyStatus === 'unlisted',
                  isPrivate: it.status?.privacyStatus === 'private',
                });
              }
              for (const v of batch) {
                const info = durMap.get(v.id);
                if (info) {
                  if (info.isPrivate) {
                    privateIds.add(v.id);
                  } else {
                    v.duration = info.duration;
                    v.isUnlisted = info.isUnlisted;
                  }
                }
              }
            }
          }
          if (privateIds.size > 0) {
            return videos.filter(v => !privateIds.has(v.id));
          }
        } catch {
          // non-blocking
        }
      }

      return videos;
    } catch (err: unknown) {
      console.error('Erreur fetchPlaylistVideos', err);
      throw err;
    }
  },
};
