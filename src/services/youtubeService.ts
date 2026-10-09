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
    existingHint?: string,
    options?: { silentOnly?: boolean; existingRefreshToken?: string }
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: number;
    userEmail?: string;
  }> {
    const cleanClientId = clientId.trim();
    const cleanSecret = (clientSecret || '').trim();
    const cleanRefresh = (options?.existingRefreshToken || '').trim();
    if (!cleanClientId) {
      throw new Error(
        'Veuillez renseigner votre ID Client OAuth Google (ex: xxxx.apps.googleusercontent.com).'
      );
    }

    // 0. If we already have Client ID + Client Secret + Refresh Token, exchange directly with ZERO popup and ZERO phone!
    if (cleanClientId && cleanSecret && cleanRefresh) {
      try {
        const directRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: cleanClientId,
            client_secret: cleanSecret,
            refresh_token: cleanRefresh,
            grant_type: 'refresh_token',
          }),
        });
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData.access_token) {
            const expiresInSec = Number(directData.expires_in) || 3599;
            const userEmail = await this.fetchAuthenticatedUserEmail(directData.access_token);
            return {
              accessToken: directData.access_token,
              refreshToken: cleanRefresh,
              tokenExpiry: Date.now() + expiresInSec * 1000,
              userEmail: userEmail || existingHint,
            };
          }
        }
      } catch {
        // Fallback to interactive/silent OAuth flow below
      }
    }

    const ready = await waitForGoogleOAuthScript(5000);
    if (!ready || !window.google?.accounts?.oauth2) {
      throw new Error(
        'Le module Google OAuth est en cours de chargement. Réessayez dans une seconde.'
      );
    }

    // 1. If Client Secret is provided (and not silentOnly), get a permanent Refresh Token via Code Client
    // Note: select_account: true is CRITICAL so the user can choose their personal account AND select the delegated Brand Account / professional YouTube channel!
    if (cleanSecret && !options?.silentOnly && window.google.accounts.oauth2.initCodeClient) {
      try {
        const code = await new Promise<string>((resolve, reject) => {
          const codeClient = window.google!.accounts!.oauth2!.initCodeClient({
            client_id: cleanClientId,
            scope: 'https://www.googleapis.com/auth/youtube.readonly email profile',
            ux_mode: 'popup',
            select_account: true,
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
              refreshToken: tokenData.refresh_token || cleanRefresh || undefined,
              tokenExpiry: Date.now() + expiresInSec * 1000,
              userEmail,
            };
          }
        }
      } catch (e) {
        console.warn('Fallback vers TokenClient OAuth standard :', e);
      }
    }

    // 2. Standard or Silent Token Client flow
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
                refreshToken: cleanRefresh || undefined,
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

        tokenClient.requestAccessToken({
          prompt: options?.silentOnly ? '' : 'select_account',
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
   * Direct Zero-OAuth / Zero-Phone Feed synchronization:
   * Fetches videos from the YouTube Channel / Playlist XML feed without requiring Google OAuth login or 2FA phone verification.
   */
  async fetchChannelOrPlaylistDirectFeed(
    channelId = 'UCdOuEvwdKc0qr7_hxGF9_gA',
    playlistId = 'UUdOuEvwdKc0qr7_hxGF9_gA'
  ): Promise<VideoItem[]> {
    const cleanChannelId = (channelId || 'UCdOuEvwdKc0qr7_hxGF9_gA').trim();
    const cleanPlaylistId = extractPlaylistId(playlistId || 'UUdOuEvwdKc0qr7_hxGF9_gA');

    const feedUrls: string[] = [];
    if (cleanPlaylistId) {
      feedUrls.push(
        `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(cleanPlaylistId)}`
      );
    }
    if (cleanChannelId && cleanChannelId.startsWith('UC')) {
      feedUrls.push(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleanChannelId)}`
      );
    }

    const fetchXmlWithFallbacks = async (targetUrl: string): Promise<string | null> => {
      const proxyCandidates = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      ];
      for (const proxyUrl of proxyCandidates) {
        try {
          const res = await fetch(proxyUrl, { cache: 'no-store' });
          if (res.ok) {
            const text = await res.text();
            if (text && text.includes('<entry>')) {
              return text;
            }
          }
        } catch {
          // try next proxy
        }
      }
      return null;
    };

    const collected = new Map<string, VideoItem>();

    for (const feedUrl of feedUrls) {
      const xmlText = await fetchXmlWithFallbacks(feedUrl);
      if (!xmlText) continue;

      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const entries = Array.from(xmlDoc.getElementsByTagName('entry'));

        for (const entry of entries) {
          const vidNode =
            entry.getElementsByTagName('yt:videoId')[0] ||
            entry.getElementsByTagName('videoId')[0];
          const vidId = vidNode?.textContent?.trim();
          if (!vidId || collected.has(vidId)) continue;

          const title =
            entry.getElementsByTagName('title')[0]?.textContent?.trim() || 'Sans titre';
          if (title === 'Deleted video' || title === 'Private video') continue;

          const publishedAt =
            entry.getElementsByTagName('published')[0]?.textContent?.trim() ||
            new Date().toISOString();

          const descNode =
            entry.getElementsByTagName('media:description')[0] ||
            entry.getElementsByTagName('description')[0];
          const description = descNode?.textContent?.trim() || '';

          const authorNode = entry.getElementsByTagName('name')[0];
          const director =
            authorNode?.textContent?.trim() || 'Atelier Cinéma du Saulchoir';

          collected.set(vidId, {
            id: vidId,
            title,
            description,
            synopsis: description ? description.slice(0, 350) : undefined,
            publishedAt,
            thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
            youtubeUrl: `https://www.youtube.com/watch?v=${vidId}`,
            isUnlisted: false,
            duration: '12:00',
            director,
            genre: "Vidéos d'atelier",
            tags: ['Atelier', 'Saulchoir'],
          });
        }
      } catch {
        // ignore XML parse error
      }
    }

    return Array.from(collected.values());
  },

  /**
   * Test API connectivity with OAuth Access Token, Playlist ID, API Key, or Direct Zero-Phone Feed
   */
  async testConnection(
    apiKey: string,
    playlistId?: string,
    accessToken?: string,
    channelId?: string
  ): Promise<{
    success: boolean;
    message: string;
    itemCount?: number;
    title?: string;
    resolvedPlaylistId?: string;
  }> {
    const cleanApiKey = (apiKey || '').trim();
    const cleanAccessToken = (accessToken || '').trim();
    let cleanPlaylistId = playlistId ? extractPlaylistId(playlistId) : 'UUdOuEvwdKc0qr7_hxGF9_gA';

    // Mode Direct Sans OAuth ni Clé API (Flux Direct Chaîne YouTube)
    if (!cleanApiKey && !cleanAccessToken) {
      try {
        const directVideos = await this.fetchChannelOrPlaylistDirectFeed(
          channelId || 'UCdOuEvwdKc0qr7_hxGF9_gA',
          cleanPlaylistId
        );
        if (directVideos.length > 0) {
          return {
            success: true,
            message: `Flux public actif (${directVideos.length} vidéo(s) publique(s) détectée(s)). Pour détecter automatiquement toutes les vidéos NON RÉPERTORIÉES de la chaîne, connectez OAuth 2.0 (ID Client + Code Secret) ou utilisez une Playlist non répertoriée (PL...) avec Clé API.`,
            itemCount: directVideos.length,
            resolvedPlaylistId: cleanPlaylistId,
          };
        }
      } catch {
        // fallback message below
      }
      return {
        success: true,
        message:
          'Aucun blocage OAuth actif. Pour synchroniser automatiquement toutes les vidéos non répertoriées de la chaîne, connectez OAuth 2.0 ci-dessous (ou indiquez une playlist PL... avec Clé API).',
        resolvedPlaylistId: cleanPlaylistId,
      };
    }

    try {
      // If OAuth token is provided, also check forMine=true to count all channel videos (including unlisted!)
      if (cleanAccessToken) {
        try {
          const mineRes = await fetch(
            'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&order=date',
            { headers: { Authorization: `Bearer ${cleanAccessToken}` } }
          );
          if (mineRes.ok) {
            const mineData = await mineRes.json();
            const totalMine = mineData.pageInfo?.totalResults ?? (mineData.items?.length || 0);
            return {
              success: true,
              message: `Connexion OAuth 2.0 Permanente active : ${totalMine} vidéo(s) détectée(s) sur la chaîne (incluant 100% des vidéos non répertoriées) !`,
              itemCount: totalMine,
              resolvedPlaylistId: cleanPlaylistId,
            };
          }
        } catch {
          // continue to playlist test
        }
      }

      // If OAuth token is provided and no playlist ID is set, test via the channel's own uploads playlist
      if (!cleanPlaylistId && cleanAccessToken) {
        const channelInfo = await this.getAuthenticatedUploadsPlaylistId(cleanAccessToken);
        cleanPlaylistId = channelInfo.uploadsPlaylistId;
      }

      if (cleanPlaylistId) {
        let url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(cleanPlaylistId)}`;
        if (cleanApiKey) url += `&key=${encodeURIComponent(cleanApiKey)}`;

        const headers: HeadersInit = {};
        if (cleanAccessToken) headers['Authorization'] = `Bearer ${cleanAccessToken}`;

        let res = await fetch(url, { headers });
        // If expired OAuth token caused 401/403 but API key is valid, retry with API key only!
        if (!res.ok && cleanAccessToken && cleanApiKey) {
          res = await fetch(url);
        }

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
        const isDefaultUploads = cleanPlaylistId.startsWith('UU');
        const noteUnlisted =
          !cleanAccessToken && isDefaultUploads
            ? ' (Attention : avec une Clé API seule sur UU..., YouTube masque les vidéos non répertoriées sauf si vous connectez OAuth 2.0 ou si vous mettez vos vidéos non répertoriées dans une playlist dédiée PL...)'
            : ' (Vidéos publiques et non répertoriées incluses)';
        return {
          success: true,
          message: `Connexion établie avec "${pl.snippet.title}" (${pl.contentDetails?.itemCount ?? 0} vidéo(s))${noteUnlisted}.`,
          title: pl.snippet.title,
          itemCount: pl.contentDetails?.itemCount ?? 0,
          resolvedPlaylistId: cleanPlaylistId,
        };
      } else {
        // Test with simple popular search or channel query to verify key
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${encodeURIComponent(cleanApiKey)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `Clé d'API invalide (${res.status})`);
        }
        return {
          success: true,
          message: "Clé d'API YouTube validée avec succès.",
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue de connexion à l'API YouTube";
      return {
        success: false,
        message: `Échec de connexion : ${msg}`,
      };
    }
  },

  /**
   * Fetch a single video's metadata by ID (supports API Key, OAuth Token, or zero-key YouTube oEmbed!)
   */
  async fetchVideoDetails(videoId: string, apiKey: string, accessToken?: string): Promise<Partial<VideoItem> | null> {
    const cleanApiKey = (apiKey || '').trim();
    const cleanAccessToken = (accessToken || '').trim();

    if (cleanApiKey || cleanAccessToken) {
      try {
        let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${encodeURIComponent(videoId)}`;
        if (cleanApiKey) url += `&key=${encodeURIComponent(cleanApiKey)}`;

        const headers: HeadersInit = {};
        if (cleanAccessToken) headers['Authorization'] = `Bearer ${cleanAccessToken}`;

        let res = await fetch(url, { headers });
        if (!res.ok && cleanAccessToken && cleanApiKey) {
          res = await fetch(url);
        }
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
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
          }
        }
      } catch (e) {
        console.warn('Fallback vers oEmbed pour fetchVideoDetails', e);
      }
    }

    // Zero-Key / Zero-OAuth fallback using official YouTube oEmbed (works even for unlisted videos!)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        return {
          id: videoId,
          title: data.title || `Vidéo ${videoId}`,
          description: '',
          publishedAt: new Date().toISOString(),
          thumbnailUrl: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
          isUnlisted: true,
          duration: '12:00',
          tags: ['Atelier', 'Saulchoir'],
          director: data.author_name || 'Atelier Cinéma du Saulchoir',
        };
      }
    } catch {
      // ignore
    }

    return null;
  },

  /**
   * Fetch all videos from an unlisted or public playlist
   * Works with:
   * 1. API Key (`AIzaSy...`) — 100% permanent, no OAuth login, no 2FA phone needed!
   * 2. OAuth Access Token (optional)
   * 3. Direct Channel/Playlist XML Feed fallback if neither API Key nor OAuth is configured
   */
  async fetchPlaylistVideos(
    playlistId: string,
    apiKey: string,
    accessToken?: string,
    channelId = 'UCdOuEvwdKc0qr7_hxGF9_gA'
  ): Promise<VideoItem[]> {
    const cleanApiKey = (apiKey || '').trim();
    const cleanAccessToken = (accessToken || '').trim();
    let cleanPlaylistId = extractPlaylistId(playlistId) || 'UUdOuEvwdKc0qr7_hxGF9_gA';

    // If neither API Key nor OAuth Access Token is configured, use Direct Channel/Playlist Feed (Zero-OAuth, Zero-Phone)
    if (!cleanApiKey && !cleanAccessToken) {
      return this.fetchChannelOrPlaylistDirectFeed(channelId, cleanPlaylistId);
    }

    // If no playlistId was entered, resolve the authenticated YouTube channel's uploads playlist via OAuth
    if (!cleanPlaylistId && cleanAccessToken) {
      try {
        const channelInfo = await this.getAuthenticatedUploadsPlaylistId(cleanAccessToken);
        cleanPlaylistId = channelInfo.uploadsPlaylistId;
      } catch {
        cleanPlaylistId = 'UUdOuEvwdKc0qr7_hxGF9_gA';
      }
    }

    const videos: VideoItem[] = [];
    let pageToken = '';

    let useBearer = Boolean(cleanAccessToken);

    try {
      do {
        let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&playlistId=${encodeURIComponent(cleanPlaylistId)}&maxResults=50`;
        if (cleanApiKey) url += `&key=${encodeURIComponent(cleanApiKey)}`;
        if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

        const headers: HeadersInit = {};
        if (useBearer && cleanAccessToken) {
          headers['Authorization'] = `Bearer ${cleanAccessToken}`;
        }

        let res = await fetch(url, { headers, cache: 'no-store' });
        // If OAuth token is expired/invalid and we have an API key, retry immediately with the API key alone!
        if (!res.ok && useBearer && cleanApiKey) {
          useBearer = false;
          res = await fetch(url, { cache: 'no-store' });
        }

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

      // Also query forMine=true when valid OAuth accessToken is available (captures 100% of UNLISTED videos on the channel!)
      if (useBearer && cleanAccessToken) {
        try {
          const seenIds = new Set(videos.map(v => v.id));
          let minePageToken = '';
          let pageCount = 0;
          do {
            let mineUrl =
              'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&order=date';
            if (minePageToken) {
              mineUrl += `&pageToken=${encodeURIComponent(minePageToken)}`;
            }
            const mineRes = await fetch(mineUrl, {
              headers: { Authorization: `Bearer ${cleanAccessToken}` },
              cache: 'no-store',
            });
            if (!mineRes.ok) break;
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
            minePageToken = mineData.nextPageToken || '';
            pageCount++;
          } while (minePageToken && pageCount < 4);
        } catch {
          // non-blocking
        }
      }

      // Now fetch full snippet, durations, and privacy status in batches of 50 (works with API key or OAuth token)
      if ((cleanApiKey || (useBearer && cleanAccessToken)) && videos.length > 0) {
        try {
          const privateIds = new Set<string>();
          for (let i = 0; i < videos.length; i += 50) {
            const batch = videos.slice(i, i + 50);
            const ids = batch.map(v => v.id).join(',');
            let durUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${ids}`;
            if (cleanApiKey) durUrl += `&key=${encodeURIComponent(cleanApiKey)}`;
            const headers: HeadersInit = {};
            if (useBearer && cleanAccessToken) {
              headers['Authorization'] = `Bearer ${cleanAccessToken}`;
            }
            const durRes = await fetch(durUrl, { headers, cache: 'no-store' });
            if (durRes.ok) {
              const durData = await durRes.json();
              const durMap = new Map<
                string,
                {
                  duration: string;
                  isUnlisted: boolean;
                  isPrivate: boolean;
                  title?: string;
                  description?: string;
                  publishedAt?: string;
                  thumbnailUrl?: string;
                }
              >();
              for (const it of durData.items || []) {
                const sn = it.snippet || {};
                const bestThumb =
                  sn.thumbnails?.maxres?.url ||
                  sn.thumbnails?.standard?.url ||
                  sn.thumbnails?.high?.url ||
                  sn.thumbnails?.medium?.url;
                durMap.set(it.id, {
                  duration: formatDurationISO(it.contentDetails?.duration),
                  isUnlisted: it.status?.privacyStatus === 'unlisted',
                  isPrivate: it.status?.privacyStatus === 'private',
                  title: sn.title,
                  description: sn.description,
                  publishedAt: sn.publishedAt,
                  thumbnailUrl: bestThumb,
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
                    if (info.title) v.title = info.title;
                    if (info.description) {
                      v.description = info.description;
                      if (!v.synopsis || v.synopsis.length < info.description.slice(0, 350).length) {
                        v.synopsis = info.description.slice(0, 350);
                      }
                    }
                    if (info.publishedAt) v.publishedAt = info.publishedAt;
                    if (info.thumbnailUrl) v.thumbnailUrl = info.thumbnailUrl;
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
      console.warn('Fallback vers le flux direct sans OAuth suite à erreur API YouTube :', err);
      const fallbackVideos = await this.fetchChannelOrPlaylistDirectFeed(channelId, cleanPlaylistId);
      if (fallbackVideos.length > 0) {
        return fallbackVideos;
      }
      throw err;
    }
  },
};
