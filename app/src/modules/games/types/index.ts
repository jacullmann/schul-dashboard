// --- Games Module Types ---

import type { Component } from 'vue';

export interface Game {
  id: string;
  name: string;
  description: string;
  component: Component;
  tags: string[];
  previewImage: string;
}

export type GameState = 'START' | 'PLAYING' | 'GAMEOVER' | 'UPGRADE';

export interface UpgradeDef {
  lvl: number;
  max: number;
  costBase: number;
  costMult: number;
  name: string;
  desc: string;
}

export interface MetaStats {
  driveSpace: number;
  upgrades: Record<string, UpgradeDef>;
}
