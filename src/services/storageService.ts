/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VideoItem, SyncConfig, SyncLogEntry, YearGroup, MonthGroup } from '../types/cinema';

const STORAGE_KEYS = {
  VIDEOS: 'atelier_cinema_videos_catalog',
  CONFIG: 'atelier_cinema_sync_config',
  LOGS: 'atelier_cinema_sync_logs',
  ADMIN_SESSION: 'atelier_cinema_admin_auth',
};

// Initial realistic catalog of the Atelier Cinéma du Saulchoir
const INITIAL_VIDEOS: VideoItem[] = [
  {
    id: 'L_LUpnjgPso',
    title: 'Lumières d\'Automne au Cloître',
    description: 'Exercice de mise en scène en lumière naturelle et son multipiste réalisé lors de la session de rentrée 2026 au Saulchoir.',
    synopsis: 'Dans le silence minéral des galeries du Saulchoir, une monteuse cherche la cadence d\'un plan oublié. Une réflexion poétique sur la mémoire du lieu et la texture du temps cinématographique.',
    publishedAt: '2026-09-22T18:30:00Z', // Latest! "Nouvelle publication"
    thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
    isUnlisted: true,
    duration: '11:42',
    director: 'Atelier de Création · Promo 2026',
    genre: 'Court-métrage',
    tags: ['Fiction', 'Lumière naturelle', 'Saulchoir', 'Non répertorié'],
    technicalNotes: 'Caméra Cinema 4K · Format 1.85:1 · Prise de son ambiophonique Schœps',
  },
  {
    id: 'aqz-KE-bpKQ',
    title: 'Le Geste et la Bobine : Écouter le 35mm',
    description: 'Documentaire de recherche sur les gestes du montage argentique et la conservation des archives filmiques.',
    synopsis: 'Rencontre avec les artisans de la pellicule qui perpétuent les techniques de colleuse et de visionneuse Steenbeck. Le grain de l\'argentique confronté aux flux numériques contemporains.',
    publishedAt: '2026-08-14T14:15:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    isUnlisted: true,
    duration: '18:05',
    director: 'Collectif Documentaire du Saulchoir',
    genre: 'Documentaire',
    tags: ['Documentaire', 'Pellicule', 'Archives', 'Patrimoine'],
    technicalNotes: 'Pellicule Kodak Vision3 250D numérisée en 4K HDR',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Chambre Noire & Regards Croisés',
    description: 'Étude pratique sur le cadrage fixe et le hors-champ menée en collaboration avec les étudiants en scénographie.',
    synopsis: 'Trois personnages se succèdent dans un même décor clos. Tout se joue sur la direction du regard et la composition millimétrée des ombres portées.',
    publishedAt: '2026-05-09T10:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    isUnlisted: false,
    duration: '09:12',
    director: 'Groupe Atelier Fictions',
    genre: 'Atelier & Exercice',
    tags: ['Exercice', 'Cadrage', 'Hors-champ', 'Noir & Blanc'],
    technicalNotes: 'Format 1.33:1 académique · Noir & Blanc contrasté',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Échos de la Ville Haute',
    description: 'Symphonie urbaine et captation sonore des résonances architecturales de la cité.',
    synopsis: 'Inspiré des symphonies de villes des années 1920 (Ruttmann, Vertov), un parcours visuel rythmé par les pulsations du bitume et les reflets du crépuscule.',
    publishedAt: '2026-03-18T17:45:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    isUnlisted: true,
    duration: '13:20',
    director: 'Atelier Son & Image',
    genre: 'Cinéma expérimental',
    tags: ['Expérimental', 'Urbain', 'Montage rythmique'],
    technicalNotes: 'Optiques anamorphiques · Mixage 5.1',
  },
  {
    id: '9bZkp7q19f0',
    title: 'Masterclass : Le Temps Suspendu au Cinéma',
    description: 'Transcription audiovisuelle de la rencontre annuelle avec les cinéastes invités au Saulchoir.',
    synopsis: 'Débat et analyse critique autour de la durée du plan chez Chantal Akerman et Andreï Tarkovski. Avec extraits commentés et échanges avec la salle.',
    publishedAt: '2025-11-28T19:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
    isUnlisted: false,
    duration: '42:10',
    director: 'Conférences du Saulchoir',
    genre: 'Masterclass & Rencontre',
    tags: ['Masterclass', 'Théorie du cinéma', 'Débat'],
    technicalNotes: 'Captation bi-caméra · Son cravate HF',
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'Les Fenêtres Intérieures',
    description: 'Court-métrage intimiste tourné en décor naturel dans la bibliothèque historique.',
    synopsis: 'Entre deux rayonnages de livres centenaires, un étudiant découvre des annotations manuscrites sur une partition cinématographique inachevée.',
    publishedAt: '2025-10-04T15:20:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    isUnlisted: true,
    duration: '15:50',
    director: 'Équipe Fiction Promo 2025',
    genre: 'Court-métrage',
    tags: ['Fiction', 'Lieu historique', 'Non répertorié'],
    technicalNotes: 'Optiques Zeiss Master Prime · Étalonnage DaVinci',
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Territoires Flous : Essai sur le Paysage',
    description: 'Une déambulation en lisière forestière explorant les lisières géographiques et intimes.',
    synopsis: 'Poème visuel composé à partir de plans séquences lents au lever du jour. La voix off égraine des fragments de correspondances de cinéastes.',
    publishedAt: '2025-04-12T09:30:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
    isUnlisted: true,
    duration: '12:08',
    director: 'Atelier Écriture & Réalisation',
    genre: 'Documentaire',
    tags: ['Essai', 'Paysage', 'Plan séquence'],
    technicalNotes: 'Format 2.39:1 Scope · Voix off studio',
  },
  {
    id: 'ZbZSe6N_BXs',
    title: 'Exercice Premier Plan : Arrivée en Gare',
    description: 'Hommage contemporain au film fondateur des frères Lumière réinterprété avec les outils actuels.',
    synopsis: 'Revisitation contemporaine du dispositif originel : comment la caméra transforme-t-elle l\'espace public en scène théâtrale involontaire ?',
    publishedAt: '2024-12-10T16:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
    isUnlisted: false,
    duration: '06:45',
    director: 'Atelier Initiation Technique',
    genre: 'Atelier & Exercice',
    tags: ['Exercice', 'Histoire du cinéma', 'Lumière'],
    technicalNotes: 'Plan fixe 50mm · Son direct mono',
  }
];

