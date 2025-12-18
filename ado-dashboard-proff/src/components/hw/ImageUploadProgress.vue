<template>
  <div class="upload-progress-overlay" v-if="uploads.length > 0">
    <div class="upload-container">
      <div class="upload-header">
        <h4>{{ completedCount }} / {{ uploads.length }} Bilder hochgeladen</h4>
        <button
            v-if="allCompleted"
            class="btn-close"
            @click="clearAll"
            aria-label="Schließen"
        >
          ✕
        </button>
      </div>

      <div class="upload-list">
        <div
            v-for="upload in uploads"
            :key="upload.id"
            class="upload-item"
            :class="{
            'upload-complete': upload.status === 'complete',
            'upload-error': upload.status === 'error'
          }"
        >
          <!-- Thumbnail Preview -->
          <div class="upload-thumbnail">
            <img
                v-if="upload.preview"
                :src="upload.preview"
                :alt="upload.file.name"
                class="thumbnail-img"
            />
            <div v-else class="thumbnail-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          </div>

          <!-- Upload Info -->
          <div class="upload-info">
            <div class="upload-filename">{{ upload.file.name }}</div>
            <div class="upload-size">{{ formatFileSize(upload.file.size) }}</div>

            <!-- Progress Bar -->
            <div class="progress-bar-container" v-if="upload.status === 'uploading'">
              <div
                  class="progress-bar-fill"
                  :style="{ width: upload.progress + '%' }"
              >
                <div class="progress-shine"></div>
              </div>
              <span class="progress-text">{{ upload.progress }}%</span>
            </div>

            <!-- Status Messages -->
            <div v-if="upload.status === 'processing'" class="status-message processing">
              <div class="spinner-small"></div>
              Verarbeite...
            </div>
            <div v-if="upload.status === 'complete'" class="status-message complete">
              ✓ Erfolgreich hochgeladen
            </div>
            <div v-if="upload.status === 'error'" class="status-message error">
              ✗ {{ upload.error || 'Upload fehlgeschlagen' }}
            </div>
          </div>

          <!-- Status Icon -->
          <div class="upload-status-icon">
            <div v-if="upload.status === 'uploading'" class="spinner-icon"></div>
            <svg v-if="upload.status === 'complete'" class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <svg v-if="upload.status === 'error'" class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface UploadItem {
  id: string;
  file: File;
  preview: string | null;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

const uploads = ref<UploadItem[]>([]);

const completedCount = computed(() =>
    uploads.value.filter(u => u.status === 'complete').length
);

const allCompleted = computed(() =>
    uploads.value.length > 0 &&
    uploads.value.every(u => u.status === 'complete' || u.status === 'error')
);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function clearAll() {
  uploads.value = [];
}

function addUpload(file: File): string {
  const id = Math.random().toString(36).substring(7);

  // Create preview
  const reader = new FileReader();
  const upload: UploadItem = {
    id,
    file,
    preview: null,
    progress: 0,
    status: 'uploading',
  };

  uploads.value.push(upload);

  reader.onload = (e) => {
    const item = uploads.value.find(u => u.id === id);
    if (item) item.preview = e.target?.result as string;
  };
  reader.readAsDataURL(file);

  return id;
}

function updateProgress(id: string, progress: number) {
  const upload = uploads.value.find(u => u.id === id);
  if (upload) upload.progress = Math.min(100, Math.max(0, progress));
}

function setProcessing(id: string) {
  const upload = uploads.value.find(u => u.id === id);
  if (upload) {
    upload.status = 'processing';
    upload.progress = 100;
  }
}

function setComplete(id: string) {
  const upload = uploads.value.find(u => u.id === id);
  if (upload) upload.status = 'complete';
}

function setError(id: string, error: string) {
  const upload = uploads.value.find(u => u.id === id);
  if (upload) {
    upload.status = 'error';
    upload.error = error;
  }
}

defineExpose({
  addUpload,
  updateProgress,
  setProcessing,
  setComplete,
  setError,
  clearAll
});
</script>

<style scoped>
.upload-progress-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 420px;
  width: calc(100vw - 40px);
}

.upload-container {
  background: var(--lbg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.upload-header {
  padding: 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--llbg);
}

.upload-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.btn-close {
  background: transparent;
  border: none;
  color: var(--sub);
  cursor: pointer;
  font-size: 20px;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--border);
  color: var(--text);
}

.upload-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.upload-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vlbg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.upload-item:last-child {
  margin-bottom: 0;
}

.upload-complete {
  background: rgba(76, 175, 80, 0.05);
  border-color: rgba(76, 175, 80, 0.2);
}

.upload-error {
  background: rgba(246, 82, 82, 0.05);
  border-color: rgba(246, 82, 82, 0.2);
}

.upload-thumbnail {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--gg);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  color: var(--sub);
}

.upload-info {
  flex: 1;
  min-width: 0;
}

.upload-filename {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.upload-size {
  font-size: 11px;
  color: var(--sub);
  margin-bottom: 6px;
}

.progress-bar-container {
  position: relative;
  height: 6px;
  background: var(--gg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--lp));
  border-radius: 3px;
  transition: width 0.3s ease;
  position: relative;
  overflow: hidden;
}

.progress-shine {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent
  );
  animation: shine 1.5s infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  color: var(--text);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.status-message {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.status-message.processing {
  color: var(--primary);
}

.status-message.complete {
  color: var(--p-green);
}

.status-message.error {
  color: var(--danger);
}

.upload-status-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.spinner-icon,
.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-small {
  width: 14px;
  height: 14px;
  border-width: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.check-icon {
  width: 24px;
  height: 24px;
  stroke: var(--p-green);
  animation: checkmark 0.4s ease-in-out;
}

@keyframes checkmark {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.error-icon {
  width: 24px;
  height: 24px;
  stroke: var(--danger);
  animation: errorPop 0.4s ease-in-out;
}

@keyframes errorPop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@media (max-width: 768px) {
  .upload-progress-overlay {
    bottom: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
    width: auto;
  }

  .upload-list {
    max-height: 300px;
  }
}
</style>