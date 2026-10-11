/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, NewsPhoto, NewsCountdown, SyncConfig } from '../types/cinema';

const VAULT_CIPHER_KEY = 'Saulchoir_Permanent_Vault_Key_2026_#93';

export function encryptVaultPayload(config: Partial<SyncConfig>): string {
  const json = JSON.stringify(config);
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(json);
  const keyBytes = encoder.encode(VAULT_CIPHER_KEY);
  let hex = '';
  for (let i = 0; i < dataBytes.length; i++) {
    const k = keyBytes[i % keyBytes.length];
    const salt = (i * 31 + 17) & 0xff;
    const enc = (dataBytes[i] ^ k ^ salt) & 0xff;
    hex += enc.toString(16).padStart(2, '0');
  }
  return hex;
}

export function decryptVaultPayload(hex: string): Partial<SyncConfig> | null {
  try {
    if (!hex || typeof hex !== 'string' || hex.length % 2 !== 0) return null;
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(VAULT_CIPHER_KEY);
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      const byteVal = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
      const k = keyBytes[i % keyBytes.length];
      const salt = (i * 31 + 17) & 0xff;
      out[i] = (byteVal ^ k ^ salt) & 0xff;
    }
    const decoder = new TextDecoder('utf-8');
    const json = decoder.decode(out);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Partial<SyncConfig>) : null;
  } catch {
    return null;
  }
}

