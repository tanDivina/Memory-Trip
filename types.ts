export enum GameState {
  START = 'START',
  LOBBY = 'LOBBY', // New state for online game lobby
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
  GALLERY = 'GALLERY',
}

export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER', // Player vs AI
  TWO_PLAYER = 'TWO_PLAYER', // Local hotseat
  THREE_PLAYER = 'THREE_PLAYER', // Local hotseat
  FOUR_PLAYER = 'FOUR_PLAYER', // Local hotseat
  SOLO_MODE = 'SOLO_MODE', // Creative mode
  ONLINE = 'ONLINE', // New online multiplayer mode
}

export enum AddedBy {
  PLAYER_1 = 'PLAYER_1',
  PLAYER_2 = 'PLAYER_2',
  PLAYER_3 = 'PLAYER_3',
  PLAYER_4 = 'PLAYER_4',
  AI = 'AI',
}

export interface MemoryItem {
  text: string;
  addedBy: AddedBy;
}

export interface Player {
  id: string;
  name: string;
}

export interface GameSession {
  basePrompt: string;
  items: MemoryItem[];
  currentImage: string;
  mimeType: string;
  imageHistory: string[];
  currentPlayer: AddedBy; // Still used for local multiplayer turn tracking
  gameMode: GameMode;
  aiPersona?: string; // Only for SINGLE_PLAYER mode
  turnEndsAt?: number; // Timestamp for when the current turn ends

  // New fields for online mode
  gameCode?: string;
  players?: Player[];
  hostId?: string;
  currentPlayerId?: string; // The ID of the player whose turn it is
  gameOverReason?: string;
  gameStatus?: 'lobby' | 'active' | 'finished';
}

export interface StoredTrip {
  id: string;
  timestamp: number;
  location: string;
  finalImage: string; // base64 image data
  mimeType: string;
  items: string[];
  summary: string;
}

export const AIPersonas = [
  'The Whimsical Artist',
  'The Chaos Agent',
  'The Gloomy Poet',
  'The Sci-Fi Nerd',
  'The Culinary Enthusiast',
  'Custom...',
];