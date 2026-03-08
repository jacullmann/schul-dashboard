import { ref, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/userStore';
import hw from '@/api/hwApi';
import { useI18n } from 'vue-i18n';
import type { Todo } from '@/modules/tasks/types';

export function useTodoApp() {
    const { t } = useI18n();
    const userStore = useUserStore();
    const { user } = storeToRefs(userStore);

    const todos = ref<Todo[]>([]);
    const displayTodos = ref<Todo[]>([]);
    const loading = ref(false);
    const message = ref('');
    const isError = ref(false);
    const openMenuId = ref<string | null>(null);

    let messageTimerId: ReturnType<typeof setTimeout> | null = null;

    function showMessage(msg: string, error = false, durationMs = 5000) {
        if (messageTimerId) clearTimeout(messageTimerId);
        message.value = msg;
        isError.value = error;
        messageTimerId = setTimeout(() => {
            message.value = '';
            isError.value = false;
            messageTimerId = null;
        }, durationMs);
    }

    const sortDisplayList = (data: Todo[]): Todo[] => {
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

    function addTodo(todo: Todo) {
        todos.value.unshift(todo);
        displayTodos.value = sortDisplayList(todos.value);
    }

    function updateTodo(updatedTodo: Todo) {
        const index = todos.value.findIndex(t => t.id === updatedTodo.id);
        if (index !== -1) {
            const currentTodo = todos.value[index]!;
            todos.value[index] = { ...currentTodo, ...updatedTodo };
            displayTodos.value = sortDisplayList(todos.value);
        }
    }

    function toggleMenu(id: string) {
        openMenuId.value = openMenuId.value === id ? null : id;
    }

    const closeMenu = () => { openMenuId.value = null; };

    async function loadTodos() {
        if (!user.value) return;
        loading.value = true;
        try {
            const { data } = await hw.get('/api/todos');
            todos.value = data;
            displayTodos.value = sortDisplayList(data);
        } catch (error) {
            showMessage(t('school.private.errorLoad'), true);
        } finally {
            loading.value = false;
        }
    }

    // Hier absichtlich displayTodos nicht aktualisieren, da die einträge sonst komisch springen
    async function toggleTodoCompletion(todo: Todo) {
        const previousState = todo.completed;
        todo.completed = !todo.completed;
        try {
            const { data } = await hw.patch(`/api/todos/${todo.id}/toggle`);
            todo.updatedAt = data.updatedAt;

            // Update the original todo array as well to ensure synchronization
            const index = todos.value.findIndex(t => t.id === todo.id);
            if (index !== -1) {
                const currentTodo = todos.value[index]!;
                todos.value[index] = {
                    ...currentTodo,
                    completed: todo.completed,
                    updatedAt: todo.updatedAt
                };
            }
        } catch (error: unknown) {
            todo.completed = previousState;
            const err = error as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || t('global.errors.update'), true);
        }
    }

    async function duplicateTodo(todo: Todo) {
        loading.value = true;

        // We exclude id, createdAt, and updatedAt so the backend creates a fresh entry
        const duplicateData = {
            title: todo.title, // Optional: adds "(Copy)" to title
            description: todo.description,
            completed: false, // Duplicates start as incomplete even if the original is completed
        };

        try {
            const { data } = await hw.post('/api/todos', duplicateData);
            addTodo(data);
            showMessage(t('school.private.successDuplicate'));
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || t('school.private.errorDuplicate'), true);
        } finally {
            loading.value = false;
        }
    }

    async function deleteTodo(id: string) {
        if (!confirm(t('school.private.deleteConfirm'))) return;
        const todoIndex = todos.value.findIndex(t => t.id === id);
        if (todoIndex === -1) return;
        const deletedTodo = todos.value[todoIndex]!;
        todos.value.splice(todoIndex, 1);
        try {
            await hw.delete(`/api/todos/${id}`);
            displayTodos.value = sortDisplayList(todos.value);
            showMessage(t('school.private.successDelete'));
        } catch (error: unknown) {
            todos.value.splice(todoIndex, 0, deletedTodo);
            const err = error as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || t('global.errors.delete'), true);
        }
    }

    async function reorderTodo(todoId: string, prevPosition: string | null, nextPosition: string | null) {
        const todoIndex = todos.value.findIndex(t => t.id === todoId);
        if (todoIndex === -1) return;

        // Optimistic UI update: apply a temporary position so the item visually
        // moves immediately without waiting for the server.
        // Moving up:   prevPosition=null (or real), nextPosition=item above → use nextPos prepended
        // Moving down: prevPosition=item below, nextPosition=null (last slot) → use prevPos appended
        const todo = todos.value[todoIndex]!;
        if (prevPosition) {
            todo.position = prevPosition + 'z'; // sits after prevPosition lexicographically
        } else if (nextPosition) {
            todo.position = nextPosition + '0'; // sits before nextPosition
        }

        displayTodos.value = sortDisplayList(todos.value);

        try {
            const { data } = await hw.patch(`/api/todos/${todoId}/reorder`, {
                prevPosition,
                nextPosition
            });
            const updatedIndex = todos.value.findIndex(t => t.id === todoId);
            if (updatedIndex !== -1) {
                const currentTodo = todos.value[updatedIndex]!;
                todos.value[updatedIndex] = { ...currentTodo, position: data.position, updatedAt: data.updatedAt };
                displayTodos.value = sortDisplayList(todos.value);
            }
        } catch (error: unknown) {
            loadTodos(); // Bei Fehler neu laden
            const err = error as { response?: { data?: { error?: string } } };
            showMessage(err.response?.data?.error || t('global.errors.update'), true);
        }
    }

    // Set up event listeners and watchers
    onMounted(() => {
        document.addEventListener('click', closeMenu);
        if (user.value) {
            loadTodos();
        }
    });

    watch(user, (newUser) => {
        if (newUser) {
            loadTodos();
        } else {
            todos.value = [];
            displayTodos.value = [];
        }
    }, { immediate: true });

    onUnmounted(() => {
        document.removeEventListener('click', closeMenu);
        if (messageTimerId) clearTimeout(messageTimerId);
    });

    return {
        user,
        todos,
        displayTodos,
        loading,
        message,
        isError,
        openMenuId,
        loadTodos,
        addTodo,
        updateTodo,
        toggleMenu,
        toggleTodoCompletion,
        duplicateTodo,
        deleteTodo,
        reorderTodo,
    };
}