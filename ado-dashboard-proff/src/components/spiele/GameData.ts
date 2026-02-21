import { defineAsyncComponent, type Component } from 'vue';


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
        tags: ['Strategie', '2-Spieler',],
        previewImage: 'https://de.freepik.com/vektoren-kostenlos/haende-die-bleistifte-halten-um-tic-tac-toe-zu-spielen-leute-die-kreuze-und-nullen-im-einfachen-spiel-fuer-flache-vektorillustration-der-kinder-zeichnen-strategiekonzept-fuer-banner-website-design-oder-landing-webseite_27572532.htm#fromView=search&page=1&position=3&uuid=e6af000a-ae53-41a6-af38-9e50d8f66cd3&query=tik+tak+to'
    },
    {
        id: 'russisch-roulette',
        name: 'Russisch Roulette',
        description: 'Dies ist nur ein Spiel!',
        component: defineAsyncComponent(() => import('./RussischRoulette.vue')),
        tags: ['Strategie', 'Kein Glückspiel', 'Klassiker', 'Russisch'],
        previewImage: 'https://de.freepik.com/vektoren-kostenlos/vektor-realistische-kasino-roulette-rad-draufsicht-lokalisiert-auf-gruenem-pokertisch_11062552.htm#fromView=search&page=1&position=2&uuid=05fcfc04-f997-48e9-8031-923f917d68b0&query=russian+roulette'
    },
    {
        id: 'rock-paper-scissors',
        name: 'Schere, Stein, Papier',
        description: 'Spiele Schere-Stein-Papier gegen einen Computer.',
        component: defineAsyncComponent(() => import('./Schere-usw.vue')),
        tags: ['Klassiker', 'Duell', 'Solo'],
        previewImage: 'https://de.freepik.com/vektoren-kostenlos/stein-papier-schere-banner_21002766.htm#fromView=search&page=1&position=1&uuid=86425b36-17a5-4ff8-b5d3-c968cadaf645&query=rock+paper+scissors'
    },
    {
        id: 'cyber-snare',
        name: 'CYBER_SNARE',
        description: 'Draw energy tethers to trap viruses in a neon CRT world.',
        component: defineAsyncComponent(() => import('./CyberSnare.vue')),
        tags: ['Action', 'Arcade', 'Solo'],
        previewImage: ''
    }
];

export function getGameById(id: string): Game | undefined {
    return games.find(game => game.id === id);
}