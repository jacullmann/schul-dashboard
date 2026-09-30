import { reactive } from 'vue';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import hw from '@/api/api';
import type { HwItem } from '@/modules/tasks/types';

export const GROUP_IDS = ['demo', 'demo-2'] as const;

export const mockSettings = reactive({
  seed: Date.now() % 100000,
  count: 14,
  longTitles: false,
  daltonEnabled: false,
  pinned: 1,
  checked: 3,
  latencyMs: 350,
});

const USER_ID = 'user-me';

const SUBJECTS = [
  { id: 's-math', name: 'math', category: 'core' },
  { id: 's-german', name: 'german', category: 'core' },
  { id: 's-english', name: 'english', category: 'core' },
  { id: 's-bio', name: 'biology', category: 'core' },
  { id: 's-chem', name: 'chemistry', category: 'core' },
  { id: 's-phys', name: 'physics', category: 'core' },
  { id: 's-hist', name: 'history', category: 'core' },
  { id: 's-geo', name: 'geography', category: 'core' },
  { id: 's-french', name: 'french', category: 'elective' },
  { id: 's-cs', name: 'cs', category: 'elective' },
  { id: 's-art', name: 'art', category: 'extra' },
  { id: 's-music', name: 'music', category: 'extra' },
] as const;

const COURSES: Partial<Record<string, string[]>> = {
  's-french': ['Frau Lambert', 'Herr Moreau'],
  's-cs': ['Herr Keller'],
};

const HOMEWORK_TITLES: Record<string, string[]> = {
  math: [
    'S. 84 Nr. 3–7',
    'Arbeitsblatt Quadratische Funktionen',
    'Übungen zum Satz des Pythagoras',
  ],
  german: [
    'Erörterung zu „Der Sandmann“ fertigstellen',
    'Kapitel 4 lesen',
    'Gedichtanalyse Rilke',
  ],
  english: [
    'Vocabulary Unit 5',
    'Essay: Social media and democracy',
    'Workbook p. 42',
  ],
  biology: ['Protokoll Mikroskopie', 'Zusammenfassung Fotosynthese'],
  chemistry: [
    'Reaktionsgleichungen ausgleichen',
    'Versuchsauswertung Titration',
  ],
  physics: ['Aufgaben zu Ohmschem Gesetz', 'Diagramm Weg-Zeit zeichnen'],
  history: [
    'Quellenanalyse Weimarer Verfassung',
    'Referat Industrialisierung vorbereiten',
  ],
  geography: ['Klimadiagramm auswerten', 'Karte Europa beschriften'],
  french: ['Vokabeln Leçon 6', 'Compréhension écrite S. 31'],
  cs: ['Python: Sortieralgorithmus implementieren', 'Struktogramm erstellen'],
  art: ['Skizzenbuch: drei Perspektivstudien'],
  music: ['Notenlesen Übungsblatt 2'],
};

const EXAM_TITLES = [
  'Klassenarbeit',
  'Test',
  'Vokabeltest',
  'Klausur',
  'Kurzkontrolle',
];

const LONG_SUFFIX =
  ' – inklusive aller Teilaufgaben, Zusatzmaterial aus dem Lehrbuch und der Nachbereitung der letzten Stunde';

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length)]!;
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

interface MockState {
  items: HwItem[];
  checks: Set<string>;
  pins: Set<string>;
  archived: Set<string>;
  kept: Set<string>;
}

