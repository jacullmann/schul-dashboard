<script setup lang="ts">
import { onMounted } from 'vue';
import { ArrowUpRight, Check, RotateCcw, Trash2 } from '@lucide/vue';
import ItemCard from '@/modules/tasks/components/ItemCard.vue';
import { makeThumb } from '@/modules/tasks/composables/useImageUpload';
import { useSuperAdminReports } from '../composables/useSuperAdminReports';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';

const {
  reports,
  loadingReports,
  unprocessedReports,
  processedReports,
  loadReports,
  toggleReportProcessed,
  deleteReport,
} = useSuperAdminReports();
const { getTypeLabel, getSubjectName, fmtDate } = useSuperAdminFormat();

onMounted(loadReports);
</script>

<template>
  <h2 class="page-title">Reported Content</h2>

  <div v-if="loadingReports" class="center-loader">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <div v-else-if="!reports.length" class="empty-msg">No reports found.</div>
  <template v-else>
    <div v-if="unprocessedReports.length" class="report-section">
      <h3 class="sub-heading">Open ({{ unprocessedReports.length }})</h3>
      <div class="card-grid">
        <template v-for="r in unprocessedReports" :key="r.id">
          <!-- Task reports -->
          <template v-if="!r.reportType || r.reportType === 'task'">
            <ItemCard
              v-if="r.itemType"
              :title="r.itemTitle"
              :show-menu-trigger="false"
              :is-collapsed="false"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span>{{ getTypeLabel(r.itemType) }}</span>
                  <span>·</span>
                  <span>{{ getSubjectName(r.itemSubject) }}</span>
                  <span>·</span>
                  <span>Due: {{ fmtDate(r.itemDueDate) }}</span>
                  <template v-if="r.creatorEmail">
                    <span>·</span>
                    <span>By: {{ r.creatorEmail }}</span>
                  </template>
                </div>
              </template>

              <template #actions-pre>
                <BaseTooltip content="View full task" placement="bottom">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    :icon="ArrowUpRight"
                    @click.stop="
                      $router.push({
                        name: 'group-tasks',
                        params: { groupId: r.itemTenantId },
                        query: {
                          type: r.itemType,
                          itemId: r.itemId,
                        },
                      })
                    "
                  />
                </BaseTooltip>
              </template>

              <template v-if="r.itemDescription" #body>
                <div
                  class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
                >
                  {{ r.itemDescription }}
                </div>
              </template>

              <template #content-after>
                <div
                  v-if="r.itemImages && r.itemImages.length"
                  class="grid grid-cols-4 gap-2 mt-2 mb-2"
                >
                  <div
                    v-for="img in r.itemImages"
                    :key="img.publicId"
                    class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
                  >
                    <img
                      :src="makeThumb(img.metadata?.thumbnailId || img.publicId)"
                      class="block h-full w-full object-cover [pointer-events:none]"
                      alt="Vorschau"
                    />
                  </div>
                </div>

                <div
                  v-if="r.itemEditorNote"
                  class="note-section mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">Note:</div>
                  <div
                    class="text-on-ghost text-base whitespace-pre-wrap break-words"
                  >
                    {{ r.itemEditorNote }}
                  </div>
                </div>

                <div
                  v-if="r.reason"
                  class="report-reason-box mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>

                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Check"
                    @click="toggleReportProcessed(r.id, false)"
                  >
                    Resolve
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>

            <ItemCard
              v-else
              :title="r.itemTitle + ' (Deleted)'"
              :show-menu-trigger="false"
              :is-collapsed="false"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span class="badge badge-red">Deleted Item</span>
                </div>
              </template>
              <template #content-after>
                <div v-if="r.reason" class="report-reason-box mt-2">
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>
                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Check"
                    @click="toggleReportProcessed(r.id, false)"
                  >
                    Resolve
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>
          </template>

          <!-- Message reports -->
          <template v-else-if="r.reportType === 'message'">
            <ItemCard
              :title="r.messageSenderEmail ? `Message by ${r.messageSenderEmail}` : 'Message (Sender Deleted)'"
              :show-menu-trigger="false"
              :is-collapsed="false"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span class="badge badge-yellow">Chat Message</span>
                  <template v-if="!r.messageId">
                    <span>·</span>
                    <span class="badge badge-red">Deleted</span>
                  </template>
                </div>
              </template>

              <template v-if="r.messageContent" #body>
                <div
                  class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
                >
                  {{ r.messageContent }}
                </div>
              </template>

              <template #content-after>
                <div
                  v-if="r.reason"
                  class="report-reason-box mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>

                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Check"
                    @click="toggleReportProcessed(r.id, false)"
                  >
                    Resolve
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>
          </template>
        </template>
      </div>
    </div>

    <div v-if="processedReports.length" class="report-section">
      <h3 class="sub-heading muted">
        Processed ({{ processedReports.length }})
      </h3>
      <div class="card-grid">
        <template v-for="r in processedReports" :key="r.id">
          <!-- Task reports -->
          <template v-if="!r.reportType || r.reportType === 'task'">
            <ItemCard
              v-if="r.itemType"
              :title="r.itemTitle"
              :show-menu-trigger="false"
              :is-collapsed="false"
              class="opacity-60 hover:opacity-100"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span>{{ getTypeLabel(r.itemType) }}</span>
                  <span>·</span>
                  <span>{{ getSubjectName(r.itemSubject) }}</span>
                  <span>·</span>
                  <span>Due: {{ fmtDate(r.itemDueDate) }}</span>
                  <template v-if="r.creatorEmail">
                    <span>·</span>
                    <span>By: {{ r.creatorEmail }}</span>
                  </template>
                </div>
              </template>

              <template #actions-pre>
                <BaseTooltip content="View full task" placement="bottom">
                  <BaseButton
                    variant="ghost"
                    size="sm"
                    :icon="ArrowUpRight"
                    @click.stop="
                      $router.push({
                        name: 'group-tasks',
                        params: { groupId: r.itemTenantId },
                        query: {
                          type: r.itemType,
                          itemId: r.itemId,
                        },
                      })
                    "
                  />
                </BaseTooltip>
              </template>

              <template v-if="r.itemDescription" #body>
                <div
                  class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
                >
                  {{ r.itemDescription }}
                </div>
              </template>

              <template #content-after>
                <div
                  v-if="r.itemImages && r.itemImages.length"
                  class="grid grid-cols-4 gap-2 mt-2 mb-2"
                >
                  <div
                    v-for="img in r.itemImages"
                    :key="img.publicId"
                    class="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border-none bg-black/[0.12] select-none"
                  >
                    <img
                      :src="makeThumb(img.metadata?.thumbnailId || img.publicId)"
                      class="block h-full w-full object-cover [pointer-events:none]"
                      alt="Vorschau"
                    />
                  </div>
                </div>

                <div
                  v-if="r.itemEditorNote"
                  class="note-section mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">Note:</div>
                  <div
                    class="text-on-ghost text-base whitespace-pre-wrap break-words"
                  >
                    {{ r.itemEditorNote }}
                  </div>
                </div>

                <div
                  v-if="r.reason"
                  class="report-reason-box mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>

                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="RotateCcw"
                    @click="toggleReportProcessed(r.id, true)"
                  >
                    Reopen
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>

            <ItemCard
              v-else
              :title="r.itemTitle + ' (Deleted)'"
              :show-menu-trigger="false"
              :is-collapsed="false"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span class="badge badge-green">Resolved</span>
                  <span>·</span>
                  <span class="badge badge-red">Deleted Item</span>
                </div>
              </template>
              <template #content-after>
                <div v-if="r.reason" class="report-reason-box mt-2">
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>
                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="RotateCcw"
                    @click="toggleReportProcessed(r.id, true)"
                  >
                    Reopen
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>
          </template>

          <!-- Message reports -->
          <template v-else-if="r.reportType === 'message'">
            <ItemCard
              :title="r.messageSenderEmail ? `Message by ${r.messageSenderEmail}` : 'Message (Sender Deleted)'"
              :show-menu-trigger="false"
              :is-collapsed="false"
              class="opacity-60 hover:opacity-100"
            >
              <template #badges>
                <div
                  class="text-on-ghost-muted text-base flex flex-wrap gap-1 items-center"
                >
                  <span class="badge badge-green">Resolved</span>
                  <span>·</span>
                  <span class="badge badge-yellow">Chat Message</span>
                  <template v-if="!r.messageId">
                    <span>·</span>
                    <span class="badge badge-red">Deleted</span>
                  </template>
                </div>
              </template>

              <template v-if="r.messageContent" #body>
                <div
                  class="text-on-ghost break-words [overflow-wrap:anywhere] hyphens-auto whitespace-pre-wrap select-text cursor-text"
                >
                  {{ r.messageContent }}
                </div>
              </template>

              <template #content-after>
                <div
                  v-if="r.reason"
                  class="report-reason-box mt-2 pt-1 border-t border-surface-border"
                >
                  <div class="text-on-ghost text-base font-bold mb-1">
                    Report Reason:
                  </div>
                  <div class="report-reason italic">"{{ r.reason }}"</div>
                </div>
                <div class="report-meta mt-1 text-xs text-on-ghost-muted">
                  From: {{ r.reporterEmail }} · {{ fmtDate(r.reportedAt) }}
                </div>

                <div
                  class="report-actions mt-3 pt-2 border-t border-surface-border flex gap-2"
                >
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="RotateCcw"
                    @click="toggleReportProcessed(r.id, true)"
                  >
                    Reopen
                  </BaseButton>
                  <BaseButton
                    class="tiny"
                    variant="ghost"
                    :icon="Trash2"
                    @click="deleteReport(r.id)"
                  >
                    Delete
                  </BaseButton>
                </div>
              </template>
            </ItemCard>
          </template>
        </template>
      </div>
    </div>
  </template>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 24px;
}

.center-loader {
  display: flex;
  justify-content: center;
  padding: 40px;
}
.empty-msg {
  text-align: center;
  color: var(--color-on-ghost-muted);
  padding: 40px;
}

.sub-heading {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 12px;
}
.sub-heading.muted {
  color: var(--color-on-ghost-muted);
}

.report-section {
  margin-bottom: 32px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.report-reason {
  color: var(--color-on-ghost-muted);
  font-size: var(--text-base);
  line-height: 1.4;
  margin-bottom: 8px;
}
.report-meta {
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
  margin-bottom: 10px;
}
.report-actions {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-right: 4px;
}
.badge-green {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.badge-yellow {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}
.badge-red {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.tiny {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
