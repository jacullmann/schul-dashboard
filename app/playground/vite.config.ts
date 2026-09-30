import path from 'node:path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from '../vite.config';

const SCRATCH = process.env.PLAYGROUND_OUT ?? path.resolve(__dirname, 'dist');

/** Each replacement must hit, so a drift in the real components fails the build. */
function replaceExact(
  file: string,
  code: string,
  pairs: [string, string][],
): string {
  for (const [from, to] of pairs) {
    if (!code.includes(from)) throw new Error(`${file}: "${from}" not found`);
    code = code.replace(from, to);
  }
  return code;
}

function playgroundTransforms(): Plugin {
  return {
    name: 'playground-transforms',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/router/index.ts')) {
        return replaceExact(id, code, [
          [
            "import { createRouter, createWebHistory } from 'vue-router';",
            "import { createRouter, createMemoryHistory } from 'vue-router';",
          ],
          [
            'history: createWebHistory(),',
            "history: (() => { const h = createMemoryHistory(); h.replace('/groups/demo/tasks'); return h; })(),",
          ],
        ]);
      }
      if (id.endsWith('/modules/tasks/components/TaskCard.vue')) {
        return replaceExact(id, code, [
          [
            'border-ghost-border p-1 shadow-input',
            'border-ghost-border p-(--pg-card-p) shadow-input',
          ],
          [
            'class="flex justify-between items-start gap-2 select-none"',
            'class="flex justify-between items-start gap-(--pg-row-gap) select-none"',
          ],
          [
            'class="flex gap-2 min-w-0 mt-2 ml-3 md:ml-2 mb-1"',
            'class="flex gap-(--pg-check-gap) min-w-0 mt-(--pg-content-mt) ml-(--pg-content-ml) md:ml-2 mb-(--pg-content-mb)"',
          ],
          [
            'class="flex flex-col gap-1 flex-1 min-w-0"',
            'class="flex flex-col gap-(--pg-title-gap) flex-1 min-w-0"',
          ],
          [
            'class="relative z-10 flex items-start gap-2"',
            'class="relative z-10 flex items-start gap-2 mt-(--pg-actions-mt) mr-(--pg-actions-mr)"',
          ],
        ]);
      }
      if (id.endsWith('/modules/tasks/pages/TaskList.vue')) {
        return replaceExact(id, code, [
          [
            'class="flex flex-col relative max-md:-mx-4"',
            'class="flex flex-col gap-(--pg-list-gap) relative max-md:mx-[calc(var(--pg-list-bleed)*-1)]"',
          ],
          [
            'task-separator border-b border-ghost-border ml-10.5 mr-4',
            'task-separator border-b border-ghost-border ml-(--pg-sep-ml) mr-(--pg-sep-mr)',
          ],
        ]);
      }
    },
  };
}

export default mergeConfig(
  baseConfig,
  defineConfig({
    base: './',
    plugins: [playgroundTransforms()],
    build: {
      outDir: SCRATCH,
      emptyOutDir: true,
      // The artifact frame loads nothing from other hosts, so fonts ship inline.
      assetsInlineLimit: () => true,
      cssCodeSplit: false,
      rollupOptions: { input: path.resolve(__dirname, 'index.html') },
    },
  }),
);
