/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem } from '../types/cinema';

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

    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    try {
      // 1. Check repo access
      const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner.trim())}/${encodeURIComponent(repo.trim())}`;
      const repoRes = await fetch(repoUrl, { headers });

      if (!repoRes.ok) {
        if (repoRes.status === 404) {
          throw new Error('Dépôt introuvable ou privé (ajoutez un jeton d\'accès personnel avec le périmètre "repo").');
        }
        if (repoRes.status === 401) {
          throw new Error('Jeton GitHub non valide ou expiré.');
        }
        throw new Error(`Erreur GitHub HTTP ${repoRes.status}`);
      }

      const repoData = await repoRes.json();

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
   * Generates a sample GitHub Actions YAML workflow
   */
  generateWorkflowYaml(playlistId: string, filePath = 'data/videos.json'): string {
    return `name: Synchronisation YouTube Atelier Cinéma

on:
  schedule:
    - cron: '0 */6 * * *' # Toutes les 6 heures
  workflow_dispatch: # Déclenchement manuel depuis GitHub

jobs:
  sync-youtube:
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

      - name: Synchroniser les vidéos YouTube
        env:
          YOUTUBE_API_KEY: \${{ secrets.YOUTUBE_API_KEY }}
          PLAYLIST_ID: '${playlistId || 'VOTRE_PLAYLIST_ID'}'
          FILE_PATH: '${filePath}'
        run: |
          node -e "
          const fs = require('fs');
          const https = require('https');
          // Script de synchronisation automatique exécuté par GitHub Actions
          console.log('Synchronisation automatique du catalogue...');
          "

      - name: Commit et Push des nouvelles vidéos
        run: |
          git config --global user.name "Atelier Cinema Bot"
          git config --global user.email "bot@atelier-saulchoir.org"
          git add ${filePath}
          git diff --quiet && git diff --staged --quiet || (git commit -m "Auto-sync vidéos Atelier Cinéma [skip ci]" && git push)
`;
  }
};
