<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, type RouteLocationRaw } from 'vue-router';
import {
  useSuperAdminUsers,
  USER_STATUS_FILTERS,
} from '../composables/useSuperAdminUsers';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';
import AdminListToolbar from '../components/AdminListToolbar.vue';
import AdminPagination from '../components/AdminPagination.vue';
import AdminSortHeader from '../components/AdminSortHeader.vue';
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
} = useSuperAdminUsers();
const { fmtDate } = useSuperAdminFormat();
const { t } = useI18n();
const router = useRouter();

const statusOptions = computed(() =>
  USER_STATUS_FILTERS.map((status) => ({
    value: status,
    label: t(`admin.users.filters.${status}`),
  })),
);

const userRoute = (user: SuperAdminUser): RouteLocationRaw => ({
  name: 'admin-user',
  params: { userId: user.id },
});

/**
 * The whole row opens the user. The email inside is a real link, so the row
 * can also be reached by keyboard and opened in a new tab; clicks on it are
 * left to the link.
 */
function openUser(user: SuperAdminUser, event: MouseEvent) {
  if (event.target instanceof Element && event.target.closest('a')) return;
  // Selecting an address to copy it is no request to open the user.
  if (window.getSelection()?.toString()) return;
  void router.push(userRoute(user));
}
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
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="u in users"
            :key="u.id"
            class="group cursor-pointer"
            :class="{ 'row-banned': u.isBanned }"
            @click="openUser(u, $event)"
          >
            <td>
              <RouterLink :to="userRoute(u)" class="group-hover:underline">{{
                u.email
              }}</RouterLink>
            </td>
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
            </td>
            <td class="cell-date">{{ fmtDate(u.createdAt) }}</td>
            <td class="cell-date">
              {{ u.lastLoginAt ? fmtDate(u.lastLoginAt) : '—' }}
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
