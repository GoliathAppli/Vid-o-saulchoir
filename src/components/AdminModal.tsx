/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SyncConfig, VideoItem, SyncLogEntry } from '../types/cinema';
import { storageService } from '../services/storageService';
import { syncManager } from '../services/syncManager';
import { youtubeService, extractYouTubeId, extractPlaylistId } from '../services/youtubeService';
import { githubService } from '../services/githubService';
import {
  Lock, KeyRound, Shield, CheckCircle2, AlertCircle, RefreshCw,
  FolderGit2, Youtube, Film, Download, Upload, Trash2, Eye, EyeOff,
  Clock, X, Save, Copy, Check, Plus, Edit3, ArrowRight, Sparkles, Terminal
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onAuthSuccess: () => void;
  onLogout: () => void;
  onCatalogUpdated: (videos: VideoItem[]) => void;
  editingVideoTarget?: VideoItem | null;
  onClearEditingTarget?: () => void;
}

const ADMIN_PASSWORD = '25091993';

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onAuthSuccess,
  onLogout,
  onCatalogUpdated,
  editingVideoTarget,
  onClearEditingTarget,
}) => {
  // Authentication state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Active tab in Admin Mode
  const [activeTab, setActiveTab] = useState<'config' | 'sync' | 'videos' | 'data'>('config');

  // Configuration state
  const [config, setConfig] = useState<SyncConfig>(() => storageService.getConfig());
  const [configSavedToast, setConfigSavedToast] = useState(false);

  // Connection testing states
  const [ytTesting, setYtTesting] = useState(false);
  const [ytTestResult, setYtTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [oauthConnecting, setOauthConnecting] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const [ghTesting, setGhTesting] = useState(false);
  const [ghTestResult, setGhTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Synchronization states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>(() => storageService.getLogs());

  // Video Management Form state
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({
    urlOrId: '',
    title: '',
    director: 'Atelier Cinéma du Saulchoir',
    publishedAt: new Date().toISOString().split('T')[0],
    genre: 'Court-métrage',
    duration: '10:00',
    isUnlisted: true,
    synopsis: '',
    technicalNotes: 'Format 1.85:1 · Prise de son direct',
    thumbnailUrl: '',
    tags: 'Atelier, Saulchoir',
  });
  const [isPreFilling, setIsPreFilling] = useState(false);
  const [videoFormMsg, setVideoFormMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Copy workflow yaml
  const [copiedYaml, setCopiedYaml] = useState(false);

  // Synchronize editing target if passed from parent
  useEffect(() => {
    if (editingVideoTarget) {
      setActiveTab('videos');
      setEditingVideoId(editingVideoTarget.id);
      setVideoForm({
        urlOrId: editingVideoTarget.id,
        title: editingVideoTarget.title || '',
        director: editingVideoTarget.director || 'Atelier Cinéma du Saulchoir',
        publishedAt: editingVideoTarget.publishedAt ? editingVideoTarget.publishedAt.split('T')[0] : '',
        genre: editingVideoTarget.genre || 'Court-métrage',
        duration: editingVideoTarget.duration || '10:00',
        isUnlisted: editingVideoTarget.isUnlisted ?? true,
        synopsis: editingVideoTarget.synopsis || editingVideoTarget.description || '',
        technicalNotes: editingVideoTarget.technicalNotes || '',
        thumbnailUrl: editingVideoTarget.thumbnailUrl || '',
        tags: editingVideoTarget.tags ? editingVideoTarget.tags.join(', ') : '',
      });
    }
  }, [editingVideoTarget]);

  // Handle password submit
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSWORD) {
      setAuthError(false);
      setPasswordInput('');
      storageService.setAdminAuthenticated(true);
      onAuthSuccess();
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 3000);
    }
  };

  // Save config and immediately synchronize
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPlaylistId = extractPlaylistId(config.youtubePlaylistId);
    const normalizedConfig: SyncConfig = {
      ...config,
      youtubeOAuthClientId: (config.youtubeOAuthClientId || '').trim(),
      youtubeAccessToken: (config.youtubeAccessToken || '').trim(),
      youtubeApiKey: config.youtubeApiKey.trim(),
      youtubePlaylistId: cleanPlaylistId,
      autoSyncEnabled: true,
    };
    setConfig(normalizedConfig);
    storageService.saveConfig(normalizedConfig);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2500);

    // Automatically trigger synchronization as soon as OAuth/API/Playlist or GitHub data is saved
    if (
      normalizedConfig.youtubeAccessToken ||
      (normalizedConfig.youtubeApiKey && normalizedConfig.youtubePlaylistId) ||
      (normalizedConfig.githubOwner && normalizedConfig.githubRepo)
    ) {
      setIsSyncing(true);
      setSyncStatusMsg('Synchronisation automatique en cours...');
      const result = await syncManager.runFullSync(normalizedConfig);
      setIsSyncing(false);
      setSyncStatusMsg(result.message);
      setSyncLogs(storageService.getLogs());
      onCatalogUpdated(result.videos);
    }
  };

  // Connect via Google OAuth 2.0 Client ID and immediately synchronize
  const handleConnectOAuthAndSync = async () => {
    setOauthConnecting(true);
    setYtTestResult(null);
    try {
      const accessToken = await youtubeService.requestOAuthAccessToken(
        config.youtubeOAuthClientId || ''
      );

      let targetPlaylistId = extractPlaylistId(config.youtubePlaylistId);
      let channelLabel = '';

      // If no specific playlist was provided, automatically get the channel's own uploads playlist
      if (!targetPlaylistId) {
        try {
          const channelInfo = await youtubeService.getAuthenticatedUploadsPlaylistId(accessToken);
          targetPlaylistId = channelInfo.uploadsPlaylistId;
          channelLabel = ` (Chaîne : ${channelInfo.channelTitle})`;
        } catch {
          // Keep empty if user wants to specify a playlist manually
        }
      }

      const updatedConfig: SyncConfig = {
        ...config,
        youtubeOAuthClientId: (config.youtubeOAuthClientId || '').trim(),
        youtubeAccessToken: accessToken,
        youtubePlaylistId: targetPlaylistId,
        autoSyncEnabled: true,
      };

      setConfig(updatedConfig);
      storageService.saveConfig(updatedConfig);

      setYtTestResult({
        success: true,
        message: `Authentification OAuth 2.0 réussie${channelLabel} ! Synchronisation des vidéos en cours...`,
      });

      setIsSyncing(true);
      setSyncStatusMsg('Synchronisation OAuth 2.0 en cours...');
      const result = await syncManager.runFullSync(updatedConfig);
      setIsSyncing(false);
      setSyncStatusMsg(result.message);
      setSyncLogs(storageService.getLogs());
      onCatalogUpdated(result.videos);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la connexion OAuth 2.0';
      setYtTestResult({
        success: false,
        message: msg,
      });
    } finally {
      setOauthConnecting(false);
    }
  };

  // Test YouTube connection
  const handleTestYouTube = async () => {
    setYtTesting(true);
    setYtTestResult(null);
    const res = await youtubeService.testConnection(
      config.youtubeApiKey,
      config.youtubePlaylistId,
      config.youtubeAccessToken
    );
    if (res.success && res.resolvedPlaylistId && !config.youtubePlaylistId) {
      const updated = { ...config, youtubePlaylistId: res.resolvedPlaylistId };
      setConfig(updated);
      storageService.saveConfig(updated);
    }
    setYtTesting(false);
    setYtTestResult(res);
  };

  // Test GitHub connection
  const handleTestGitHub = async () => {
    setGhTesting(true);
    setGhTestResult(null);
    const res = await githubService.testConnection(
      config.githubToken,
      config.githubOwner,
      config.githubRepo,
      config.githubBranch,
      config.githubFilePath
    );
    setGhTesting(false);
    setGhTestResult(res);
  };

  // Run full sync (YouTube -> Catalog -> GitHub)
  const handleRunFullSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Synchronisation en cours...');
    const result = await syncManager.runFullSync(config);
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
    setSyncLogs(storageService.getLogs());
    onCatalogUpdated(result.videos);
  };

  // Pull from GitHub
  const handlePullFromGitHub = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Récupération depuis GitHub...');
    const result = await syncManager.pullFromGitHub(config);
    setIsSyncing(false);
    setSyncStatusMsg(result.message);
    setSyncLogs(storageService.getLogs());
    if (result.success) {
      onCatalogUpdated(result.videos);
    }
  };

  // Push to GitHub
  const handlePushToGitHub = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Envoi vers GitHub...');
    try {
      const vids = storageService.getVideos();
      await githubService.pushVideos(
        config.githubToken,
        config.githubOwner,
        config.githubRepo,
        config.githubBranch,
        config.githubFilePath,
        vids
      );
      setSyncStatusMsg('Catalogue poussé sur GitHub avec succès !');
      storageService.addLog({
        source: 'github',
        status: 'success',
        message: `Catalogue exporté vers ${config.githubOwner}/${config.githubRepo} (${vids.length} films)`,
      });
      setSyncLogs(storageService.getLogs());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setSyncStatusMsg(`Échec envoi GitHub : ${msg}`);
    }
    setIsSyncing(false);
  };

  // Pre-fill video info using YouTube API
  const handlePreFillFromYouTube = async () => {
    const vidId = extractYouTubeId(videoForm.urlOrId);
    if (!vidId) {
      setVideoFormMsg({ success: false, text: 'Veuillez saisir une URL ou un ID YouTube valide.' });
      return;
    }
    setIsPreFilling(true);
    setVideoFormMsg(null);

    const details = await youtubeService.fetchVideoDetails(
      vidId,
      config.youtubeApiKey,
      config.youtubeAccessToken
    );
    setIsPreFilling(false);

    if (details) {
      setVideoForm(prev => ({
        ...prev,
        title: details.title || prev.title,
        synopsis: details.description?.slice(0, 350) || prev.synopsis,
        publishedAt: details.publishedAt ? details.publishedAt.split('T')[0] : prev.publishedAt,
        thumbnailUrl: details.thumbnailUrl || prev.thumbnailUrl,
        duration: details.duration || prev.duration,
        director: details.director || prev.director,
        isUnlisted: details.isUnlisted !== undefined ? details.isUnlisted : prev.isUnlisted,
        tags: details.tags ? details.tags.join(', ') : prev.tags,
      }));
      setVideoFormMsg({
        success: true,
        text: 'Métadonnées YouTube récupérées avec succès !'
      });
    } else {
      // Fallback thumbnail if API key not available or video unlisted
      setVideoForm(prev => ({
        ...prev,
        thumbnailUrl: `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
      }));
      setVideoFormMsg({
        success: true,
        text: 'Miniature YouTube détectée. (Renseignez la clé API YouTube pour l\'import complet automatique).'
      });
    }
  };

  // Submit Add or Edit Video
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.urlOrId.trim()) {
      setVideoFormMsg({ success: false, text: 'L\'URL ou identifiant YouTube est obligatoire.' });
      return;
    }

    const vidId = extractYouTubeId(videoForm.urlOrId);
    if (!vidId) {
      setVideoFormMsg({ success: false, text: 'Format d\'URL YouTube non reconnu.' });
      return;
    }

    const tagsArray = videoForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const res = await syncManager.addOrUpdateVideo(
      {
        urlOrId: vidId,
        title: videoForm.title || `Vidéo ${vidId}`,
        director: videoForm.director,
        publishedAt: videoForm.publishedAt ? `${videoForm.publishedAt}T12:00:00Z` : new Date().toISOString(),
        genre: videoForm.genre,
        duration: videoForm.duration,
        isUnlisted: videoForm.isUnlisted,
        synopsis: videoForm.synopsis,
        technicalNotes: videoForm.technicalNotes,
        thumbnailUrl: videoForm.thumbnailUrl || `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`,
        tags: tagsArray,
      },
      config
    );

    if (res.success) {
      setVideoFormMsg({ success: true, text: res.message });
      const updatedList = storageService.getVideos();
      onCatalogUpdated(updatedList);
      // Reset form
      setEditingVideoId(null);
      if (onClearEditingTarget) onClearEditingTarget();
      setVideoForm({
        urlOrId: '',
        title: '',
        director: 'Atelier Cinéma du Saulchoir',
        publishedAt: new Date().toISOString().split('T')[0],
        genre: 'Court-métrage',
        duration: '10:00',
        isUnlisted: true,
        synopsis: '',
        technicalNotes: 'Format 1.85:1 · Prise de son direct',
        thumbnailUrl: '',
        tags: 'Atelier, Saulchoir',
      });
    } else {
      setVideoFormMsg({ success: false, text: res.message });
    }
  };

  // Delete Video
  const handleDeleteVideo = async (id: string) => {
    if (confirm('Voulez-vous vraiment retirer cette vidéo du catalogue ?')) {
      const res = await syncManager.deleteVideo(id, config);
      if (res.success) {
        onCatalogUpdated(storageService.getVideos());
      }
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    const vids = storageService.getVideos();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vids, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'atelier_cinema_videos.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          storageService.saveVideos(parsed);
          onCatalogUpdated(parsed);
          alert(`Catalogue mis à jour avec ${parsed.length} vidéo(s) !`);
        } else {
          alert('Le fichier importé n\'est pas une liste JSON valide.');
        }
      } catch {
        alert('Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Admin Box */}
      <div className="relative z-10 w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-serif-cinema text-xl text-zinc-100 font-semibold tracking-wide">
                Espace Administrateur
              </h2>
              <p className="text-[11px] text-zinc-400">
                Atelier Cinéma du Saulchoir · Configuration & Synchronisation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => {
                  storageService.setAdminAuthenticated(false);
                  onLogout();
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
              >
                Déconnexion
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body */}
        {!isAdmin ? (
          /* Password Prompt Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto space-y-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 mb-2 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-serif-cinema text-2xl text-zinc-100 font-medium">
                Accès Sécurisé
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5">
                Veuillez saisir le mot de passe administrateur pour configurer les flux YouTube et GitHub.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
              <div className="relative">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Mot de passe d'administration"
                  autoFocus
                  className={`w-full bg-zinc-900 border rounded pl-10 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-colors ${
                    authError
                      ? 'border-red-500 focus:border-red-400 animate-shake'
                      : 'border-zinc-800 focus:border-amber-500/60'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {authError && (
                <div className="text-xs text-red-400 flex items-center justify-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Mot de passe incorrect. Veuillez réessayer.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors cursor-pointer shadow-md shadow-amber-900/30 flex items-center justify-center gap-2"
              >
                <span>Déverrouiller le mode Administrateur</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="text-[11px] text-zinc-500 border-t border-white/5 pt-4 w-full">
              Protection sécurisée de l'Atelier Cinéma du Saulchoir.
            </div>
          </div>
        ) : (
          /* Admin Suite when Authenticated */
          <div className="flex flex-col flex-1 overflow-hidden">
            
            {/* Admin Tabs */}
            <div className="flex border-b border-white/5 bg-zinc-900/40 px-6 gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('config')}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'config'
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>1. Connexions API & Dépôt</span>
              </button>

              <button
                onClick={() => setActiveTab('sync')}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'sync'
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>2. Synchronisation & Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('videos')}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'videos'
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>3. Gestion & Ajout Vidéos</span>
              </button>

              <button
                onClick={() => setActiveTab('data')}
                className={`py-3 px-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  activeTab === 'data'
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>4. Sauvegarde & Export</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* TAB 1: API CONFIGURATION (YouTube + GitHub) */}
              {activeTab === 'config' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif-cinema text-xl text-zinc-100 font-semibold">
                        Liaison des Services YouTube & GitHub
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Configurez vos identifiants d'API pour permettre la détection et la synchronisation automatique des vidéos (notamment non répertoriées).
                      </p>
                    </div>

                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-60"
                    >
                      {isSyncing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : configSavedToast ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSyncing
                          ? 'Synchronisation...'
                          : configSavedToast
                          ? 'Synchronisé !'
                          : 'Enregistrer et synchroniser'}
                      </span>
                    </button>
                  </div>

                  {syncStatusMsg && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 flex items-center gap-2.5">
                      <RefreshCw className={`w-4 h-4 text-amber-400 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{syncStatusMsg}</span>
                    </div>
                  )}

                  {/* YouTube OAuth 2.0 Section */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                        <Youtube className="w-4 h-4 text-red-500" />
                        <span>Synchronisation YouTube via ID Client OAuth 2.0</span>
                        {config.youtubeAccessToken && (
                          <span className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono">
                            OAuth Connecté
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleTestYouTube}
                        disabled={ytTesting}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${ytTesting ? 'animate-spin' : ''}`} />
                        <span>Tester la connexion</span>
                      </button>
                    </div>

                    {/* Step-by-step helper for creating the Google OAuth Client ID */}
                    <div className="p-3.5 rounded-lg bg-zinc-950/90 border border-amber-500/20 text-xs text-zinc-300 space-y-2">
                      <div className="font-medium text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Que mettre dans Google Cloud (« Créer un ID client OAuth ») ?</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-400">
                        <li>
                          <strong>Type d'application</strong> : choisissez <span className="text-zinc-200 font-medium">Application Web</span>
                        </li>
                        <li>
                          <strong>Nom</strong> : mettez <code className="text-zinc-200">Atelier Cinéma du Saulchoir</code>
                        </li>
                        <li className="flex flex-wrap items-center gap-1.5">
                          <span><strong>Origines JavaScript autorisées</strong> : cliquez sur <em>Ajouter un URI</em> et collez exactement :</span>
                          <code className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-amber-300 font-mono">
                            {typeof window !== 'undefined' ? window.location.origin : ''}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== 'undefined') {
                                navigator.clipboard.writeText(window.location.origin);
                                setCopiedOrigin(true);
                                setTimeout(() => setCopiedOrigin(false), 2000);
                              }
                            }}
                            className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] flex items-center gap-1 cursor-pointer border border-zinc-700"
                          >
                            {copiedOrigin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedOrigin ? 'Copié !' : 'Copier l\'URL'}</span>
                          </button>
                        </li>
                        <li>
                          <strong>URI de redirection autorisés</strong> : laissez vide (ou mettez la même URL), puis cliquez sur <strong>Créer</strong> et collez l'<strong>ID client</strong> ci-dessous.
                        </li>
                      </ol>
                    </div>

                    {ytTestResult && (
                      <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                        ytTestResult.success
                          ? 'bg-emerald-950/60 border border-emerald-600/30 text-emerald-300'
                          : 'bg-red-950/60 border border-red-600/30 text-red-300'
                      }`}>
                        {ytTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{ytTestResult.message}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-zinc-200 font-medium mb-1">
                          1. ID Client OAuth 2.0 Google *
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={config.youtubeOAuthClientId || ''}
                            onChange={e => setConfig({ ...config, youtubeOAuthClientId: e.target.value })}
                            placeholder="1234567890-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleConnectOAuthAndSync}
                            disabled={oauthConnecting || isSyncing}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 shrink-0"
                          >
                            <Youtube className="w-4 h-4" />
                            <span>
                              {oauthConnecting
                                ? 'Connexion Google en cours...'
                                : config.youtubeAccessToken
                                ? 'Reconnecter OAuth & Synchroniser'
                                : 'Connecter Google OAuth & Synchroniser'}
                            </span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1">
                          En cliquant sur ce bouton, vous autorisez la lecture de vos vidéos YouTube (y compris non répertoriées) et la synchronisation démarre automatiquement.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                        <div>
                          <label className="block text-xs text-zinc-300 font-medium mb-1">
                            2. Lien ou ID de Playlist YouTube (Optionnel avec OAuth)
                          </label>
                          <input
                            type="text"
                            value={config.youtubePlaylistId}
                            onChange={e => setConfig({ ...config, youtubePlaylistId: extractPlaylistId(e.target.value) })}
                            placeholder="Vide = toutes les vidéos de la chaîne, ou collez https://youtube.com/playlist?list=..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
                          />
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Si laissé vide lors de la connexion OAuth, toutes les vidéos mises en ligne sur votre chaîne sont récupérées automatiquement. Vous pouvez aussi coller une playlist spécifique (ex: <code>PLc1MoYNc9HeM</code>).
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs text-zinc-400 font-medium mb-1">
                            Clé API YouTube (Optionnelle si OAuth est connecté)
                          </label>
                          <input
                            type="password"
                            value={config.youtubeApiKey}
                            onChange={e => setConfig({ ...config, youtubeApiKey: e.target.value })}
                            placeholder="Optionnel (AIzaSy...)"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                          <p className="text-[11px] text-zinc-500 mt-1">
                            Permet la synchronisation publique sans reconnexion OAuth si la playlist est en mode public ou non répertorié.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GitHub Section */}
                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                        <FolderGit2 className="w-4 h-4 text-purple-400" />
                        <span>Dépôt GitHub de Synchronisation</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestGitHub}
                        disabled={ghTesting}
                        className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3 h-3 ${ghTesting ? 'animate-spin' : ''}`} />
                        <span>Tester la connexion GitHub</span>
                      </button>
                    </div>

                    {ghTestResult && (
                      <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                        ghTestResult.success
                          ? 'bg-emerald-950/60 border border-emerald-600/30 text-emerald-300'
                          : 'bg-red-950/60 border border-red-600/30 text-red-300'
                      }`}>
                        {ghTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{ghTestResult.message}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Jeton GitHub (Personal Access Token)
                        </label>
                        <input
                          type="password"
                          value={config.githubToken}
                          onChange={e => setConfig({ ...config, githubToken: e.target.value })}
                          placeholder="ghp_..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                        <p className="text-[11px] text-zinc-500 mt-1">
                          Token avec portée <code>repo</code> ou <code>contents:write</code> pour permettre la sauvegarde automatique.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Propriétaire (Owner / Organisation)
                        </label>
                        <input
                          type="text"
                          value={config.githubOwner}
                          onChange={e => setConfig({ ...config, githubOwner: e.target.value })}
                          placeholder="atelier-cinema-saulchoir"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Nom du dépôt (Repository)
                        </label>
                        <input
                          type="text"
                          value={config.githubRepo}
                          onChange={e => setConfig({ ...config, githubRepo: e.target.value })}
                          placeholder="cinema-catalog"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Branche & Chemin du fichier
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={config.githubBranch}
                            onChange={e => setConfig({ ...config, githubBranch: e.target.value })}
                            placeholder="main"
                            className="w-24 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                          <input
                            type="text"
                            value={config.githubFilePath}
                            onChange={e => setConfig({ ...config, githubFilePath: e.target.value })}
                            placeholder="data/videos.json"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save button bottom */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSaveConfig()}
                      disabled={isSyncing}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-60"
                    >
                      {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{isSyncing ? 'Synchronisation en cours...' : 'Enregistrer et synchroniser maintenant'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: SYNCHRONIZATION & AUTOMATION */}
              {activeTab === 'sync' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-serif-cinema text-xl text-zinc-100 font-semibold">
                      Déclenchement & Automatisation
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Lancez la synchronisation à la demande ou configurez le processus automatisé entre YouTube et votre dépôt GitHub.
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={handleRunFullSync}
                      disabled={isSyncing}
                      className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <RefreshCw className={`w-5 h-5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span className="text-[11px] font-mono text-amber-400/80">Recommandé</span>
                      </div>
                      <div className="font-serif-cinema text-base font-semibold text-zinc-100 group-hover:text-amber-300">
                        Synchronisation Complète
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        YouTube ➔ Catalogue local ➔ Dépôt GitHub.
                      </p>
                    </button>

                    <button
                      onClick={handlePullFromGitHub}
                      disabled={isSyncing}
                      className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-white/5 text-left transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Download className="w-5 h-5 text-purple-400" />
                        <span className="text-[11px] text-zinc-500">GitHub ➔ Web</span>
                      </div>
                      <div className="font-serif-cinema text-base font-semibold text-zinc-100 group-hover:text-purple-300">
                        Importer de GitHub
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Charge le fichier <code>videos.json</code> du dépôt.
                      </p>
                    </button>

                    <button
                      onClick={handlePushToGitHub}
                      disabled={isSyncing}
                      className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/60 border border-white/5 text-left transition-colors cursor-pointer group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Upload className="w-5 h-5 text-emerald-400" />
                        <span className="text-[11px] text-zinc-500">Web ➔ GitHub</span>
                      </div>
                      <div className="font-serif-cinema text-base font-semibold text-zinc-100 group-hover:text-emerald-300">
                        Pousser vers GitHub
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Commit l'état local actuel sur la branche principale.
                      </p>
                    </button>
                  </div>

                  {syncStatusMsg && (
                    <div className="p-3 bg-zinc-900 border border-amber-500/20 rounded text-xs text-zinc-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{syncStatusMsg}</span>
                    </div>
                  )}

                  {/* Auto-sync background toggle */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-zinc-200">
                        Synchronisation continue en arrière-plan
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Interroge régulièrement YouTube pour détecter les nouveaux films ajoutés à la playlist.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs text-zinc-400">Toutes les</label>
                      <select
                        value={config.autoSyncIntervalMinutes}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const upd = { ...config, autoSyncIntervalMinutes: val };
                          setConfig(upd);
                          storageService.saveConfig(upd);
                        }}
                        className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 heure</option>
                        <option value={120}>2 heures</option>
                      </select>

                      <input
                        type="checkbox"
                        checked={config.autoSyncEnabled}
                        onChange={e => {
                          const upd = { ...config, autoSyncEnabled: e.target.checked };
                          setConfig(upd);
                          storageService.saveConfig(upd);
                        }}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* GitHub Actions automation guide */}
                  <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                        <Terminal className="w-4 h-4 text-amber-400" />
                        <span>Workflow GitHub Actions (Optionnel pour automatisation serveur)</span>
                      </div>
                      <button
                        onClick={() => {
                          const yaml = githubService.generateWorkflowYaml(config.youtubePlaylistId, config.githubFilePath);
                          navigator.clipboard.writeText(yaml);
                          setCopiedYaml(true);
                          setTimeout(() => setCopiedYaml(false), 2000);
                        }}
                        className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedYaml ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedYaml ? 'YAML copié' : 'Copier workflow'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Ajoutez ce fichier sous <code>.github/workflows/youtube-sync.yml</code> dans votre dépôt GitHub pour synchroniser automatiquement vos vidéos même sans ouvrir le site.
                    </p>
                  </div>

                  {/* Real-time Sync Logs */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Journal des opérations ({syncLogs.length})
                      </h4>
                      <button
                        onClick={() => {
                          storageService.clearLogs();
                          setSyncLogs([]);
                        }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                      >
                        Effacer l'historique
                      </button>
                    </div>

                    <div className="bg-zinc-950 border border-white/5 rounded-lg max-h-48 overflow-y-auto font-mono text-[11px] divide-y divide-white/5">
                      {syncLogs.length === 0 ? (
                        <div className="p-4 text-center text-zinc-600">Aucun journal enregistré.</div>
                      ) : (
                        syncLogs.map(log => (
                          <div key={log.id} className="p-2.5 flex items-start gap-2.5">
                            <span className="text-zinc-500 shrink-0">
                              {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                            </span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                              log.status === 'success'
                                ? 'bg-emerald-950 text-emerald-400'
                                : log.status === 'warning'
                                ? 'bg-amber-950 text-amber-400'
                                : log.status === 'error'
                                ? 'bg-red-950 text-red-400'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {log.source}
                            </span>
                            <span className="text-zinc-300 flex-1">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: VIDEOS CATALOG & MANUAL / UNLISTED ADD */}
              {activeTab === 'videos' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-serif-cinema text-xl text-zinc-100 font-semibold">
                      {editingVideoId ? 'Modification du Film' : 'Ajouter une Vidéo (Publique ou Non Répertoriée)'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Idéal pour ajouter directement le lien secret d'une vidéo YouTube non répertoriée ou ajuster le synopsis d'un atelier.
                    </p>
                  </div>

                  {/* Add / Edit Form */}
                  <form onSubmit={handleSaveVideo} className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-4">
                    {videoFormMsg && (
                      <div className={`p-3 rounded text-xs flex items-center gap-2 ${
                        videoFormMsg.success
                          ? 'bg-emerald-950/60 border border-emerald-600/30 text-emerald-300'
                          : 'bg-red-950/60 border border-red-600/30 text-red-300'
                      }`}>
                        {videoFormMsg.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{videoFormMsg.text}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* YouTube Link / ID + Pre-fill button */}
                      <div className="md:col-span-8">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Lien ou ID YouTube (Public ou Non répertorié) *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={videoForm.urlOrId}
                            onChange={e => setVideoForm({ ...videoForm, urlOrId: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=... ou ID (ex: L_LUpnjgPso)"
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={handlePreFillFromYouTube}
                            disabled={isPreFilling}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isPreFilling ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Pré-remplir</span>
                          </button>
                        </div>
                      </div>

                      {/* Unlisted checkbox */}
                      <div className="md:col-span-4 flex items-end">
                        <label className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 w-full cursor-pointer hover:border-zinc-700">
                          <input
                            type="checkbox"
                            checked={videoForm.isUnlisted}
                            onChange={e => setVideoForm({ ...videoForm, isUnlisted: e.target.checked })}
                            className="w-4 h-4 accent-amber-500"
                          />
                          <span className="flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                            Vidéo non répertoriée
                          </span>
                        </label>
                      </div>

                      {/* Title */}
                      <div className="md:col-span-8">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Titre du film ou de l'atelier *
                        </label>
                        <input
                          type="text"
                          required
                          value={videoForm.title}
                          onChange={e => setVideoForm({ ...videoForm, title: e.target.value })}
                          placeholder="Ex: Lumières d'Automne au Cloître"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                        />
                      </div>

                      {/* Genre */}
                      <div className="md:col-span-4">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Genre / Catégorie
                        </label>
                        <select
                          value={videoForm.genre}
                          onChange={e => setVideoForm({ ...videoForm, genre: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                        >
                          <option value="Court-métrage">Court-métrage</option>
                          <option value="Documentaire">Documentaire</option>
                          <option value="Atelier & Exercice">Atelier & Exercice</option>
                          <option value="Cinéma expérimental">Cinéma expérimental</option>
                          <option value="Masterclass & Rencontre">Masterclass & Rencontre</option>
                        </select>
                      </div>

                      {/* Director */}
                      <div className="md:col-span-6">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Réalisateur / Promo / Collectif
                        </label>
                        <input
                          type="text"
                          value={videoForm.director}
                          onChange={e => setVideoForm({ ...videoForm, director: e.target.value })}
                          placeholder="Atelier Cinéma du Saulchoir"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                        />
                      </div>

                      {/* Publication Date */}
                      <div className="md:col-span-3">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Date de publication
                        </label>
                        <input
                          type="date"
                          value={videoForm.publishedAt}
                          onChange={e => setVideoForm({ ...videoForm, publishedAt: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                        />
                      </div>

                      {/* Duration */}
                      <div className="md:col-span-3">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Durée (ex: 12:30)
                        </label>
                        <input
                          type="text"
                          value={videoForm.duration}
                          onChange={e => setVideoForm({ ...videoForm, duration: e.target.value })}
                          placeholder="12:30"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 font-mono"
                        />
                      </div>

                      {/* Synopsis */}
                      <div className="md:col-span-12">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Synopsis & Note d'intention
                        </label>
                        <textarea
                          rows={3}
                          value={videoForm.synopsis}
                          onChange={e => setVideoForm({ ...videoForm, synopsis: e.target.value })}
                          placeholder="Présentation du dispositif, de l'exercice ou du récit cinématographique..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 leading-relaxed"
                        />
                      </div>

                      {/* Technical Notes */}
                      <div className="md:col-span-6">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Fiche technique (caméra, format, son)
                        </label>
                        <input
                          type="text"
                          value={videoForm.technicalNotes}
                          onChange={e => setVideoForm({ ...videoForm, technicalNotes: e.target.value })}
                          placeholder="Format 1.85:1 · Prise de son direct · 35mm"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 font-mono"
                        />
                      </div>

                      {/* Tags */}
                      <div className="md:col-span-6">
                        <label className="block text-xs text-zinc-300 font-medium mb-1">
                          Mots-clés (séparés par virgules)
                        </label>
                        <input
                          type="text"
                          value={videoForm.tags}
                          onChange={e => setVideoForm({ ...videoForm, tags: e.target.value })}
                          placeholder="Fiction, Cadrage, Cloître, Lumière"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {editingVideoId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingVideoId(null);
                            if (onClearEditingTarget) onClearEditingTarget();
                            setVideoForm({
                              urlOrId: '',
                              title: '',
                              director: 'Atelier Cinéma du Saulchoir',
                              publishedAt: new Date().toISOString().split('T')[0],
                              genre: 'Court-métrage',
                              duration: '10:00',
                              isUnlisted: true,
                              synopsis: '',
                              technicalNotes: 'Format 1.85:1 · Prise de son direct',
                              thumbnailUrl: '',
                              tags: 'Atelier, Saulchoir',
                            });
                          }}
                          className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                        >
                          Annuler la modification
                        </button>
                      ) : <div />}

                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs rounded transition-colors flex items-center gap-2 cursor-pointer shadow"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{editingVideoId ? 'Mettre à jour le film' : 'Ajouter au catalogue et synchroniser'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Videos List Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Films actuellement au catalogue ({storageService.getVideos().length})
                    </h4>

                    <div className="bg-zinc-950 border border-white/5 rounded-lg overflow-hidden divide-y divide-white/5">
                      {storageService.getVideos().map((v, index) => (
                        <div key={v.id} className="p-3 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-xs text-zinc-500 w-5">
                              #{index + 1}
                            </span>
                            <div className="w-16 h-9 rounded overflow-hidden bg-zinc-900 shrink-0">
                              <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-xs text-zinc-100 truncate flex items-center gap-2">
                                <span>{v.title}</span>
                                {index === 0 && (
                                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded border border-amber-500/30">
                                    Nouvelle publication
                                  </span>
                                )}
                                {v.isUnlisted && (
                                  <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-400 text-[10px] rounded">
                                    Non répertoriée
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 truncate">
                                {v.genre} · {new Date(v.publishedAt).toLocaleDateString('fr-FR')} · {v.director}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setEditingVideoId(v.id);
                                setVideoForm({
                                  urlOrId: v.id,
                                  title: v.title,
                                  director: v.director || '',
                                  publishedAt: v.publishedAt ? v.publishedAt.split('T')[0] : '',
                                  genre: v.genre || 'Court-métrage',
                                  duration: v.duration || '',
                                  isUnlisted: v.isUnlisted ?? true,
                                  synopsis: v.synopsis || v.description || '',
                                  technicalNotes: v.technicalNotes || '',
                                  thumbnailUrl: v.thumbnailUrl || '',
                                  tags: v.tags ? v.tags.join(', ') : '',
                                });
                              }}
                              title="Modifier"
                              className="p-1.5 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteVideo(v.id)}
                              title="Supprimer"
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: DATA & BACKUP */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-serif-cinema text-xl text-zinc-100 font-semibold">
                      Sauvegarde & Gestion des Données
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Téléchargez ou restaurez le fichier catalogue complet <code>videos.json</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Export Card */}
                    <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                        <Download className="w-4 h-4 text-amber-400" />
                        <span>Exporter le Catalogue JSON</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Télécharge le fichier <code>videos.json</code> contenant toutes les métadonnées, dates et classements chronologiques.
                      </p>
                      <button
                        onClick={handleExportJSON}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Télécharger videos.json</span>
                      </button>
                    </div>

                    {/* Import Card */}
                    <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-zinc-200 font-medium text-sm">
                        <Upload className="w-4 h-4 text-purple-400" />
                        <span>Importer un Fichier JSON</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Restaure ou injecte une liste de vidéos formatée depuis votre ordinateur.
                      </p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Sélectionner un fichier</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportJSON}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Clear local catalog */}
                  <div className="p-5 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-red-200">
                        Vider le Catalogue Local
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Efface les vidéos en cache localement avant une nouvelle synchronisation propre.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Vider toutes les vidéos du cache local ? Vous pourrez relancer la synchronisation depuis YouTube ou GitHub à tout moment.')) {
                          const res = storageService.resetCatalog();
                          onCatalogUpdated(res);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-300 text-xs rounded border border-red-800/50 transition-colors cursor-pointer"
                    >
                      Vider le cache
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
