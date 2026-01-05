export enum GameType {
  NONE = 'NONE',
  GARBAGE = 'GARBAGE',
  HOOK = 'HOOK',
  SNOW = 'SNOW',
  SAND = 'SAND',
  SCANNER = 'SCANNER', // New: Vision
  GEAR = 'GEAR',       // New: Image Editing
  MAPS = 'MAPS'        // New: Maps Grounding
}

export interface ScoreState {
  game: GameType;
  score: number;
  highScore: number;
}

export type ForemanMood = 'happy' | 'neutral' | 'excited' | 'thinking';

export interface ForemanResponse {
  message: string;
  mood: ForemanMood;
}