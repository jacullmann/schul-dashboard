import { ref } from 'vue';
import hw from '@/hwApi';
import { useI18n } from 'vue-i18n';

export function useDeleteAccount(emit: {
    (e: 'cancel'): void;
    (e: 'deleted'): void;
    (e: 'error', msg: string): void;
}) {
    const { t } = useI18n();
    const understoodChecked = ref(false);
    const submitting = ref(false);
    const errorMsg = ref('');
    const successMsg = ref('');

    async function confirmDelete() {
        submitting.value = true;
        errorMsg.value = '';
        try {
            const res = await hw.delete('/api/auth/me');
            if (res?.data?.ok) {
                successMsg.value = t('account.menu.deleteAccount.success');
                emit('deleted');
                setTimeout(() => emit('cancel'), 600);
            } else {
                const err = res?.data?.error || t('global.errors.unknown');
                errorMsg.value = err;
                emit('error', err);
            }
        } catch (e: any) {
            const msg = e?.response?.data?.error || t('global.errors.delete');
            errorMsg.value = msg;
            emit('error', msg);
        } finally {
            submitting.value = false;
        }
    }

    return {
        understoodChecked,
        submitting,
        errorMsg,
        successMsg,
        confirmDelete
    };
}