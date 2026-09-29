<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Trash2, UserRoundPlus } from '@lucide/vue';
import {
  useSuperAdminGroups,
  GROUP_TYPE_FILTERS,
} from '../composables/useSuperAdminGroups';
import { useSuperAdminFormat } from '../composables/useSuperAdminFormat';
import AdminListToolbar from '../components/AdminListToolbar.vue';
import AdminPagination from '../components/AdminPagination.vue';
import AdminSortHeader from '../components/AdminSortHeader.vue';
import type { GroupTypeFilter } from '../types';

const {
  items: groups,
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
  invitingGroupId,
  inviteToGroup,
  deleteGroup,
} = useSuperAdminGroups();
const { fmtDate } = useSuperAdminFormat();
const { t } = useI18n();

const typeOptions = computed(() =>
  GROUP_TYPE_FILTERS.map((type) => ({
    value: type,
    label: t(`admin.groups.filters.${type}`),
  })),
);
</script>

<template>
  <PageHeader>
    {{ t('admin.groups.title') }}
    <template #action>
      <BaseButton variant="ghost" @click="reload">{{
        t('common.buttons.refresh')
      }}</BaseButton>
    </template>
  </PageHeader>

  <AdminListToolbar
    id="admin-group-search"
    v-model:search="searchInput"
    :placeholder="t('admin.groups.search_placeholder')"
  >
    <div class="sm:w-48">
      <BaseSelect
        :model-value="params.type"
        :options="typeOptions"
        :title="t('admin.groups.table.type')"
        @update:model-value="
          (type) => setParams({ type: type as GroupTypeFilter })
        "
      />
    </div>
  </AdminListToolbar>

  <div v-if="loading && !groups.length" class="flex justify-center p-10">
    <BaseSpinner on="ghost" size="24px" />
  </div>
  <div v-else-if="!groups.length" class="text-center text-on-ghost-muted p-10">
    {{ t('admin.groups.empty') }}
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
              :label="t('admin.groups.table.name')"
              field="name"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <th>{{ t('admin.groups.table.type') }}</th>
            <th>{{ t('admin.groups.table.owner') }}</th>
            <AdminSortHeader
              :label="t('admin.groups.table.members')"
              field="memberCount"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <AdminSortHeader
              :label="t('admin.groups.table.tasks')"
              field="itemCount"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <AdminSortHeader
              :label="t('admin.groups.table.created')"
              field="createdAt"
              :sort="params.sort"
              :order="params.order"
              @sort="toggleSort"
            />
            <th>{{ t('admin.groups.table.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in groups" :key="g.id">
            <td>{{ g.name }}</td>
            <td class="whitespace-nowrap">
              {{ t(`admin.groups.filters.${g.groupType}`) }}
            </td>
            <td>
              <div class="font-medium whitespace-nowrap">{{ g.ownerName }}</div>
              <div class="text-on-ghost-muted text-sm">{{ g.ownerEmail }}</div>
            </td>
            <td class="tabular-nums">{{ g.memberCount }}</td>
            <td class="tabular-nums">{{ g.itemCount }}</td>
            <td class="whitespace-nowrap text-sm text-on-ghost-muted">
              {{ fmtDate(g.createdAt) }}
            </td>
            <td class="py-0! px-2! min-w-0!">
              <div class="flex gap-0.5 justify-end">
                <BaseTooltip
                  :content="t('admin.groups.invite_tooltip')"
                  placement="bottom"
                >
                  <BaseButton
                    size="sm"
                    :icon="UserRoundPlus"
                    :loading="invitingGroupId === g.id"
                    @click="inviteToGroup(g)"
                  />
                </BaseTooltip>
                <BaseTooltip
                  :content="t('admin.groups.delete_tooltip')"
                  placement="bottom"
                >
                  <BaseButton
                    size="sm"
                    :icon="Trash2"
                    @click="deleteGroup(g)"
                  />
                </BaseTooltip>
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
</template>
