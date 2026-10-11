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

  // Regex matching various YouTube URL patterns
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
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
            prompt?: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode?: 'popup' | 'redirect';
            select_account?: boolean;
            prompt?: string;
            callback: (response: {
              code?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

export const youtubeService = {
  /**
   * Connects via Google OAuth 2.0.
   * - If clientSecret is provided: uses Authorization Code Flow (`initCodeClient`) and exchanges the code
   *   at https://oauth2.googleapis.com/token for a permanent `refresh_token` + `access_token` (24/7 permanent connection).
   * - If clientSecret is omitted: falls back to `initTokenClient` and obtains an `access_token`.
   */
  connectPermanentOAuth(
    clientId: string,
    clientSecret?: string
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  }> {
    return new Promise((resolve, reject) => {
      const cleanClientId = (clientId || '').trim();
      const cleanClientSecret = (clientSecret || '').trim();

      if (!cleanClientId) {
        reject(new Error('Veuillez renseigner votre ID Client OAuth Google (ex: xxxx.apps.googleusercontent.com).'));
        return;
      }

      if (!window.google?.accounts?.oauth2) {
        reject(new Error('Le module Google OAuth est en cours de chargement. Réessayez dans une seconde.'));
        return;
      }

      // If Client Secret is provided, use Code Flow to obtain a PERMANENT Refresh Token
      if (cleanClientSecret && window.google.accounts.oauth2.initCodeClient) {
        try {
          const codeClient = window.google.accounts.oauth2.initCodeClient({
            client_id: cleanClientId,
            scope: 'https://www.googleapis.com/auth/youtube.readonly',
            ux_mode: 'popup',
            select_account: true,
            prompt: 'consent',
            callback: async (response) => {
              if (response.error) {
                reject(new Error(response.error_description || response.error));
                return;
              }
              if (!response.code) {
                reject(new Error('Aucun code d\'autorisation OAuth reçu de Google.'));
                return;
              }
              try {
                const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({
                    client_id: cleanClientId,
                    client_secret: cleanClientSecret,
                    code: response.code,
                    grant_type: 'authorization_code',
                    redirect_uri: 'postmessage',
                  }),
                });
                const tokenData = await tokenRes.json().catch(() => ({}));
                if (!tokenRes.ok || !tokenData.access_token) {
                  throw new Error(
                    tokenData.error_description ||
                      tokenData.error ||
                      `Échec échange OAuth (vérifiez le Code secret du client)`
                  );
                }
                const expiresInSec = Number(tokenData.expires_in) || 3599;
                resolve({
                  accessToken: tokenData.access_token,
                  refreshToken: tokenData.refresh_token,
                  expiresAt: Date.now() + expiresInSec * 1000,
                });
              } catch (exchangeErr) {
                reject(
                  exchangeErr instanceof Error
                    ? exchangeErr
                    : new Error('Erreur lors de l\'obtention du Refresh Token permanent')
                );
              }
            },
          });

          codeClient.requestCode();
          return;
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Erreur lors de l\'initialisation OAuth Code Client'));
          return;
        }
      }

      // Fallback when only Client ID is provided (Token Client)
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: cleanClientId,
          scope: 'https://www.googleapis.com/auth/youtube.readonly',
          callback: (response) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else if (response.access_token) {
              const expiresInSec = Number(response.expires_in) || 3599;
              resolve({
                accessToken: response.access_token,
                expiresAt: Date.now() + expiresInSec * 1000,
              });
            } else {
              reject(new Error('Aucun jeton OAuth reçu de Google.'));
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Erreur lors de l\'initialisation OAuth 2.0'));
      }
    });
  },

  /**
   * Legacy wrapper for compatibility
   */
  async requestOAuthAccessToken(clientId: string, clientSecret?: string): Promise<string> {
    const res = await this.connectPermanentOAuth(clientId, clientSecret);
    return res.accessToken;
  },

  /**
   * Silently exchanges the permanent Refresh Token for a brand new OAuth 2.0 Access Token in the background (0 popup, 24/7)
   */
  async refreshOAuthAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt: number }> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        refresh_token: refreshToken.trim(),
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.error || `Échec du renouvellement OAuth (${res.status})`);
    }

    const expiresInSec = Number(data.expires_in) || 3599;
    return {
      accessToken: data.access_token,
      expiresAt: Date.now() + expiresInSec * 1000,
    };
  },

  /**
   * Ensures a valid, non-expired OAuth 2.0 Access Token is ready before calling YouTube.
   * Automatically renews in the background using the permanent Refresh Token if needed.
   */
  async ensureValidAccessToken(
    config: SyncConfig,
    forceRefresh = false
  ): Promise<{ accessToken: string; expiresAt?: number; refreshed: boolean }> {
    const hasRefreshSetup = Boolean(
      config.youtubeOAuthClientId?.trim() &&
        config.youtubeClientSecret?.trim() &&
        config.youtubeRefreshToken?.trim()
    );

    const isTokenStillFresh =
      !forceRefresh &&
      Boolean(config.youtubeAccessToken?.trim()) &&
      Boolean(config.youtubeTokenExpiresAt) &&
      Date.now() < (config.youtubeTokenExpiresAt || 0) - 5 * 60 * 1000;

    if (isTokenStillFresh && config.youtubeAccessToken) {
      return {
        accessToken: config.youtubeAccessToken,
        expiresAt: config.youtubeTokenExpiresAt,
        refreshed: false,
      };
    }

    if (hasRefreshSetup) {
      try {
        const renewed = await this.refreshOAuthAccessToken(
          config.youtubeOAuthClientId!,
          config.youtubeClientSecret!,
          config.youtubeRefreshToken!
        );
        return {
          accessToken: renewed.accessToken,
          expiresAt: renewed.expiresAt,
          refreshed: true,
        };
      } catch (e) {
        console.warn('Renouvellement silencieux OAuth échoué, utilisation du jeton existant', e);
      }
    }

    return {
      accessToken: config.youtubeAccessToken || '',
      expiresAt: config.youtubeTokenExpiresAt,
      refreshed: false,
    };
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
        if (!accessToken && apiKey) url += `&key=${encodeURIComponent(apiKey.trim())}`;

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
      const msg = err instanceof Error ? err.message : 'Erreur inconnue de connexion à YouTube';
      return {
        success: false,
        message: `Échec de connexion : ${msg}`,
      };
    }
  },

  /**
   * Detects if an error indicates the Google Cloud project owning the OAuth Client ID
   * has not toggled on the YouTube connector yet, and returns the direct 1-click activation URL.
   */
  extractProjectEnableUrl(errorMessage: string, clientId?: string): { projectId: string; url: string } | null {
    const urlMatch = errorMessage.match(
      /https:\/\/console\.developers\.google\.com\/apis\/api\/youtube\.googleapis\.com\/overview\?project=([0-9]+)/
    );
    if (urlMatch) {
      return {
        projectId: urlMatch[1],
        url: urlMatch[0],
      };
    }
    const projMatch = errorMessage.match(/project\s+([0-9]{6,})/i);
    if (projMatch) {
      return {
        projectId: projMatch[1],
        url: `https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=${projMatch[1]}`,
      };
    }
    if (clientId && /^[0-9]{6,}-/.test(clientId.trim())) {
      const pid = clientId.trim().split('-')[0];
      return {
        projectId: pid,
        url: `https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=${pid}`,
      };
    }
    return null;
  },

  /**
   * Fetch a single video's metadata by ID
   */
  async fetchVideoDetails(videoId: string, apiKey: string, accessToken?: string): Promise<Partial<VideoItem> | null> {
    try {
      let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`;
      if (!accessToken && apiKey) url += `&key=${encodeURIComponent(apiKey)}`;

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
    } catch {
      return null;
    }
  },

  /**
   * Fetch public channel/playlist RSS feed via CORS-safe proxy as a zero-API fallback
   */
  async fetchRssFallbackVideos(playlistOrChannelId: string): Promise<VideoItem[]> {
    try {
      const clean = playlistOrChannelId.trim();
      if (!clean) return [];
      const feedUrl = clean.startsWith('UC')
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(clean)}`
        : clean.startsWith('UU')
        ? `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent('UC' + clean.slice(2))}`
        : `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(clean)}`;

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return [];
      const xml = await res.text();
      if (!xml.includes('<entry>')) return [];

      const entries = xml.split('<entry>').slice(1);
      const items: VideoItem[] = [];
      for (const rawEntry of entries) {
        const entry = rawEntry.split('</entry>')[0] || '';
        const vidId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1]?.trim();
        if (!vidId) continue;
        const title = entry.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || 'Sans titre';
        const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() || new Date().toISOString();
        const author = entry.match(/<name>([^<]+)<\/name>/)?.[1]?.trim() || 'La Vie au Saulchoir De Bruyelle';
        const desc = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]?.trim() || '';

        items.push({
          id: vidId,
          title,
          description: desc,
          synopsis: desc ? desc.slice(0, 350) : undefined,
          publishedAt,
          thumbnailUrl: `https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${vidId}`,
          isUnlisted: false,
          duration: '02:00',
          director: author,
          genre: "Vidéos d'atelier",
          tags: ['Atelier', 'Saulchoir', 'Public'],
        });
      }
      return items;
    } catch {
      return [];
    }
  },

  /**
   * Fetch all videos from an unlisted or public playlist
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

    do {
      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&playlistId=${encodeURIComponent(cleanPlaylistId)}&maxResults=50`;
      if (!accessToken && apiKey) url += `&key=${encodeURIComponent(apiKey.trim())}`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

      const res = await fetch(url, { headers });
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

    // Now attempt to fetch durations for these items in batches of 50 (works with OAuth token or API key)
    if ((apiKey || accessToken) && videos.length > 0) {
      try {
        for (let i = 0; i < videos.length; i += 50) {
          const batch = videos.slice(i, i + 50);
          const ids = batch.map(v => v.id).join(',');
          let durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${ids}`;
          if (!accessToken && apiKey) durUrl += `&key=${encodeURIComponent(apiKey.trim())}`;
          const durRes = await fetch(durUrl, { headers });
          if (durRes.ok) {
            const durData = await durRes.json();
            const durMap = new Map<string, { duration: string; isUnlisted: boolean }>();
            for (const it of durData.items || []) {
              durMap.set(it.id, {
                duration: formatDurationISO(it.contentDetails?.duration),
                isUnlisted: it.status?.privacyStatus === 'unlisted',
              });
            }
            for (const v of batch) {
              const info = durMap.get(v.id);
              if (info) {
                v.duration = info.duration;
                v.isUnlisted = info.isUnlisted;
              }
            }
          }
        }
      } catch {
        // non-blocking
      }
    }

    return videos;
  },
};
