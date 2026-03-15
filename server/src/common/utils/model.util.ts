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
  const versionStr = version ? `v${version as string}/` : '';
  const extension = format === 'pdf' ? 'jpg' : 'webp';

  if (isThumb) {
    return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/f_webp,q_auto,w_256,h_256,c_fill/${versionStr}${publicId}.${extension}`;
  }
  return `https://res.cloudinary.com/${cloudinaryCloudName}/image/upload/${versionStr}${publicId}.${extension}`;
}

export function withThumb(img: any): any {
  const _img = img as Record<string, any>;
  if (_img.publicId && (!_img.url || _img.metadata)) {
    const meta = _img.metadata as Record<string, any>;
    return {
      url: generateCloudinaryUrl(
        _img.publicId as string,
        meta?.version as unknown,
        meta?.format as string | undefined,
        false,
      ),
      thumbUrl: generateCloudinaryUrl(
        _img.publicId as string,
        meta?.version as unknown,
        meta?.format as string | undefined,
        true,
      ),
      publicId: _img.publicId as string,
      createdBy: _img.createdBy as string,
      metadata: _img.metadata || undefined,
    };
  }

  return {
    url: (_img.url as string) || '',
    thumbUrl:
      (_img.thumbUrl as string) || buildThumbUrl((_img.url as string) || ''),
    publicId: _img.publicId as string,
    createdBy: _img.createdBy as string,
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
