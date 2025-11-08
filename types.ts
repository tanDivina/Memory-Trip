export enum GameState {
  START = 'START',
  GAME = 'GAME',
  GAME_OVER = 'GAME_OVER',
}

export enum GameMode {
  SINGLE_PLAYER = 'SINGLE_PLAYER',
  TWO_PLAYER = 'TWO_PLAYER',
  THREE_PLAYER = 'THREE_PLAYER',
  FOUR_PLAYER = 'FOUR_PLAYER',
  SOLO_MODE = 'SOLO_MODE',
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

export interface GameSession {
  basePrompt: string;
  items: MemoryItem[];
  currentImage: string;
  mimeType: string;
  currentPlayer: AddedBy;
  gameMode: GameMode;
  aiPersona?: string; // Only for SINGLE_PLAYER mode
  turnEndsAt?: number; // Timestamp for when the current turn ends
}

export const AIPersonas = [
  'The Whimsical Artist',
  'The Chaos Agent',
  'The Gloomy Poet',
  'The Sci-Fi Nerd',
  'The Culinary Enthusiast',
];