import { describe, expect, it } from 'vitest';
import type { Task } from '@/modules/tasks/types';
import { taskListRows, type TaskSection } from './taskListRows';

const task = (id: string, section: string) =>
  ({ id, dueDate: section }) as unknown as Task;
const bySection = (item: Task): TaskSection => ({
  key: item.dueDate,
  label: item.dueDate.toUpperCase(),
});
const keysOf = (tasks: Task[]) =>
  taskListRows(tasks, bySection).map((row) => row.key);

describe('taskListRows', () => {
  it('heads each section and separates the tasks within it', () => {
    expect(
      keysOf([task('a', 'today'), task('b', 'today'), task('c', 'tomorrow')]),
    ).toEqual([
      'heading:today:0',
      'task:a',
      'separator:b',
      'task:b',
      'heading:tomorrow:0',
      'task:c',
    ]);
  });

  it('keeps the heading key when the first task of a section leaves', () => {
    const before = keysOf([task('a', 'today'), task('b', 'today')]);
    const after = keysOf([task('b', 'today')]);
    expect(after[0]).toBe(before[0]);
  });

  it('marks only the first heading as first', () => {
    const headings = taskListRows(
      [task('a', 'today'), task('b', 'tomorrow')],
      bySection,
    ).filter((row) => row.kind === 'heading');
    expect(headings.map((row) => row.isFirst)).toEqual([true, false]);
  });

  it('keeps keys unique when a section recurs or a task repeats', () => {
    const keys = keysOf([
      task('a', 'october'),
      task('b', 'today'),
      task('b', 'today'),
      task('c', 'october'),
    ]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key === 'task:b')).toHaveLength(1);
  });
});
