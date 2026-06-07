import { useI18n } from 'vue-i18n';
import { formatSubjectDisplay } from '@/utils/subject-formatter';

export function useSuperAdminFormat() {
    const i18n = useI18n();
    const t = (key: string, named?: Record<string, unknown>) =>
        i18n.t(key, named ?? {});
    const te = (key: string) => i18n.te(key);

    const getTypeLabel = (type?: string) => {
        if (type === 'homework') return t('tasks.list.types.homework');
        if (type === 'dalton') return t('tasks.list.types.dalton');
        if (type === 'exam') return t('tasks.list.types.exam');
        return type ?? '';
    };

    const getSubjectName = (subject?: string) =>
        subject ? formatSubjectDisplay(subject, t, te) : '';

    const fmtDate = (iso?: string) =>
        iso
            ? new Date(iso).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            })
            : '';

    return { t, te, getTypeLabel, getSubjectName, fmtDate };
}
