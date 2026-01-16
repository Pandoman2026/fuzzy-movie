
export interface MovieInfo {
  title: string;
  year: string;
  director: string;
  actor: string;
  description: string;
}

export enum GameState {
  START = 'START',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  CORRECT = 'CORRECT'
}

export interface UserStats {
  oscars: number;
  streak: number;
}
