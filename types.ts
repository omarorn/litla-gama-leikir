export enum GameType {
  NONE = 'NONE',
  GARBAGE = 'GARBAGE',
  HOOK = 'HOOK',
  SNOW = 'SNOW',
  SAND = 'SAND'
}

export interface ScoreState {
  game: GameType;
  score: number;
  highScore: number;
}

export type ForemanMood = 'happy' | 'neutral' | 'excited';

export interface ForemanResponse {
  message: string;
  mood: ForemanMood;
}
