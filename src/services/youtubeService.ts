/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem } from '../types/cinema';

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

export const youtubeService = {
  /**
   * Test API connectivity with Key and/or Playlist ID
   */
  async testConnection(apiKey: string, playlistId?: string, accessToken?: string): Promise<{
    success: boolean;
    message: string;
    itemCount?: number;
    title?: string;
  }> {
    if (!apiKey && !accessToken) {
      return {
        success: false,
        message: 'Aucune clé d\'API YouTube ni jeton d\'accès renseigné.',
      };
    }

    try {
      const cleanPlaylistId = playlistId ? extractPlaylistId(playlistId) : '';
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
          message: `Connexion établie avec la playlist "${pl.snippet.title}" (${pl.contentDetails?.itemCount ?? 0} vidéo(s)).`,
          title: pl.snippet.title,
          itemCount: pl.contentDetails?.itemCount ?? 0,
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
    const cleanPlaylistId = extractPlaylistId(playlistId);
    if (!cleanPlaylistId) {
      throw new Error('Identifiant de playlist YouTube manquant ou invalide.');
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
            genre: 'Court-métrage',
            tags: ['Atelier', 'Saulchoir', isUnlisted ? 'Non répertorié' : 'Public'],
          });
        }

        pageToken = data.nextPageToken || '';
      } while (pageToken);

      // Now attempt to fetch durations for these items in batches of 50
      if (apiKey && videos.length > 0) {
        try {
          for (let i = 0; i < videos.length; i += 50) {
            const batch = videos.slice(i, i + 50);
            const ids = batch.map(v => v.id).join(',');
            const durUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${ids}&key=${encodeURIComponent(apiKey.trim())}`;
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
    } catch (err: unknown) {
      console.error('Erreur fetchPlaylistVideos', err);
      throw err;
    }
  },
};
