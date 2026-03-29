export interface BrainTestDefinition {
  id: 'reaction-time' | 'number-memory' | 'visual-memory';
  title: string;
  description: string;
  icon: string;
  unit: string;
  scoreType: 'higher' | 'lower';
  color: string;
}

export interface BrainTestScore {
  testId: string;
  score: number;
  timestamp: number;
}
