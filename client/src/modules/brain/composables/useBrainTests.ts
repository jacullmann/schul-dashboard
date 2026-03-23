import { ref } from 'vue';
import type { BrainTestDefinition, BrainTestScore } from '../types';

const STORE_KEY = 'schuldashboard_braintests_scores';

export const brainTests: BrainTestDefinition[] = [
  {
    id: 'reaction-time',
    title: 'Reaktionszeit',
    description:
      'Teste deine visuelle Reaktionsfähigkeit. Warte auf Grün und klicke so schnell du kannst.',
    unit: 'ms',
    scoreType: 'lower',
    color: '#ff335a',
    icon: 'Zap',
  },
  {
    id: 'number-memory',
    title: 'Zahlen merken',
    description:
      'Erinnere dich an die längste Zahl, die du dir merken kannst. Die Zahl wird mit jedem Level länger.',
    unit: 'Level',
    scoreType: 'higher',
    color: '#af00ff',
    icon: 'Brain',
  },
  {
    id: 'visual-memory',
    title: 'Visuelles Gedächtnis',
    description:
      'Präge dir ein Muster auf einem Gitter ein und wähle die richtigen Kacheln aus.',
    unit: 'Level',
    scoreType: 'higher',
    color: '#5600ff',
    icon: 'Eye',
  },
  {
    id: 'aim-trainer',
    title: 'Aim Trainer',
    description: 'Klicke so schnell wie möglich auf 30 Zielscheiben.',
    unit: 'ms',
    scoreType: 'lower',
    color: '#ffaa00',
    icon: 'Target',
  },
  {
    id: 'sequence-memory',
    title: 'Sequenzgedächtnis',
    description:
      'Merke dir das Muster der aufleuchtenden Felder, das mit jedem Level länger wird.',
    unit: 'Level',
    scoreType: 'higher',
    color: '#00ddff',
    icon: 'Layers',
  },
  {
    id: 'typing-speed',
    title: 'Schreibgeschwindigkeit',
    description:
      'Tippe den vorgegebenen Text so schnell und fehlerfrei wie möglich ab.',
    unit: 'WPM',
    scoreType: 'higher',
    color: '#00ffaa',
    icon: 'Keyboard',
  },
];

export function useBrainTests() {
  const scores = ref<Record<string, BrainTestScore>>({});

  function loadScores() {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        scores.value = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load brain test scores', e);
    }
  }

  function saveScore(testId: string, score: number) {
    const test = brainTests.find((t) => t.id === testId);
    if (!test) return false;

    loadScores(); // Ensure we have the latest scores

    const currentScore = scores.value[testId];
    let isBetter = false;

    if (!currentScore) {
      isBetter = true;
    } else {
      if (test.scoreType === 'lower') {
        isBetter = score < currentScore.score;
      } else {
        isBetter = score > currentScore.score;
      }
    }

    if (isBetter) {
      scores.value[testId] = {
        testId,
        score,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(scores.value));
      } catch (e) {
        console.error('Save error', e);
      }
    }

    return isBetter;
  }

  function getScore(testId: string): number | null {
    return scores.value[testId]?.score ?? null;
  }

  // Initial load
  loadScores();

  return {
    brainTests,
    scores,
    saveScore,
    getScore,
    loadScores,
  };
}
