import { ref, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import hw from '@/api/hwApi';
import type { ChangePasswordErrors } from '@/modules/auth/types';

export function useChangePassword(emit: {
    (e: 'cancel'): void;
    (e: 'success'): void;
}) {
    const { t } = useI18n();

    const currentPassword = ref('');
    const newPassword = ref('');
    const newPassword2 = ref('');

    const showCurrentPassword = ref(false);
    const showNewPassword = ref(false);
    const showNewPassword2 = ref(false);

    const submitting = ref(false);
    const message = ref('');
    const isError = ref(false);

    const errors = reactive<ChangePasswordErrors>({});

    function clearAllErrors() {
        errors.current = undefined;
        errors.new = undefined;
        errors.confirm = undefined;
    }

    function clearFieldError(field: 'current' | 'new' | 'confirm') {
        errors[field] = undefined;
        message.value = '';
        isError.value = false;
    }

    function setMessage(txt: string, error = false) {
        message.value = txt;
        isError.value = error;
    }

    function validateBeforeSubmit(): boolean {
        clearAllErrors();
        let ok = true;

        if (!currentPassword.value) {
            errors.current = t('account.menu.changePassword.errors.currentMissing');
            ok = false;
        } else if (currentPassword.value.length < 8) {
            errors.current = t('account.menu.changePassword.errors.currentShort');
            ok = false;
        }

        if (!newPassword.value) {
            errors.new = t('account.menu.changePassword.errors.newMissing');
            ok = false;
        } else if (newPassword.value.length < 8) {
            errors.new = t('account.menu.changePassword.errors.newShort');
            ok = false;
        }

        if (!newPassword2.value) {
            errors.confirm = t('account.menu.changePassword.errors.confirmMissing');
            ok = false;
        } else if (newPassword.value !== newPassword2.value) {
            errors.confirm = t('account.menu.changePassword.errors.confirmWrong');
            ok = false;
        }

        if (ok && currentPassword.value === newPassword.value) {
            errors.new = t('account.menu.changePassword.errors.equal');
            ok = false;
        }

        return ok;
    }

    async function submit() {
        setMessage('');
        if (!validateBeforeSubmit()) {
            return;
        }

        submitting.value = true;
        try {
            await hw.post('/api/auth/change-password', {
                currentPassword: currentPassword.value,
                newPassword: newPassword.value
            });

            setMessage(t('account.menu.changePassword.success'), false);
            emit('success');

            setTimeout(() => emit('cancel'), 1000);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { error?: string } } };
            const errorMsg = err.response?.data?.error || t('account.menu.changePassword.errors.failed');
            setMessage(errorMsg, true);

            if (errorMsg.includes('falsch')) {
                errors.current = t('account.menu.changePassword.errors.currentWrong');
            }
        } finally {
            submitting.value = false;
        }
    }

    return {
        currentPassword,
        newPassword,
        newPassword2,
        showCurrentPassword,
        showNewPassword,
        showNewPassword2,
        submitting,
        message,
        isError,
        errors,
        clearFieldError,
        submit
    };
}