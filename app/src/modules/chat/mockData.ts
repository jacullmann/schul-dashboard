import type { AiStep } from '@/modules/chat/composables/useChatSession';

export const developmentMockMessages = [
  {
    id: 'mock-1',
    role: 'human',
    content: 'Could you help me set up a new Vue project?',
    sender_id: 'user',
  },
  {
    id: 'mock-2',
    role: 'assistant',
    content: 'Of course! You can start by running `npm create vue@latest` in your terminal. This will guide you through setting up a new Vue 3 project with Vite.',
    sender_id: 'ai',
    steps: [
      { status: 'thinking', duration_ms: 450, timestamp: Date.now() - 100000 },
    ],
  },
  {
    id: 'mock-3',
    role: 'human',
    content: 'Which features should I select when it prompts?',
    sender_id: 'user',
  },
  {
    id: 'mock-4',
    role: 'assistant',
    content: 'It depends on your needs, but generally, selecting TypeScript, Vue Router, and Pinia (for state management) is a great baseline for modern web applications.',
    sender_id: 'ai',
  },
  {
    id: 'mock-5',
    role: 'human',
    content: 'Sounds good. What about styling?',
    sender_id: 'user',
  },
  {
    id: 'mock-6',
    role: 'assistant',
    content: 'You can use standard CSS, or integrate Tailwind CSS for utility-first styling. Tailwind works beautifully with Vue components.',
    sender_id: 'ai',
    steps: [
      { status: 'thinking', duration_ms: 1200, timestamp: Date.now() - 80000 },
      { status: 'searching', tool: 'web_search', duration_ms: 3000, timestamp: Date.now() - 78800 },
    ],
  },
  {
    id: 'mock-7',
    role: 'human',
    content: 'Is Pinia better than Vuex?',
    sender_id: 'user',
  },
  {
    id: 'mock-8',
    role: 'assistant',
    content: 'Yes, Pinia is the officially recommended state management solution for Vue 3. It provides better TypeScript support and avoids mutations and nested modules.',
    sender_id: 'ai',
  },
  {
    id: 'mock-9',
    role: 'human',
    content: 'How do I install Pinia separately if I skip it initially?',
    sender_id: 'user',
  },
  {
    id: 'mock-10',
    role: 'assistant',
    content: 'You can install it later via `npm install pinia`, then add it to your Vue instance using `app.use(createPinia())` in your main.ts file.',
    sender_id: 'ai',
  },
  {
    id: 'mock-11',
    role: 'human',
    content: 'Can you show me an example of a Pinia store?',
    sender_id: 'user',
  },
  {
    id: 'mock-12',
    role: 'assistant',
    content: 'Sure! Here is a simple counter store setup using the Setup Store syntax...',
    sender_id: 'ai',
  },
  {
    id: 'mock-13',
    role: 'human',
    content: 'I think that makes sense. Can you help me fetch some external mock data within this test project?',
    sender_id: 'user',
  }
];

export const developmentMockLiveSteps: AiStep[] = [
  { status: 'thinking', timestamp: Date.now() - 5000, duration_ms: 800 },
  { status: 'searching', tool: 'web_search', timestamp: Date.now() - 4200, duration_ms: 1600 },
  { status: 'reading', timestamp: Date.now() - 2600, duration_ms: 1200 },
  { status: 'pondering', timestamp: Date.now() - 1400 }, // Missing duration implies it is the currently executing step
];
