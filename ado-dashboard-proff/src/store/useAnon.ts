import { defineStore } from 'pinia';

function genAnon() {
    const n = Math.floor(100000 + Math.random() * 900000);
    return `anonym-${n}`;
}

export const useAnon = defineStore('anon', {
    state: () => ({
        id: localStorage.getItem('anon_id') || ''
    }),
    actions: {
        ensure() {
            if (!this.id) {
                this.id = genAnon();
                localStorage.setItem('anon_id', this.id);
            }
            return this.id;
        }
    }
});
