import { defineAsyncComponent } from 'vue';
import type { Game } from '@/modules/games/types';
import i18n from '@/i18n';

export const games: Game[] = [
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    get description() {
      return i18n.global.t('games.list.tic_tac_toe.description');
    },
    component: defineAsyncComponent(() => import('../pages/TicTacToe.vue')),
    tags: ['Strategie', '2-Spieler'],
    previewImage:
      'https://images.unsplash.com/photo-1668901382969-8c73e450a1f5?q=80&w=1160&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'russisch-roulette',
    name: 'Russisch Roulette',
    get description() {
      return i18n.global.t('games.list.russian_roulette.description');
    },
    component: defineAsyncComponent(
      () => import('../pages/RussianRoulette.vue'),
    ),
    get tags() {
      return [
        i18n.global.t('games.list.russian_roulette.tags.strategy'),
        i18n.global.t('games.list.russian_roulette.tags.no_gambling'),
        i18n.global.t('games.list.russian_roulette.tags.classic'),
        i18n.global.t('games.list.russian_roulette.tags.russian'),
      ];
    },
    previewImage:
      'https://images.unsplash.com/photo-1594078807666-6af57bc52363?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'rock-paper-scissors',
    name: 'Schere, Stein, Papier',
    get description() {
      return i18n.global.t('games.list.rock_paper_scissors.description');
    },
    component: defineAsyncComponent(
      () => import('../pages/RockPaperScissors.vue'),
    ),
    tags: ['Klassiker', 'Duell', 'Solo'],
    previewImage:
      'https://images.unsplash.com/photo-1605126511476-3284bef5af50?q=80&w=872&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'cyber-snare',
    name: 'CYBER_SNARE',
    description: 'Draw energy tethers to trap viruses in a neon CRT world.',
    component: defineAsyncComponent(() => import('../pages/CyberSnare.vue')),
    tags: ['Action', 'Arcade', 'Solo'],
    previewImage:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'memory-game',
    name: 'Memory',
    get description() {
      return i18n.global.t('games.list.memory_game.description');
    },
    component: defineAsyncComponent(() => import('../pages/MemoryGame.vue')),
    tags: ['Klassiker', 'Gehirntraining', 'Solo'],
    previewImage:
      'https://images.unsplash.com/photo-1601987177651-8edfe6c20009?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  },
  {
    id: 'snake-game',
    name: 'Snake',
    get description() {
      return i18n.global.t('games.list.snake_game.description');
    },
    component: defineAsyncComponent(() => import('../pages/SnakeGame.vue')),
    tags: ['Arcade', 'Klassiker', 'Action'],
    previewImage:
      'https://images.unsplash.com/photo-1472645977521-95bbf4f0a748?q=80&w=774&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  {
    id: 'whack-a-mole',
    name: 'Whack-a-Mole',
    get description() {
      return i18n.global.t('games.list.whack_a_mole.description');
    },
    component: defineAsyncComponent(() => import('../pages/WhackAMole.vue')),
    get tags() {
      return [
        i18n.global.t('games.list.whack_a_mole.tags.reaction'),
        i18n.global.t('games.list.whack_a_mole.tags.fun'),
        i18n.global.t('games.list.whack_a_mole.tags.solo'),
      ];
    },
    previewImage:
      'https://images.unsplash.com/photo-1651559316159-69315814fe1c?q=80&w=1450&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
];

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id);
}
