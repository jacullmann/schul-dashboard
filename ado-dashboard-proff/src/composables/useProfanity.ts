// src/utils/profanity.ts
import { supabase } from './Datatable';

let badWords: string[] = [];

function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .trim();
}

export async function loadBadWords() {
    const { data, error } = await supabase
        .from('badwords')
        .select('phrase');

    if (error) {
        console.error('Fehler beim Laden der Wörter:', error);
        badWords = [];
        return;
    }

    badWords = data.map(w => normalize(w.phrase));
}

export function containsProfanity(text: string): boolean {
    if (!text) return false;

    const cleanedInput = normalize(text);

    return badWords.some(bw => cleanedInput.includes(bw));
}