const DEFAULT_CONFIG: SyncConfig = {
  youtubeApiKey: '',
  youtubePlaylistId: '',
  youtubeChannelId: '',
  youtubeAccessToken: '',
  githubToken: '',
  githubOwner: 'atelier-cinema-saulchoir',
  githubRepo: 'cinema-catalog',
  githubBranch: 'main',
  githubFilePath: 'data/videos.json',
  autoSyncEnabled: false,
  autoSyncIntervalMinutes: 60,
  lastSyncTimestamp: undefined,
  lastSyncStatus: 'idle',
  lastSyncMessage: 'Système initialisé. Prêt pour la synchronisation.',
};

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export const storageService = {
  getVideos(): VideoItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIDEOS);
      if (stored) {
        const parsed: VideoItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Erreur lecture vidéos locales', e);
    }
    // Save defaults
    this.saveVideos(INITIAL_VIDEOS);
    return INITIAL_VIDEOS;
  },

  saveVideos(videos: VideoItem[]): void {
    try {
      // Keep sorted by publication date descending
      const sorted = [...videos].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      localStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(sorted));
    } catch (e) {
      console.error('Erreur sauvegarde vidéos locales', e);
    }
  },

  getConfig(): SyncConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Erreur lecture config', e);
    }
    return DEFAULT_CONFIG;
  },

  saveConfig(config: SyncConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Erreur sauvegarde config', e);
    }
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
    return [
      {
        id: 'init-1',
        timestamp: new Date().toISOString(),
        source: 'system',
        status: 'info',
        message: 'Atelier Cinéma du Saulchoir : catalogue initial chargé avec succès.',
        itemCount: INITIAL_VIDEOS.length
      }
    ];
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

  // Reset to initial sample data
  resetCatalog(): VideoItem[] {
    localStorage.removeItem(STORAGE_KEYS.VIDEOS);
    return this.getVideos();
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

    // Group previous videos by Year then Month
    const yearMap = new Map<number, Map<number, VideoItem[]>>();

    for (const vid of previousVideos) {
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

    // Convert into sorted YearGroup array
    const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);

    const archives: YearGroup[] = sortedYears.map(year => {
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

    return { latest, archives };
  },

  // Admin authentication check
  isAdminAuthenticated(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true';
  },

  setAdminAuthenticated(auth: boolean): void {
    if (auth) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  }
};
