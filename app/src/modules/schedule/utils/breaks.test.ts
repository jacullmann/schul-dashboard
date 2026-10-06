import { describe, expect, it } from 'vitest';
import type { ScheduleConfig } from '@/modules/schedule/types';
import { breaksOn, withBreaksOn, withTidyBreaks } from './breaks';

const config: ScheduleConfig = {
  startTime: '08:00',
  totalSlots: 6,
  lessonDurationMins: 45,
  breaks: { 2: 20, 4: 15 },
  dayBreaks: { 3: { 1: 20, 4: 15 } },
};

describe('breaks of a day', () => {
  it('are its own where it has them, everyone’s otherwise', () => {
    expect(breaksOn(config, 3)).toEqual({ 1: 20, 4: 15 });
    expect(breaksOn(config, 1)).toEqual({ 2: 20, 4: 15 });
  });

  it('become its own once they differ', () => {
    const shorter = withBreaksOn(config, 5, { 2: 10, 4: 15 });
    expect(shorter.dayBreaks).toEqual({
      3: { 1: 20, 4: 15 },
      5: { 2: 10, 4: 15 },
    });
    expect(shorter.breaks).toEqual(config.breaks);
  });

  it('follow everyone’s again once they are the same', () => {
    expect(withBreaksOn(config, 3, { 2: 20, 4: 15 }).dayBreaks).toEqual({});
  });

  it('can be none at all on one day', () => {
    expect(withBreaksOn(config, 5, {}).dayBreaks).toEqual({
      3: { 1: 20, 4: 15 },
      5: {},
    });
  });
});

describe('everyone’s breaks', () => {
  it('leave the days with their own breaks alone', () => {
    const changed = withBreaksOn(config, null, { 2: 25, 4: 15 });
    expect(changed.breaks).toEqual({ 2: 25, 4: 15 });
    expect(changed.dayBreaks).toEqual({ 3: { 1: 20, 4: 15 } });
  });

  it('take in a day that ends up with the same breaks', () => {
    const changed = withBreaksOn(config, null, { 1: 20, 4: 15 });
    expect(changed.dayBreaks).toEqual({});
  });
});

describe('tidy breaks', () => {
  it('drop breaks after the last lesson and empty ones', () => {
    const tidy = withTidyBreaks({
      ...config,
      breaks: { 2: 20, 4: 0, 6: 10 },
      dayBreaks: { 3: { 2: 20, 6: 10 }, 4: { 1: 5 } },
    });
    expect(tidy.breaks).toEqual({ 2: 20 });
    expect(tidy.dayBreaks).toEqual({ 4: { 1: 5 } });
  });
});
