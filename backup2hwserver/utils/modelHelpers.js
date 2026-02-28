import dayjs from 'dayjs';

export function buildThumbUrl(secureUrl) {
    try {
        const u = new URL(secureUrl);
        const parts = u.pathname.split('/');
        const uploadIdx = parts.findIndex(p => p === 'upload');
        if (uploadIdx !== -1) {
            parts.splice(uploadIdx + 1, 0, 'f_webp,q_auto:best,w_120,h_120,c_fill');
            u.pathname = parts.join('/');
        }
        return u.toString();
    } catch {
        return secureUrl;
    }
}

export function withThumb(img) {
    return {
        url: img.url,
        thumbUrl: img.thumbUrl || buildThumbUrl(img.url),
        publicId: img.publicId,
        createdBy: img.createdBy,
    };
}

export function timeLeftColor(dueDate) {
    const now = dayjs();
    const due = dayjs(dueDate);
    const diffDays = due.diff(now, 'day', true);
    if (diffDays < 0) return 'expired';
    if (diffDays < 1) return 'danger';
    if (diffDays < 2) return 'warn';
    if (diffDays < 3) return 'normal';
    return 'ok';
}