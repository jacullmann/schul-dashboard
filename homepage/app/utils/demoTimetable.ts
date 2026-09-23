export type DemoSubject =
  | 'maths'
  | 'german'
  | 'physics'
  | 'history'
  | 'chemistry'
  | 'english'
  | 'sport'
  | 'biology'
  | 'computing'
  | 'art'
  | 'politics'
  | 'music';

export interface DemoLesson {
  subject: DemoSubject;
  room: string;
  movedTo?: string;
  cancelled?: boolean;
  substitute?: boolean;
  task?: 'lab_report' | 'vocabulary' | 'essay';
  exam?: boolean;
}

/** A block is two periods between breaks: one double lesson or two singles (`null` = free). */
export type DemoBlock = [DemoLesson] | [DemoLesson | null, DemoLesson | null];

export interface DemoDay {
  key: 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
  date: number;
  blocks: [DemoBlock, DemoBlock, DemoBlock];
}

export const demoPeriods = [
  { number: 1, start: '08:00' },
  { number: 2, start: '08:45' },
  { number: 3, start: '09:50' },
  { number: 4, start: '10:35' },
  { number: 5, start: '11:35' },
  { number: 6, start: '12:20' },
] as const;

export const demoBreakMinutes = [20, 15] as const;

export const demoToday: DemoDay['key'] = 'wed';

export const demoNow = { time: '10:28', block: 1, period: 0, progress: 0.84 } as const;

export const demoWeek: DemoDay[] = [
  {
    key: 'mon',
    date: 21,
    blocks: [
      [{ subject: 'maths', room: 'R102' }],
      [
        { subject: 'german', room: 'R204', cancelled: true },
        { subject: 'physics', room: 'Ph1' },
      ],
      [{ subject: 'history', room: 'R102' }],
    ],
  },
  {
    key: 'tue',
    date: 22,
    blocks: [
      [{ subject: 'chemistry', room: 'Ch1', task: 'lab_report' }],
      [
        { subject: 'history', room: 'R102' },
        { subject: 'maths', room: 'R102', movedTo: 'R201' },
      ],
      [
        { subject: 'english', room: 'R102', task: 'vocabulary' },
        { subject: 'sport', room: 'Gym' },
      ],
    ],
  },
  {
    key: 'wed',
    date: 23,
    blocks: [
      [{ subject: 'biology', room: 'Bio1', movedTo: 'Info1' }],
      [
        { subject: 'english', room: 'R102' },
        { subject: 'physics', room: 'Ph1' },
      ],
      [{ subject: 'computing', room: 'Info1', substitute: true }],
    ],
  },
  {
    key: 'thu',
    date: 24,
    blocks: [
      [{ subject: 'art', room: 'K2' }],
      [{ subject: 'maths', room: 'R102', exam: true }],
      [{ subject: 'german', room: 'R204', task: 'essay' }, null],
    ],
  },
  {
    key: 'fri',
    date: 25,
    blocks: [
      [{ subject: 'english', room: 'R102' }],
      [
        { subject: 'politics', room: 'R105' },
        { subject: 'music', room: 'M1' },
      ],
      [{ subject: 'physics', room: 'Ph1', cancelled: true }],
    ],
  },
];
