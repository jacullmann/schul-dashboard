// src/composables/useDocEditor.ts

import { ref, computed, onUnmounted, readonly } from 'vue';
import { io, Socket } from 'socket.io-client';
import hw from '../hwApi';

// Typen
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface DocEditorState {
    content: string;
    version: number;
    lastEditedBy: string | null;
    lastEditedAt: string | null;
}

// Debounce-Hilfsfunktion
// Update this function
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const debounced = (...args: any[]) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };

    // Add a cancel method
    debounced.cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    return debounced;
}

// Composable exportieren
export function useDocEditor() {
    // State
    const connectionState = ref<ConnectionState>('disconnected');
    const docContent = ref<string>('');
    const docVersion = ref<number>(0);
    const lastEditedBy = ref<string | null>(null);
    const lastEditedAt = ref<string | null>(null);
    const onlineAdmins = ref<string[]>([]);
    const isSaving = ref(false);
    const saveError = ref<string | null>(null);
    const conflictDetected = ref(false);

    // Lokale Version zum Conflict-Check mitschicken
    let localVersion = 0;

    // Ob man selbst gerade eine Änderung gesendet hat (Eigene Updates nicht re-applyen)
    let isSendingUpdate = false;

    // Socket-Instanz
    let socket: Socket | null = null;

    // Computed
    const isConnected = computed(() => connectionState.value === 'connected');
    const isConnecting = computed(() => connectionState.value === 'connecting');

    // Socket.io Verbindung aufbauen
    function connect() {
        if (socket?.connected) return;

        connectionState.value = 'connecting';

        socket = io(`${import.meta.env.VITE_HW_API_BASE}/doc`, {
            // Cookies werden automatisch mitgeschickt (withCredentials)
            withCredentials: true,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1500,
            reconnectionAttempts: 10,
        });

        // Verbindungsevents
        socket.on('connect', () => {
            console.log('[DocEditor] Socket verbunden:', socket?.id);
            connectionState.value = 'connected';
            conflictDetected.value = false;
        });

        socket.on('disconnect', (reason) => {
            console.log('[DocEditor] Socket getrennt:', reason);
            connectionState.value = 'disconnected';
            onlineAdmins.value = [];
        });

        socket.on('connect_error', (err) => {
            console.error('[DocEditor] Verbindungsfehler:', err.message);
            // AUTH-Fehler → spezielle Nachricht
            if (err.message.includes('AUTH')) {
                connectionState.value = 'error';
            } else {
                connectionState.value = 'disconnected';
            }
        });

        // Dokument-Evens

        // Initialer Stand beim Verbinden
        socket.on('doc:init', (payload: {
            content: string;
            version: number;
            lastEditedBy: string | null;
            lastEditedAt: string | null;
            onlineAdmins: string[];
        }) => {
            docContent.value = payload.content;
            docVersion.value = payload.version;
            localVersion = payload.version;
            lastEditedBy.value = payload.lastEditedBy;
            lastEditedAt.value = payload.lastEditedAt;
            onlineAdmins.value = payload.onlineAdmins;
        });

        // Update von einem anderen Client
        // Update von einem anderen Client
        socket.on('doc:update', (payload: {
            content: string;
            version: number;
            editedBy: string;
        }) => {
            // 1. STOP LOOP: If the content is identical, do nothing.
            // This prevents the editor from re-rendering and killing the cursor
            // if the server echoes back our own text.
            if (docContent.value === payload.content) {
                // Just sync the version numbers silently
                docVersion.value = payload.version;
                localVersion = payload.version;
                return;
            }

            // 2. CANCEL PENDING: If we were about to send an old version, stop it.
            // Server truth wins.
            sendUpdate.cancel();
            isSendingUpdate = false;

            // 3. Apply update
            docContent.value = payload.content;
            docVersion.value = payload.version;
            localVersion = payload.version;
            lastEditedBy.value = payload.editedBy;
            lastEditedAt.value = new Date().toISOString();
        });

        // ACK vom Server nach eigenem Update
        socket.on('doc:ack', (payload: { version: number }) => {
            docVersion.value = payload.version;
            localVersion = payload.version;
            isSendingUpdate = false;
        });

        // Konflikt: Server hat neuere Version
        socket.on('doc:conflict', (payload: {
            serverContent: string;
            serverVersion: number;
            lastEditedBy: string;
        }) => {
            console.warn('[DocEditor] Konflikt erkannt – Server-Version übernommen');
            conflictDetected.value = true;
            docContent.value = payload.serverContent;
            docVersion.value = payload.serverVersion;
            localVersion = payload.serverVersion;
            lastEditedBy.value = payload.lastEditedBy;
            isSendingUpdate = false;

            // Konflikt-Banner nach 4 Sekunden ausblenden
            setTimeout(() => { conflictDetected.value = false; }, 4000);
        });

        // Online-Admins-Liste aktualisiert
        socket.on('doc:admins-update', (payload: { onlineAdmins: string[] }) => {
            onlineAdmins.value = payload.onlineAdmins;
        });
    }

    // Update zum Server senden mit 400ms debounce
    const sendUpdate = debounce((newContent: string) => {
        if (!socket?.connected) return;
        isSendingUpdate = true;
        socket.emit('doc:update', {
            content: newContent,
            clientVersion: localVersion,
        });
    }, 400);

    // Wird vom Editor aufgerufen wenn sich Inhalt ändert
    function onContentChange(newContent: string) {
        docContent.value = newContent;
        sendUpdate(newContent);
    }

    // Manuelles speichern
    async function saveNow(): Promise<void> {
        if (isSaving.value) return;
        isSaving.value = true;
        saveError.value = null;
        try {
            const { data } = await hw.post('/api/doc/save');
            docVersion.value = data.version;
            localVersion = data.version;
        } catch (err: any) {
            saveError.value = err.response?.data?.error ?? 'Fehler beim Speichern';
        } finally {
            isSaving.value = false;
        }
    }

    // Dokument per REST laden
    async function loadDoc(): Promise<void> {
        try {
            const { data } = await hw.get('/api/doc');
            docContent.value = data.content ?? '';
            docVersion.value = data.version ?? 0;
            localVersion = data.version ?? 0;
            lastEditedBy.value = data.lastEditedBy ?? null;
            lastEditedAt.value = data.lastEditedAt ?? null;
        } catch (err) {
            console.error('[DocEditor] Fehler beim Laden:', err);
        }
    }

    // Beim unmounten der Componente Verbindung trennen
    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        connectionState.value = 'disconnected';
        onlineAdmins.value = [];
    }

    onUnmounted(() => {
        disconnect();
    });

    // Öffentliche API
    return {
        connectionState: readonly(connectionState),
        docContent,           // writable damit v-model im Editor funktioniert
        docVersion: readonly(docVersion),
        lastEditedBy: readonly(lastEditedBy),
        lastEditedAt: readonly(lastEditedAt),
        onlineAdmins: readonly(onlineAdmins),
        isSaving: readonly(isSaving),
        saveError: readonly(saveError),
        conflictDetected: readonly(conflictDetected),

        // Computed
        isConnected,
        isConnecting,

        // Actions
        connect,
        disconnect,
        onContentChange,
        saveNow,
        loadDoc,
    };
}