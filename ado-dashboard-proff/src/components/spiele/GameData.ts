import { defineAsyncComponent, Component } from 'vue';


export interface Game {
    id: string;
    name: string;
    description: string;
    component: Component;
    tags: string[];
    previewImage: string;
}

export const games: Game[] = [
    {
        id: 'tic-tac-toe',
        name: 'Tic-Tac-Toe',
        description: 'Wer drei in einer Reihe hat, gewinnt!',
        component: defineAsyncComponent(() => import('./TicTacToe.vue')),
        tags: ['Strategie', '2-Spieler', ],
        previewImage: 'https://m.media-amazon.com/images/I/71ni4Z2dj-L.jpg'
    },
    {
        id: 'russisch-roulette',
        name: 'Russisch Roulette',
        description: 'Dies ist nur ein Spiel!',
        component: defineAsyncComponent(() => import('./RussischRoulette.vue')),
        tags: ['Strategie', 'Kein Glückspiel', 'Klassiker', 'Russisch'],
        previewImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Rosyjska_ruletka.png/250px-Rosyjska_ruletka.png'
    }
];

export function getGameById(id: string): Game | undefined {
    return games.find(game => game.id === id);
}
