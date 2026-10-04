import type { Task } from '@/modules/tasks/types';

type TaskType = Task['type'];

interface ImageQuota {
  perUploader: number;
  total: number;
}

/** Mirrors `ItemType::image_quota` on the server, which enforces it. */
export const IMAGE_QUOTAS: Readonly<Record<TaskType, ImageQuota>> = {
  homework: { perUploader: 8, total: 12 },
  dalton: { perUploader: 8, total: 12 },
  exam: { perUploader: 12, total: 18 },
};

export interface HeldImages {
  own: number;
  total: number;
}

export interface ImageQuotaViolation {
  limit: 'perUploader' | 'total';
  max: number;
  /** How many images may still be added; 0 once the limit is reached. */
  remaining: number;
}

/**
 * Checks a whole selection at once, so it is either uploaded completely or not
 * at all. Reports the limit that leaves less room, since that one decides how
 * many files the member may pick instead.
 */
export function imageQuotaViolation(
  type: TaskType,
  held: HeldImages,
  adding: number,
): ImageQuotaViolation | null {
  const quota = IMAGE_QUOTAS[type];
  const ownRemaining = quota.perUploader - held.own;
  const totalRemaining = quota.total - held.total;

  if (adding <= Math.min(ownRemaining, totalRemaining)) return null;

  return ownRemaining <= totalRemaining
    ? {
        limit: 'perUploader',
        max: quota.perUploader,
        remaining: Math.max(ownRemaining, 0),
      }
    : {
        limit: 'total',
        max: quota.total,
        remaining: Math.max(totalRemaining, 0),
      };
}
