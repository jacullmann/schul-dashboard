import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReturnPath, isAppPath } from './returnPath';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

describe('isAppPath', () => {
  it('accepts paths within the app', () => {
    expect(isAppPath('/groups/1/tasks/2?tab=files#top')).toBe(true);
  });

  it('rejects other origins and non-paths', () => {
    for (const path of [
      '//evil.example',
      '/\\evil.example',
      'https://evil.example',
      'groups',
      '',
      null,
    ]) {
      expect(isAppPath(path)).toBe(false);
    }
  });
});

describe('createReturnPath', () => {
  const returnPath = createReturnPath('test:return');

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', memoryStorage());
  });

  it('returns a saved path once', () => {
    returnPath.save('/groups/1/schedule');
    expect(returnPath.consume()).toBe('/groups/1/schedule');
    expect(returnPath.consume()).toBeNull();
  });

  it('ignores paths to other origins', () => {
    returnPath.save('//evil.example');
    expect(returnPath.consume()).toBeNull();
  });

  it('forgets a cleared path', () => {
    returnPath.save('/private');
    returnPath.clear();
    expect(returnPath.consume()).toBeNull();
  });
});
