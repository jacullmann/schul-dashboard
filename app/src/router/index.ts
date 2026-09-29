import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useUserStore } from '@/stores/userStore';
import i18n from '@/i18n';
import { consumePendingInviteRoute } from '@/modules/auth/utils/pendingInvite';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/groups',
  },
  {
    path: '/login',
    component: () => import('@/layouts/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/modules/auth/pages/LoginPage.vue'),
        meta: { title: 'auth.login.login' },
      },
    ],
  },
  {
    path: '/register',
    component: () => import('@/layouts/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'register',
        component: () => import('@/modules/auth/pages/RegisterPage.vue'),
        meta: { title: 'auth.login.register' },
      },
    ],
  },
  {
    path: '/verify-mfa',
    component: () => import('@/layouts/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'verify-mfa',
        component: () => import('@/modules/auth/pages/MfaPage.vue'),
        meta: { title: 'auth.mfa.verify.title' },
      },
    ],
  },
  {
    path: '/forgot-password',
    component: () => import('@/layouts/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'forgot-password',
        component: () => import('@/modules/auth/pages/ForgotPasswordPage.vue'),
        meta: { title: 'auth.login.reset.title' },
      },
    ],
  },

  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: 'groups',
        name: 'groups',
        component: () => import('@/modules/groups/pages/Groups.vue'),
        meta: { title: 'navigation.home' },
      },

      {
        path: 'groups/:groupId',
        children: [
          {
            path: '',
            redirect: (to: any) => `/groups/${to.params.groupId}/dashboard`,
          },
          {
            path: 'dashboard',
            name: 'group-dashboard',
            component: () => import('@/modules/dashboard/pages/Dashboard.vue'),
            props: true,
            meta: {
              title: 'tasks.list.title',
              groupContext: true,
            },
          },
          {
            path: 'tasks',
            component: () => import('@/modules/tasks/pages/Tasks.vue'),
            meta: {
              title: 'tasks.list.title',
              groupContext: true,
              // An opened task keeps the tasks entry of the navigation active.
              navItem: 'group-tasks',
            },
            children: [
              {
                path: '',
                name: 'group-tasks',
                component: () => import('@/modules/tasks/pages/TaskList.vue'),
                // Links shared before tasks had a page of their own pointed
                // into the list.
                beforeEnter: (to) =>
                  typeof to.query.highlightedTask === 'string'
                    ? {
                        name: 'group-task',
                        params: {
                          groupId: to.params.groupId,
                          taskId: to.query.highlightedTask,
                        },
                        replace: true,
                      }
                    : true,
              },
              {
                path: ':taskId',
                name: 'group-task',
                component: () => import('@/modules/tasks/pages/TaskDetail.vue'),
                // The page caps its own content, so files can be dropped
                // across the whole view beside it.
                meta: { fullWidth: true },
              },
            ],
          },
          {
            path: 'schedule',
            name: 'group-schedule',
            component: () => import('@/modules/schedule/pages/Schedule.vue'),
            meta: {
              title: 'schedule.title',
              groupContext: true,
            },
          },
          {
            path: 'messages',
            name: 'group-messages',
            component: () => import('@/modules/chat/pages/Messages.vue'),
            meta: {
              title: 'common.sidebar.messages',
              groupContext: true,
            },
          },
          {
            path: 'settings/:tab?/:subTab?',
            name: 'group-admin',
            component: () => import('@/modules/groups/pages/GroupSettings.vue'),
            meta: {
              title: 'navigation.group_admin',
              groupContext: true,
              fullWidth: true,
            },
          },
        ],
      },

      {
        path: 'account/:tab?',
        name: 'account-settings',
        component: () => import('@/modules/auth/pages/AccountSettings.vue'),
        meta: { title: 'navigation.account_settings', fullWidth: true },
      },

      {
        path: 'private',
        name: 'private-todos',
        component: () => import('@/modules/tasks/pages/PrivateTasks.vue'),
        meta: { title: 'navigation.private_todos' },
      },
      {
        path: 'todos',
        redirect: '/private',
      },
      {
        path: 'imagetool',
        name: 'imagetool',
        component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
        meta: { title: 'navigation.image_tool' },
      },
    ],
  },

  {
    path: '/admin',
    component: () => import('@/layouts/DefaultLayout.vue'),
    meta: {
      title: 'navigation.super_admin',
      requiresSuperAdmin: true,
      fullWidth: true,
    },
    children: [
      {
        path: '',
        component: () =>
          import('@/modules/admin/pages/SuperAdminDashboard.vue'),
        children: [
          { path: '', redirect: { name: 'super-admin' } },
          {
            path: 'overview',
            name: 'super-admin',
            component: () =>
              import('@/modules/admin/pages/SuperAdminOverview.vue'),
          },
          {
            path: 'users',
            name: 'admin-users',
            component: () =>
              import('@/modules/admin/pages/SuperAdminUsers.vue'),
          },
          {
            path: 'reports',
            name: 'admin-reports',
            component: () =>
              import('@/modules/admin/pages/SuperAdminReports.vue'),
          },
          {
            path: 'groups',
            name: 'admin-groups',
            component: () =>
              import('@/modules/admin/pages/SuperAdminGroups.vue'),
          },
        ],
      },
    ],
  },

  {
    path: '/verify',
    component: () => import('@/layouts/SimpleLayout.vue'),
    children: [
      {
        path: '',
        name: 'verify-email',
        component: () => import('@/core/pages/VerifyEmail.vue'),
        meta: { title: 'navigation.verify_email' },
      },
    ],
  },
  {
    path: '/invite/:token',
    component: () => import('@/layouts/SimpleLayout.vue'),
    children: [
      {
        path: '',
        name: 'group-invite',
        component: () => import('@/core/pages/GroupInvite.vue'),
        props: true,
        meta: { title: 'navigation.group_invite' },
      },
    ],
  },

  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'not-found',
        component: () => import('@/core/pages/404-Page.vue'),
        meta: { title: 'navigation.not_found', fullWidth: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const { start, finish } = useLoadingBar();
const {
  isLoggedIn,
  isAuthReady,
  initAuth,
  homeRoute,
  canShowGroup,
  showGroup,
} = useAppAuth();

router.beforeEach(async (to, from, next) => {
  if (to.path !== from.path) start();

  if (!isAuthReady.value) await initAuth();

  const isPublicRoute =
    to.path === '/' ||
    to.path === '/login' ||
    to.path === '/register' ||
    to.path === '/verify-mfa' ||
    to.path === '/reset-password' ||
    to.path === '/forgot-password' ||
    to.path.startsWith('/verify') ||
    to.path.startsWith('/invite');

  if (!isPublicRoute && !isLoggedIn.value) {
    finish();
    return next({ path: '/login', replace: true });
  }

  // Resume an invite that was opened before signing in, regardless of which
  // auth flow (password, MFA, OAuth, registration) brought the user back.
  if (isLoggedIn.value && to.name !== 'group-invite') {
    const inviteRoute = consumePendingInviteRoute();
    if (inviteRoute) {
      finish();
      return next({ ...inviteRoute, replace: true });
    }
  }

  if (
    (to.path === '/' ||
      to.path === '/auth' ||
      to.path === '/login' ||
      to.path === '/register' ||
      to.path === '/verify-mfa' ||
      to.path === '/forgot-password' ||
      to.path === '/reset-password') &&
    isLoggedIn.value
  ) {
    finish();
    return next({ ...homeRoute.value, replace: true });
  }

  if (to.meta.title) {
    const translated = i18n.global.t(to.meta.title as string);
    if (to.path === '/') {
      document.title =
        translated || 'schul-dashboard | Free Management Tool For Students';
    } else {
      document.title = `${translated} | Dashboard`;
    }
  } else {
    document.title = 'Dashboard';
  }

  const userStore = useUserStore();
  if (isLoggedIn.value && !isPublicRoute && !userStore.initialized) {
    try {
      await userStore.fetchUser();
    } catch {
      // Navigation must not be blocked by a failed profile fetch.
    }
  }

  if (to.meta.requiresSuperAdmin) {
    if (!userStore.initialized) await userStore.fetchUser();
    if (!userStore.isSuperadmin) {
      finish();
      return next({ path: '/groups', replace: true });
    }
  }

  const routeGroupId = to.params.groupId;
  if (typeof routeGroupId === 'string' && !(await canShowGroup(routeGroupId))) {
    finish();
    return next({ name: 'groups', replace: true });
  }

  next();
});

router.afterEach((to, _from, failure) => {
  if (!failure) {
    const groupId = to.params.groupId;
    showGroup(typeof groupId === 'string' ? groupId : null);
  }
  finish();
});

export default router;
