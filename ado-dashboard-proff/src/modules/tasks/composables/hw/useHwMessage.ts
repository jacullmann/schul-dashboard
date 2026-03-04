import { ref } from 'vue';

export function useHwMessage() {
    const message = ref('');
    const isError = ref(false);

    // Prevents stale timeouts from clearing a newer message prematurely
    let messageTimerId: ReturnType<typeof setTimeout> | null = null;

    function flashMessage(text: string, error = false, durationMs = 5000) {
        if (messageTimerId) clearTimeout(messageTimerId);
        message.value = text;
        isError.value = error;
        messageTimerId = setTimeout(() => {
            message.value = '';
            isError.value = false;
            messageTimerId = null;
        }, durationMs);
    }

    function clearMessageTimer() {
        if (messageTimerId) clearTimeout(messageTimerId);
    }

    return {
        message,
        isError,
        flashMessage,
        clearMessageTimer
    };
}
