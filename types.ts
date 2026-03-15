
export enum GameState {
  ROOM = 'ROOM',
  SETUP = 'SETUP',
  WAITING = 'WAITING',
  TRANSITION = 'TRANSITION',
  PLAYING = 'PLAYING',
  RESULT = 'RESULT'
}

export interface Player {
  id: number;
  name: string;
  score: number;
  type: 'FOX' | 'BUNNY';
  isReady: boolean;
  socketId?: string;
}

export interface ForbiddenWord {
  char: string;
  frequency: string;
  difficulty: '简单' | '中等' | '极难' | '未知';
  description: string;
}

export interface PunishmentBanks {
  truths: string[];
  dares: string[];
}

export type SyncMessage = 
  | { type: 'UPDATE_PLAYER', player: Player }
  | { type: 'START_GAME', word: ForbiddenWord, punishments: PunishmentBanks }
  | { type: 'ADD_SCORE', playerId: number, delta: number }
  | { type: 'SETTLE_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'ATTACK_EFFECT', from: 'FOX' | 'BUNNY' }
  | { type: 'SYNC_BANKS', extraWords: ForbiddenWord[], punishments: PunishmentBanks };