function generate(): MockState {
  const rand = rng(mockSettings.seed);
  const items: HwItem[] = [];
  // A few already past due, so the archive filter has something to show.
  const pastCount = 4;
  const total = mockSettings.count + pastCount;

  for (let i = 0; i < total; i++) {
    const subject = pick(rand, SUBJECTS);
    const roll = rand();
    const type: HwItem['type'] =
      roll < 0.62
        ? 'homework'
        : roll < 0.8 && mockSettings.daltonEnabled
          ? 'dalton'
          : 'exam';
    const base =
      type === 'exam'
        ? `${pick(rand, EXAM_TITLES)} ${pick(rand, ['Kapitel 3', 'Einheit 2', 'Halbjahr', 'Unit 4'])}`
        : pick(rand, HOMEWORK_TITLES[subject.name] ?? ['Aufgaben']);
    const dueOffset =
      i < pastCount ? -(1 + Math.floor(rand() * 12)) : Math.floor(rand() * 24);
    const courseName = COURSES[subject.id]
      ? pick(rand, COURSES[subject.id]!)
      : null;

    items.push({
      id: `task-${mockSettings.seed}-${i}`,
      type,
      title: mockSettings.longTitles ? base + LONG_SUFFIX : base,
      subjectId: subject.id,
      courseId: courseName ? `${subject.id}-c` : null,
      subjectName: subject.name,
      courseName,
      description: '',
      images: [],
      dueDate: isoDay(dueOffset),
      createdBy: rand() < 0.5 ? USER_ID : 'user-other',
      createdByName: pick(rand, ['Lena', 'Jonas', 'Mia', 'Paul']),
      timeColor: '',
      editorNote: '',
      createdAt: isoDay(-14),
    });
  }

  items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const past = items.filter((item) => new Date(item.dueDate) < startOfToday());
  const upcoming = items.filter(
    (item) => new Date(item.dueDate) >= startOfToday(),
  );
  return {
    items,
    checks: new Set(
      [...past, ...upcoming.slice(0, mockSettings.checked)].map((i) => i.id),
    ),
    pins: new Set(
      upcoming.slice(upcoming.length - mockSettings.pinned).map((i) => i.id),
    ),
    archived: new Set(),
    kept: new Set(),
  };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

let state = generate();

export function regenerate() {
  state = generate();
}

function group(id: string) {
  return {
    id,
    name: '10b',
    role: 'admin',
    ownerId: USER_ID,
    avatarUrl: null,
    permissions: {},
    groupType: 'regular',
    daltonEnabled: mockSettings.daltonEnabled,
    effectivePermissions: [
      'create_items',
      'upload_images',
      'manage_notes',
      'send_messages',
      'delete_other_content',
    ],
  };
}

function isArchived(item: HwItem): boolean {
  if (state.archived.has(item.id)) return true;
  if (state.kept.has(item.id)) return false;
  // The server's rule: past due, checked and not pinned drops into the archive.
  return (
    new Date(item.dueDate) < startOfToday() &&
    state.checks.has(item.id) &&
    !state.pins.has(item.id)
  );
}

function listItems(params: Record<string, unknown>): HwItem[] {
  const old = params.filter === 'old';
  return state.items.filter((item) => {
    if (isArchived(item) !== old) return false;
    if (params.type && params.type !== 'all' && item.type !== params.type)
      return false;
    if (params.subjectId && item.subjectId !== params.subjectId) return false;
    if (params.hideChecked && state.checks.has(item.id)) return false;
    return true;
  });
}

function toggle(set: Set<string>, id: string, on: boolean) {
  if (on) set.add(id);
  else set.delete(id);
}

type Handler = (
  match: RegExpMatchArray,
  config: InternalAxiosRequestConfig,
) => unknown;

const routes: [string, RegExp, Handler][] = [
  ['get', /^\/system\/csrf\/init$/, () => ({})],
  ['post', /^\/auth\/refresh$/, () => ({})],
  [
    'get',
    /^\/groups\/status$/,
    () => ({
      authenticated: true,
      groups: GROUP_IDS.map(group),
      landingGroupId: GROUP_IDS[0],
    }),
  ],
  [
    'get',
    /^\/auth\/me$/,
    () => ({
      authenticated: true,
      id: USER_ID,
      email: 'demo@example.com',
      role: 'user',
      emailVerified: true,
      courses: [],
      doneSetup: true,
      personalized: false,
      mfaEnabled: false,
      preferences: {},
      username: 'Demo',
    }),
  ],
  ['get', /^\/groups\/([^/]+)$/, (m) => group(m[1]!)],
  ['get', /^\/groups\/[^/]+\/schedule\/subjects$/, () => SUBJECTS],
  ['get', /^\/groups\/[^/]+\/items$/, (_m, c) => listItems(c.params ?? {})],
  [
    'get',
    /^\/groups\/[^/]+\/items\/([^/]+)$/,
    (m) => state.items.find((i) => i.id === m[1]),
  ],
  ['get', /^\/user\/checks$/, () => ({ itemIds: [...state.checks] })],
  ['get', /^\/user\/pins$/, () => ({ itemIds: [...state.pins] })],
  [
    'get',
    /^\/user\/visibility$/,
    () => ({ archived: [...state.archived], kept: [...state.kept] }),
  ],
  [
    'post',
    /^\/groups\/[^/]+\/items\/([^/]+)\/check$/,
    (m) => toggle(state.checks, m[1]!, true),
  ],
  [
    'delete',
    /^\/groups\/[^/]+\/items\/([^/]+)\/check$/,
    (m) => toggle(state.checks, m[1]!, false),
  ],
  [
    'post',
    /^\/groups\/[^/]+\/items\/([^/]+)\/pin$/,
    (m) => toggle(state.pins, m[1]!, true),
  ],
  [
    'delete',
    /^\/groups\/[^/]+\/items\/([^/]+)\/pin$/,
    (m) => toggle(state.pins, m[1]!, false),
  ],
  [
    'post',
    /^\/groups\/[^/]+\/items\/([^/]+)\/visibility$/,
    (m, c) => {
      const { status } = JSON.parse((c.data as string) || '{}') as {
        status?: string;
      };
      state.archived.delete(m[1]!);
      state.kept.delete(m[1]!);
      if (status === 'archived') state.archived.add(m[1]!);
      if (status === 'kept') state.kept.add(m[1]!);
    },
  ],
  [
    'delete',
    /^\/groups\/[^/]+\/items\/([^/]+)\/visibility$/,
    (m) => {
      state.archived.delete(m[1]!);
      state.kept.delete(m[1]!);
    },
  ],
  [
    'delete',
    /^\/groups\/[^/]+\/items\/([^/]+)$/,
    (m) => {
      state.items = state.items.filter((i) => i.id !== m[1]);
    },
  ],
  [
    'get',
    /^\/groups\/[^/]+\/schedule\/announcements(\/read-status)?$/,
    () => [],
  ],
  ['get', /^\/groups\/[^/]+\/messages$/, () => []],
  ['get', /^\/groups\/[^/]+\/schedule(\/subs)?$/, () => []],
];

const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const url = (config.url ?? '').split('?')[0]!;
  const match = routes.find(([m, re]) => m === method && re.test(url));
  const data = match ? match[2](url.match(match[1])!, config) : {};
  if (!match && method === 'get')
    console.info('[playground] unmocked', method, url);

  await new Promise((resolve) =>
    setTimeout(resolve, url.endsWith('/items') ? mockSettings.latencyMs : 30),
  );
  return {
    data: data ?? {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    request: {},
  };
};

hw.defaults.adapter = mockAdapter;
