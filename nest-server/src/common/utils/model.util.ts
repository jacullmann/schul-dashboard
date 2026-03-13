import dayjs from 'dayjs';

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dwysdpvcm';

export function buildThumbUrl(secureUrl: string): string {
  try {
    const u = new URL(secureUrl);
    const parts = u.pathname.split('/');
    const uploadIdx = parts.findIndex((p) => p === 'upload');
    if (uploadIdx !== -1) {
      parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto,w_256,h_256,c_fill');
      u.pathname = parts.join('/');
    }
    return u.toString();
  } catch {
    return secureUrl;
  }
}

export function generateCloudinaryUrl(
  publicId: string,
  version?: unknown,
  format: string = 'webp',
  isThumb: boolean = false,
): string {
  const versionStr = version ? `v${version}/` : '';
  const extension = format === 'pdf' ? 'jpg' : 'webp';

  if (isThumb) {
    return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_webp,q_auto,w_256,h_256,c_fill/${versionStr}${publicId}.${extension}`;
  }
  return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${versionStr}${publicId}.${extension}`;
}

export function withThumb(img: any): any {
  if (img.publicId && (!img.url || img.metadata)) {
    const meta = img.metadata;
    return {
      url: generateCloudinaryUrl(
        img.publicId,
        meta?.version,
        meta?.format as string | undefined,
        false,
      ),
      thumbUrl: generateCloudinaryUrl(
        img.publicId,
        meta?.version,
        meta?.format as string | undefined,
        true,
      ),
      publicId: img.publicId,
      createdBy: img.createdBy,
      metadata: img.metadata || undefined,
    };
  }

  return {
    url: img.url || '',
    thumbUrl: img.thumbUrl || buildThumbUrl(img.url || ''),
    publicId: img.publicId,
    createdBy: img.createdBy,
  };
}

export function timeLeftColor(dueDate: string | Date): string {
  const now = dayjs();
  const due = dayjs(dueDate);
  const diffDays = due.diff(now, 'day', true);
  if (diffDays < 0) return 'expired';
  if (diffDays < 1) return 'danger';
  if (diffDays < 2) return 'warn';
  if (diffDays < 3) return 'normal';
  return 'ok';
}
