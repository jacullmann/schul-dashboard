import { ref, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import type { PrivateTask } from '@/modules/tasks/types';
import { useToast } from '@/common/composables/useToast';

export function usePrivateTasks() {
    const { t } = useI18n();
    const userStore = useUserStore();
    const { user } = storeToRefs(userStore);

    const privateTasks = ref<PrivateTask[]>([]);
    const displayPrivateTasks = ref<PrivateTask[]>([]);
    const loading = ref(false);
    const openMenuId = ref<string | null>(null);

    const sortDisplayList = (data: PrivateTask[]): PrivateTask[] => {
        return [...data].sort((a, b) => {
            const posA = a.position || null;
            const posB = b.position || null;

            // Both have fractional-index positions: compare lexicographically
            if (posA && posB) {
                if (posA < posB) return -1;
                if (posA > posB) return 1;
                return 0;
            }

            // One has a position, the other doesn't: positioned items come first
            if (posA && !posB) return -1;
            if (!posA && posB) return 1;

            // Neither has a position: fall back to incomplete-first, then newest-first
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    };

    function addPrivateTask(privateTask: PrivateTask) {
        privateTasks.value.unshift(privateTask);
        displayPrivateTasks.value = sortDisplayList(privateTasks.value);
    }

    function updatePrivateTask(updatedPrivateTask: PrivateTask) {
        const index = privateTasks.value.findIndex(t => t.id === updatedPrivateTask.id);
        if (index !== -1) {
            const currentPrivateTask = privateTasks.value[index]!;
            privateTasks.value[index] = { ...currentPrivateTask, ...updatedPrivateTask };
            displayPrivateTasks.value = sortDisplayList(privateTasks.value);
        }
    }

    function toggleMenu(id: string) {
        openMenuId.value = openMenuId.value === id ? null : id;
    }

    const closeMenu = () => { openMenuId.value = null; };

    async function loadPrivateTasks() {
        if (!user.value) return;
        loading.value = true;
        try {
            const { data } = await hw.get('/api/todos');
            privateTasks.value = data;
            displayPrivateTasks.value = sortDisplayList(data);
        } catch (error) {
            useToast().error(t('school.private.errorLoad'));
        } finally {
            loading.value = false;
        }
    }

    // Intentionally not updating displayPrivateTasks here to avoid entries jumping around visually.
    async function togglePrivateTaskCompletion(privateTask: PrivateTask) {
        const previousState = privateTask.completed;
        privateTask.completed = !privateTask.completed;
        try {
            const { data } = await hw.patch(`/api/todos/${privateTask.id}/toggle`);
            privateTask.updatedAt = data.updatedAt;

            // Update the original privateTask array as well to ensure synchronization
            const index = privateTasks.value.findIndex(t => t.id === privateTask.id);
            if (index !== -1) {
                const currentPrivateTask = privateTasks.value[index]!;
                privateTasks.value[index] = {
                    ...currentPrivateTask,
                    completed: privateTask.completed,
                    updatedAt: privateTask.updatedAt
                };
            }
        } catch (error: unknown) {
            privateTask.completed = previousState;
            const err = error as { response?: { data?: { error?: string } } };
            useToast().error(err.response?.data?.error || t('global.errors.update'));
        }
    }

    async function duplicatePrivateTask(privateTask: PrivateTask) {
        loading.value = true;

        // We exclude id, createdAt, and updatedAt so the backend creates a fresh entry
        const duplicateData = {
            title: privateTask.title, // Optional: adds "(Copy)" to title
            description: privateTask.description,
            completed: false, // Duplicates start as incomplete even if the original is completed
        };

        try {
            const { data } = await hw.post('/api/todos', duplicateData);
            addPrivateTask(data);
            useToast().success(t('school.private.successDuplicate'));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            useToast().error(err.response?.data?.error || t('school.private.errorDuplicate'));
        } finally {
            loading.value = false;
        }
    }

    async function deletePrivateTask(id: string) {
        if (!confirm(t('school.private.deleteConfirm'))) return;
        const privateTaskIndex = privateTasks.value.findIndex(t => t.id === id);
        if (privateTaskIndex === -1) return;
        const deletedPrivateTask = privateTasks.value[privateTaskIndex]!;
        privateTasks.value.splice(privateTaskIndex, 1);
        try {
            await hw.delete(`/api/todos/${id}`);
            displayPrivateTasks.value = sortDisplayList(privateTasks.value);
            useToast().success(t('school.private.successDelete'));
        } catch (error: unknown) {
            privateTasks.value.splice(privateTaskIndex, 0, deletedPrivateTask);
            const err = error as { response?: { data?: { error?: string } } };
            useToast().error(err.response?.data?.error || t('global.errors.delete'));
        }
    }

    async function reorderPrivateTask(privateTaskId: string, prevPosition: string | null, nextPosition: string | null) {
        const privateTaskIndex = privateTasks.value.findIndex(t => t.id === privateTaskId);
        if (privateTaskIndex === -1) return;

        // Optimistic UI update: apply a temporary position so the item visually
        // moves immediately without waiting for the server.
        // Moving up:   prevPosition=null (or real), nextPosition=item above → use nextPos prepended
        // Moving down: prevPosition=item below, nextPosition=null (last slot) → use prevPos appended
        const privateTask = privateTasks.value[privateTaskIndex]!;
        if (prevPosition) {
            privateTask.position = prevPosition + 'z'; // sits after prevPosition lexicographically
        } else if (nextPosition) {
            privateTask.position = nextPosition + '0'; // sits before nextPosition
        }

        displayPrivateTasks.value = sortDisplayList(privateTasks.value);

        try {
            const { data } = await hw.patch(`/api/todos/${privateTaskId}/reorder`, {
                prevPosition,
                nextPosition
            });
            const updatedIndex = privateTasks.value.findIndex(t => t.id === privateTaskId);
            if (updatedIndex !== -1) {
                const currentPrivateTask = privateTasks.value[updatedIndex]!;
                privateTasks.value[updatedIndex] = { ...currentPrivateTask, position: data.position, updatedAt: data.updatedAt };
                displayPrivateTasks.value = sortDisplayList(privateTasks.value);
            }
        } catch (error: unknown) {
            loadPrivateTasks(); // Reload on error to restore consistent state
            const err = error as { response?: { data?: { error?: string } } };
            useToast().error(err.response?.data?.error || t('global.errors.update'));
        }
    }

    // Set up event listeners and watchers
    onMounted(() => {
        document.addEventListener('click', closeMenu);
        if (user.value) {
            loadPrivateTasks();
        }
    });

    watch(user, (newUser) => {
        if (newUser) {
            loadPrivateTasks();
        } else {
            privateTasks.value = [];
            displayPrivateTasks.value = [];
        }
    }, { immediate: true });

    onUnmounted(() => {
        document.removeEventListener('click', closeMenu);
    });

    return {
        user,
        privateTasks,
        displayPrivateTasks,
        loading,
        openMenuId,
        loadPrivateTasks,
        addPrivateTask,
        updatePrivateTask,
        toggleMenu,
        togglePrivateTaskCompletion,
        duplicatePrivateTask,
        deletePrivateTask,
        reorderPrivateTask,
    };
}