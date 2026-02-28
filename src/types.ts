export interface Word {
  id: number;
  word: string;
  translation: string;
  options: string[];
  correctAnswer: string;
}

export interface GameRecord {
  playerNo: string;
  playerId: string;
  startTime: string;
  endTime: string;
  duration: string;
  maxLevel: number;
  totalWords: number;
  correctCount: number;
  accuracy: string;
}

export interface LevelConfig {
  level: number;
  words: Word[];
}

export type GameState = 'LOBBY' | 'PLAYING' | 'RESULT' | 'SUMMARY';
