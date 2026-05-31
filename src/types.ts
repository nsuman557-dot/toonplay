export interface CartoonItem {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  duration: string;
  videoUrl: string;
  description: string;
}

export interface Character {
  name: string;
  role: string;
}

export interface WatchServer {
  name: string;
  url: string;
}

export interface Recommendation {
  id: string;
  title: string;
  image: string;
}

export interface CartoonDetails {
  id: string;
  title: string;
  image: string;
  type: 'movie' | 'series';
  description: string;
  rating: number;
  ratingCount: number;
  durationOrEpisodes: string;
  genre: string[];
  releaseYear: number;
  episodes: Episode[];
  characters: Character[];
  director: string;
  trivia: string[];
  watchServers?: WatchServer[];
  recommendations?: Recommendation[];
  overview?: string;
  languages?: string[];
}

export interface WatchHistoryItem {
  cartoonId: string;
  cartoonTitle: string;
  cartoonImage: string;
  cartoonType: 'movie' | 'series';
  episodeId: string;
  episodeNumber: number;
  episodeTitle: string;
  progress: number; // in seconds
  duration: number; // in seconds
  lastWatched: string; // ISO String
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  joinedDate: string;
  minutesWatched: number;
  xp: number;
  level: number;
}