function b64DecodeUnicode(str: string): string {
  // Safe base64 decoding supporting UTF-8 characters (accents, quotes, etc.)
  try {
    const binary = atob(str.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch {
    return atob(str.replace(/\s/g, ''));
  }
}

function b64EncodeUnicode(str: string): string {
  // Safe base64 encoding supporting UTF-8 characters
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const githubService = {
  /**
   * Test connection to GitHub repository
   */
  async testConnection(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    filePath = 'data/videos.json'
  ): Promise<{
    success: boolean;
    message: string;
    repoName?: string;
    fileExists?: boolean;
    fileSha?: string;
  }> {
    if (!owner || !repo) {
      return {
        success: false,
        message: 'Le propriétaire (Owner) et le nom du dépôt (Repository) GitHub sont requis.',
      };
    }

    if (!token || !token.trim()) {
      return {
        success: false,
        message: 'Veuillez renseigner votre Jeton GitHub (ghp_...) pour autoriser la synchronisation.',
      };
    }

    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
    };

    try {
      // 1. Check repo access & token validity
      const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}`;
      const repoRes = await fetch(repoUrl, { headers });

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error('Dépôt introuvable ou jeton sans accès au dépôt.');
        }
        if (repoRes.status === 401) {
          throw new Error('Jeton GitHub non valide ou expiré.');
        }
        throw new Error(`Erreur GitHub HTTP ${repoRes.status}`);
      }

      const repoData = await repoRes.json();
      if (repoData.permissions && repoData.permissions.push === false) {
        throw new Error('Ce jeton GitHub n\'a pas la permission d\'écriture ("repo") sur ce dépôt.');
      }

      // 2. Check if file exists
      const cleanPath = filePath.trim().replace(/^\//, '');
      const fileUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
      const fileRes = await fetch(fileUrl, { headers });

      let fileExists = false;
      let fileSha: string | undefined;

      if (fileRes.ok) {
        const fileData = await fileRes.json();
        fileExists = true;
        fileSha = fileData.sha;
      }

      return {
        success: true,
        message: `Dépôt "${repoData.full_name}" accessible. ${
          fileExists ? `Le fichier "${cleanPath}" existe déjà.` : `Le fichier "${cleanPath}" sera créé lors de la première synchronisation.`
        }`,
        repoName: repoData.full_name,
        fileExists,
        fileSha,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      return {
        success: false,
        message: `Échec du test GitHub : ${msg}`,
      };
    }
  },

  /**
   * Pull videos.json from GitHub
   */
  async pullVideos(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    filePath = 'data/videos.json'
  ): Promise<{ videos: VideoItem[]; sha?: string }> {
    const cleanPath = filePath.trim().replace(/^\//, '');
    const url = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;

    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Le fichier "${cleanPath}" n'existe pas encore sur la branche "${branch}".`);
      }
      throw new Error(`Erreur lors de la récupération GitHub (HTTP ${res.status})`);
    }

    const data = await res.json();
    const contentStr = b64DecodeUnicode(data.content);
    const parsed = JSON.parse(contentStr);

    if (!Array.isArray(parsed)) {
      throw new Error('Le format du fichier JSON sur GitHub n\'est pas une liste de vidéos valide.');
    }

    return {
      videos: parsed,
      sha: data.sha,
    };
  },

  /**
   * Push videos.json to GitHub repository with commit
   */
  async pushVideos(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    filePath = 'data/videos.json',
    videos: VideoItem[],
    commitMessage = 'Mise à jour automatique du catalogue de l\'Atelier Cinéma du Saulchoir'
  ): Promise<{ success: boolean; sha?: string; commitUrl?: string }> {
    if (!token) {
      throw new Error('Un jeton GitHub avec droits d\'écriture (scope "repo" ou "contents:write") est requis pour enregistrer dans le dépôt.');
    }

    const cleanPath = filePath.trim().replace(/^\//, '');
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    // 1. First get latest SHA of file if it exists
    let currentSha: string | undefined;
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
      const getRes = await fetch(getUrl, { headers });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }
    } catch {
      // not existing yet
    }

    // 2. Prepare payload
    const jsonStr = JSON.stringify(videos, null, 2);
    const encodedContent = b64EncodeUnicode(jsonStr);

    const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}`;
    const payload: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: commitMessage,
      content: encodedContent,
      branch: branch.trim() || 'main',
    };

    if (currentSha) {
      payload.sha = currentSha;
    }

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Erreur d'écriture GitHub (HTTP ${putRes.status})`);
    }

    const putData = await putRes.json();
    return {
      success: true,
      sha: putData.content?.sha,
      commitUrl: putData.commit?.html_url,
    };
  },

  /**
   * Pull data/news_photos.json from GitHub
   */
  async pullNewsPhotos(
    token: string,
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<NewsPhoto[]> {
    const cleanPath = 'data/news_photos.json';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      // Fallback to raw.githubusercontent.com for unauthenticated visitors if API rate limit is reached
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/${encodeURIComponent(branch.trim() || 'main')}/${cleanPath}?t=${Date.now()}`;
      const rawRes = await fetch(rawUrl, { cache: 'no-store' });
      if (!rawRes.ok) return [];
      const rawParsed = await rawRes.json();
      return Array.isArray(rawParsed) ? rawParsed : [];
    }
    const data = await res.json();
    if (!data.content) return [];
    const decoded = b64DecodeUnicode(data.content);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? parsed : [];
  },

  /**
   * Push data/news_photos.json to GitHub
   */
  async pushNewsPhotos(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    photos: NewsPhoto[]
  ): Promise<void> {
    if (!token || !owner || !repo) return;
    const cleanPath = 'data/news_photos.json';
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    let currentSha: string | undefined;
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
      const getRes = await fetch(getUrl, { headers });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }
    } catch {
      // ignore
    }

    const encodedContent = b64EncodeUnicode(JSON.stringify(photos, null, 2));
    const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}`;
    const payload: Record<string, string> = {
      message: `Mise à jour des photos Actualité (${photos.length} photo(s))`,
      content: encodedContent,
      branch: branch.trim() || 'main',
    };
    if (currentSha) payload.sha = currentSha;

    await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });
  },

  /**
   * Pull data/news_countdown.json from GitHub
   */
  async pullNewsCountdown(
    token: string,
    owner: string,
    repo: string,
    branch = 'main'
  ): Promise<NewsCountdown | null> {
    const cleanPath = 'data/news_countdown.json';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token && token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    const res = await fetch(url, { headers, cache: 'no-store' });
    if (!res.ok) {
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/${encodeURIComponent(branch.trim() || 'main')}/${cleanPath}?t=${Date.now()}`;
      const rawRes = await fetch(rawUrl, { cache: 'no-store' });
      if (!rawRes.ok) return null;
      const rawParsed = await rawRes.json();
      return rawParsed && typeof rawParsed === 'object' ? (rawParsed as NewsCountdown) : null;
    }
    const data = await res.json();
    if (!data.content) return null;
    const decoded = b64DecodeUnicode(data.content);
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? (parsed as NewsCountdown) : null;
  },

  /**
   * Push data/news_countdown.json to GitHub
   */
  async pushNewsCountdown(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    countdown: NewsCountdown
  ): Promise<void> {
    if (!token || !owner || !repo) return;
    const cleanPath = 'data/news_countdown.json';
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    let currentSha: string | undefined;
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
      const getRes = await fetch(getUrl, { headers });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }
    } catch {
      // ignore
    }

    const encodedContent = b64EncodeUnicode(JSON.stringify(countdown, null, 2));
    const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}`;
    const payload: Record<string, string> = {
      message: `Mise à jour du compte à rebours Actualité (${countdown.enabled ? countdown.targetDate : 'désactivé'})`,
      content: encodedContent,
      branch: branch.trim() || 'main',
    };
    if (currentSha) payload.sha = currentSha;

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `Erreur d'écriture GitHub (HTTP ${putRes.status})`);
    }
  },

  /**
   * Push encrypted permanent OAuth & GitHub configuration to data/sync_vault.json on GitHub
   * so the user never has to re-enter any fields across browsers, devices, or updates.
   */
  async pushSyncVault(
    token: string,
    owner: string,
    repo: string,
    branch = 'main',
    config: SyncConfig
  ): Promise<boolean> {
    if (!token || !owner || !repo) return false;
    const cleanPath = 'data/sync_vault.json';
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    let currentSha: string | undefined;
    try {
      const getUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}?ref=${encodeURIComponent(branch.trim() || 'main')}`;
      const getRes = await fetch(getUrl, { headers, cache: 'no-store' });
      if (getRes.ok) {
        const getData = await getRes.json();
        currentSha = getData.sha;
      }
    } catch {
      // ignore if file does not exist yet
    }

    const vaultData: Partial<SyncConfig> = {
      youtubeOAuthClientId: config.youtubeOAuthClientId || '',
      youtubeClientSecret: config.youtubeClientSecret || '',
      youtubeRefreshToken: config.youtubeRefreshToken || '',
      youtubeAccessToken: config.youtubeAccessToken || '',
      youtubeTokenExpiresAt: config.youtubeTokenExpiresAt,
      youtubeChannelTitle: config.youtubeChannelTitle || '',
      youtubePlaylistId: config.youtubePlaylistId || '',
      youtubeChannelId: config.youtubeChannelId || '',
      githubToken: config.githubToken || '',
      githubOwner: config.githubOwner || 'goliathappli',
      githubRepo: config.githubRepo || 'Vid-o-saulchoir',
      githubBranch: config.githubBranch || 'main',
      githubFilePath: config.githubFilePath || 'data/videos.json',
      autoSyncEnabled: true,
      autoSyncIntervalMinutes: config.autoSyncIntervalMinutes || 5,
    };

    const fileObj = {
      version: 1,
      updatedAt: new Date().toISOString(),
      vault: encryptVaultPayload(vaultData),
    };

    const encodedContent = b64EncodeUnicode(JSON.stringify(fileObj, null, 2));
    const putUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}/contents/${cleanPath}`;
    const payload: Record<string, string> = {
      message: 'Sauvegarde permanente de la configuration OAuth',
      content: encodedContent,
      branch: branch.trim() || 'main',
    };
    if (currentSha) payload.sha = currentSha;

    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    return putRes.ok;
  },

  /**
   * Pull and decrypt permanent OAuth & GitHub configuration from data/sync_vault.json
   */
  async pullSyncVault(
    token: string,
    owner = 'goliathappli',
    repo = 'Vid-o-saulchoir',
    branch = 'main'
  ): Promise<Partial<SyncConfig> | null> {
    const cleanPath = 'data/sync_vault.json';
    const cleanOwner = (owner || 'goliathappli').trim();
    const cleanRepo = (repo || 'Vid-o-saulchoir').trim();
    const cleanBranch = (branch || 'main').trim();

    try {
      const url = `https://api.github.com/repos/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/contents/${cleanPath}?ref=${encodeURIComponent(cleanBranch)}`;
      const headers: HeadersInit = {
        Accept: 'application/vnd.github.v3+json',
      };
      if (token && token.trim()) {
        headers['Authorization'] = `token ${token.trim()}`;
      }

      const res = await fetch(url, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          const decoded = b64DecodeUnicode(data.content);
          const parsed = JSON.parse(decoded);
          if (parsed && typeof parsed.vault === 'string') {
            return decryptVaultPayload(parsed.vault);
          }
        }
      }

      // Fallback to raw.githubusercontent.com for unauthenticated visitors or fresh browsers
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(cleanOwner)}/${encodeURIComponent(cleanRepo)}/${encodeURIComponent(cleanBranch)}/${cleanPath}?t=${Date.now()}`;
      const rawRes = await fetch(rawUrl, { cache: 'no-store' });
      if (!rawRes.ok) return null;
      const rawParsed = await rawRes.json();
      if (rawParsed && typeof rawParsed.vault === 'string') {
        return decryptVaultPayload(rawParsed.vault);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Generates a GitHub Actions YAML workflow for 24/7 direct channel synchronization (Unlisted + Shorts + Public) without playlists
   */
  generateWorkflowYaml(filePath = 'public/data/videos.json'): string {
    return `name: Synchronisation Directe Chaîne YouTube (Sans Playlist)

