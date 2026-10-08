<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Ban, Unlock, Trash2, FileText, ShieldOff } from '@lucide/vue';
import {
  useSuperAdminUsers,
  USER_STATUS_FILTERS,
} from '../composables/useSuperAdminUsers';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';
import AdminListToolbar from '../components/AdminListToolbar.vue';
import AdminPagination from '../components/AdminPagination.vue';
import AdminSortHeader from '../components/AdminSortHeader.vue';
import UserDetailsDrawer from '../components/UserDetailsDrawer.vue';
import type { SuperAdminUser, UserStatusFilter } from '../types';

const {
  items: users,
  params,
  page,
  total,
  pageCount,
  loading,
  searchInput,
  setParams,
  setPage,
  toggleSort,
  reload,
  toggleBan,
  resetMfa,
  deleteUser,
} = useSuperAdminUsers();
const { fmtDate } = useSuperAdminFormat();
const { t } = useI18n();

const statusOptions = computed(() =>
  USER_STATUS_FILTERS.map((status) => ({
    value: status,
    label: t(`admin.users.filters.${status}`),
  })),
);

const selectedUser = ref<SuperAdminUser | null>(null);
</script>

<template>
  <PageHeader>
    {{ t('admin.users.title') }}
    <template #action>
      <BaseButton variant="ghost" @click="reload">{{
        t('common.buttons.refresh')
      }}</BaseButton>
    </template>
  </PageHeader>

  <AdminListToolbar
    id="admin-user-search"
    v-model:search="searchInput"
    :placeholder="t('admin.users.search_placeholder')"
  >
    <div class="sm:w-48">
      <BaseSelect
        :model-value="params.status"
        :options="statusOptions"
        :title="t('admin.users.table.status')"
        @update:model-value="
          (status) => setParams({ status: status as UserStatusFilter })
        "
      />
    </div>
  </AdminListToolbar>

  <div v-if="loading && !users.length" class="flex justify-center p-10">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <div v-else-if="!users.length" class="text-center text-on-ghost-muted p-10">
    {{ t('admin.users.empty') }}
  </div>
  <template v-else>
    <BaseTableWrapper
      :class="{ 'opacity-60 pointer-events-none': loading }"
      :aria-busy="loading"
    >
      <table>
        <thead>
          <tr>
            <AdminSortHeader
              :label="t('admin.users.table.email')"
              field="email"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <th>{{ t('admin.users.table.username') }}</th>
            <th>{{ t('admin.users.table.status') }}</th>
            <AdminSortHeader
              :label="t('admin.users.table.registered')"
              field="createdAt"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <AdminSortHeader
              :label="t('admin.users.table.last_login')"
              field="lastLoginAt"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <th>{{ t('admin.users.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            :class="{ 'row-banned': u.isBanned }"
          >
            <td>{{ u.email }}</td>
            <td class="whitespace-nowrap">{{ u.username }}</td>
            <td class="whitespace-nowrap">
              <span v-if="u.isSuperadmin" class="badge text-indigo-500">{{
                t('admin.users.status.admin')
              }}</span>
              <span v-else-if="u.isBanned" class="badge text-danger">{{
                t('admin.users.status.banned')
              }}</span>
              <span v-else class="badge text-success">{{
                t('admin.users.status.active')
              }}</span>
              <span v-if="!u.emailVerified" class="badge text-warn">{{
                t('admin.users.status.unverified')
              }}</span>
            </td>
            <td class="cell-date">{{ fmtDate(u.createdAt) }}</td>
            <td class="cell-date">
              {{ u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—' }}
            </td>
            <td class="py-0! px-2! min-w-0!">
              <div class="flex gap-0.5 justify-end">
                <BaseTooltip
                  :content="t('admin.users.actions.details')"
                  placement="bottom"
                >
                  <BaseButton
                    size="sm"
                    :icon="FileText"
                    @click="selectedUser = u"
                  />
                </BaseTooltip>
                <BaseTooltip
                  v-if="u.mfaEnabled"
                  :content="t('admin.users.actions.reset_mfa')"
                  placement="bottom"
                >
                  <BaseButton
                    size="sm"
                    :icon="ShieldOff"
                    @click="resetMfa(u)"
                  />
                </BaseTooltip>
                <template v-if="!u.isSuperadmin">
                  <BaseTooltip
                    :content="
                      u.isBanned
                        ? t('admin.users.actions.unban')
                        : t('admin.users.actions.ban')
                    "
                    placement="bottom"
                  >
                    <BaseButton
                      size="sm"
                      :icon="u.isBanned ? Unlock : Ban"
                      @click="toggleBan(u)"
                    />
                  </BaseTooltip>
                  <BaseTooltip
                    :content="t('common.buttons.delete')"
                    placement="bottom"
                  >
                    <BaseButton
                      size="sm"
                      :icon="Trash2"
                      @click="deleteUser(u)"
                    />
                  </BaseTooltip>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </BaseTableWrapper>

    <AdminPagination
      :page="page"
      :page-count="pageCount"
      :total="total"
      @update:page="setPage"
    />
  </template>

  <UserDetailsDrawer :user="selectedUser" @close="selectedUser = null" />
</template>

<style scoped>
.row-banned td {
  color: var(--color-on-ghost-muted);
}

.cell-date {
  font-size: var(--text-sm);
  color: var(--color-on-ghost-muted);
  white-space: nowrap;
}

.badge {
  font-size: var(--text-xs);
  font-weight: 600;
  margin-right: 12px;
}
</style>
