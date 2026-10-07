import type { Task } from '@/modules/tasks/types';

export interface TaskSection {
  key: string;
  /** A section without one runs on from the rows above it, without a heading. */
  label: string | null;
}

/**
 * One line of the list. Every row carries a key unique across the list, as
 * the list's TransitionGroup tells its rows apart by key alone.
 */
export type TaskListRow =
  | {
      kind: 'heading';
      key: string;
      label: string;
      /** The section's first task, whose entrance the heading joins. */
      taskId: string;
      isFirst: boolean;
    }
  | { kind: 'separator'; key: string; taskId: string }
  | { kind: 'task'; key: string; task: Task };

/**
 * The tasks under a heading for each run of tasks in the same section, with a
 * separator between the tasks of a run.
 *
 * A heading is keyed by its section rather than by the task below it, so it
 * stays in place while the tasks under it come and go. A section that recurs
 * further down, which an ordered list never makes, still gets keys of its own,
 * and a task listed twice is shown once.
 */
export function taskListRows(
  tasks: readonly Task[],
  sectionOf: (task: Task) => TaskSection,
): TaskListRow[] {
  const rows: TaskListRow[] = [];
  const runsBySectionKey = new Map<string, number>();
  const shownTaskIds = new Set<string>();
  let previousSectionKey: string | null = null;
  for (const task of tasks) {
    if (shownTaskIds.has(task.id)) continue;
    shownTaskIds.add(task.id);
    const section = sectionOf(task);
    if (section.key !== previousSectionKey && section.label !== null) {
      const run = runsBySectionKey.get(section.key) ?? 0;
      runsBySectionKey.set(section.key, run + 1);
      rows.push({
        kind: 'heading',
        key: `heading:${section.key}:${run}`,
        label: section.label,
        taskId: task.id,
        isFirst: rows.length === 0,
      });
    } else if (rows.length > 0) {
      rows.push({
        kind: 'separator',
        key: `separator:${task.id}`,
        taskId: task.id,
      });
    }
    rows.push({ kind: 'task', key: `task:${task.id}`, task });
    previousSectionKey = section.key;
  }
  return rows;
}
