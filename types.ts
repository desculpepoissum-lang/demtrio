export type Position = {
  x: number;
  y: number;
};

export type LetterItem = {
  id: string;
  char: string;
  position: Position;
  collected: boolean;
};

export type WordData = {
  word: string;
  hint: string;
};

export enum GameState {
  LANGUAGE_SELECT,
  LOADING,
  PLAYING,
  LEVEL_COMPLETE, // Acts as the Shop now
  GAME_OVER,
  ERROR
}

export type CellType = 'wall' | 'path' | 'start' | 'end';

export type MazeGrid = CellType[][];

export type Language = 'en' | 'pt';

export type Inventory = {
  shields: number;
  swords: number;
  pistols: number;
  drills: number;
};