on:
  schedule:
    - cron: '0 * * * *' # Toutes les heures
  workflow_dispatch: # Déclenchement manuel depuis GitHub

jobs:
  sync-youtube-channel:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout dépôt
        uses: actions/checkout@v4

      - name: Configuration Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Synchroniser toutes les vidéos de la chaîne (Publiques, Non répertoriées & Shorts)
        env:
          YOUTUBE_CLIENT_ID: \${{ secrets.YOUTUBE_CLIENT_ID }}
          YOUTUBE_CLIENT_SECRET: \${{ secrets.YOUTUBE_CLIENT_SECRET }}
          YOUTUBE_REFRESH_TOKEN: \${{ secrets.YOUTUBE_REFRESH_TOKEN }}
          FILE_PATH: '${filePath}'
        run: |
          node -e '
          const fs = require("fs");
          const path = require("path");
          async function run() {
            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: process.env.YOUTUBE_CLIENT_ID,
                client_secret: process.env.YOUTUBE_CLIENT_SECRET,
                refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
                grant_type: "refresh_token",
              }),
            });
            const { access_token } = await tokenRes.json();
            if (!access_token) throw new Error("Échec authentification OAuth YouTube");
            const headers = { Authorization: "Bearer " + access_token };
            const ids = new Set();
            let pageToken = "";
            do {
              const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50&order=date" + (pageToken ? "&pageToken=" + pageToken : "");
              const res = await fetch(url, { headers });
              const data = await res.json();
              for (const it of data.items || []) if (it.id?.videoId) ids.add(it.id.videoId);
              pageToken = data.nextPageToken || "";
            } while (pageToken);
            const allIds = Array.from(ids);
            const videos = [];
            for (let i = 0; i < allIds.length; i += 50) {
              const batch = allIds.slice(i, i + 50).join(",");
              const dRes = await fetch("https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=" + batch, { headers });
              const dData = await dRes.json();
              for (const item of dData.items || []) {
                if (item.status?.privacyStatus === "private") continue;
                const s = item.snippet || {};
                const isUnlisted = item.status?.privacyStatus === "unlisted";
                videos.push({
                  id: item.id,
                  title: s.title || "Sans titre",
                  description: s.description || "",
                  synopsis: (s.description || "").slice(0, 350),
                  publishedAt: s.publishedAt,
                  thumbnailUrl: s.thumbnails?.maxres?.url || s.thumbnails?.high?.url || ("https://img.youtube.com/vi/" + item.id + "/hqdefault.jpg"),
                  youtubeUrl: "https://www.youtube.com/watch?v=" + item.id,
                  isUnlisted,
                  director: s.channelTitle || "Atelier Cinéma du Saulchoir",
                  genre: "Court-métrage"
                });
              }
            }
            videos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            fs.mkdirSync(path.dirname(process.env.FILE_PATH), { recursive: true });
            fs.writeFileSync(process.env.FILE_PATH, JSON.stringify(videos, null, 2));
          }
          run().catch(e => { console.error(e); process.exit(1); });
          '

      - name: Commit et Push des nouvelles vidéos
        run: |
          git config --global user.name "Atelier Cinema Bot"
          git config --global user.email "bot@atelier-saulchoir.org"
          git add ${filePath}
          git diff --quiet && git diff --staged --quiet || (git commit -m "Auto-sync chaîne YouTube Atelier Cinéma" && git push)
`;
  }
};
