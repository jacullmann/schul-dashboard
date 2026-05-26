import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useUserStore } from '@/stores/userStore';
import i18n from '@/i18n';

const routes = [
  {
    path: '/',
    redirect: '/home',
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
        path: 'home',
        name: 'home',
        component: () => import('@/core/pages/HomePage.vue'),
        meta: { title: 'navigation.home' },
      },

      {
        path: 'groups/:groupId',
        children: [
          {
            path: '',
            redirect: (to: any) => `/groups/${to.params.groupId}/items/all`,
          },
          {
            path: 'items/:type?/:itemId?',
            name: 'group-items',
            component: () => import('@/modules/tasks/pages/Tasks.vue'),
            props: true,
            meta: {
              title: 'tasks.list.title',
              requiresTenant: true,
              groupContext: true,
            },
          },
          {
            path: 'schedule',
            name: 'group-schedule',
            component: () => import('@/modules/schedule/pages/Schedule.vue'),
            meta: {
              title: 'schedule.title',
              requiresTenant: true,
              groupContext: true,
            },
          },
          {
            path: 'messages',
            name: 'group-messages',
            component: () => import('@/modules/chat/pages/Messages.vue'),
            meta: {
              title: 'common.sidebar.messages',
              requiresTenant: true,
              groupContext: true,
            },
          },
          {
            path: 'settings/:tab?',
            name: 'group-admin',
            component: () => import('@/modules/admin/pages/GroupSettings.vue'),
            meta: {
              title: 'navigation.group_admin',
              requiresTenant: true,
              groupContext: true,
              fullWidth: true,
            },
          },
        ],
      },

      {
        path: 'todos',
        name: 'private-todos',
        component: () => import('@/modules/tasks/pages/PrivateTasks.vue'),
        meta: { title: 'navigation.private_todos' },
      },
      {
        path: 'games',
        name: 'games',
        component: () => import('@/modules/games/Games.vue'),
        meta: { title: 'navigation.games' },
      },
      {
        path: 'games/:id',
        name: 'GameDetail',
        component: () => import('@/modules/games/GameDetail.vue'),
        props: true,
        meta: { title: 'navigation.game_detail' },
      },
      {
        path: 'imagetool',
        name: 'imagetool',
        component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
        meta: { title: 'navigation.image_tool' },
      },
      {
        path: 'info-dashboard',
        name: 'info-dashboard',
        component: () =>
          import('@/modules/infodashboard/pages/InfoDashboard.vue'),
        meta: { title: 'infodashboard.dashboard.title', fullWidth: true },
      },
    ],
  },

  {
    path: '/natural-intelligence',
    component: () => import('@/layouts/IntelligenceLayout.vue'),
    children: [
      {
        path: '',
        name: 'natural-intelligence',
        component: () => import('@/modules/chat/pages/NaturalIntelligence.vue'),
        meta: { title: 'navigation.natural_intelligence' },
      },
      {
        path: 'chat',
        name: 'natural-intelligence-chat',
        component: () => import('@/modules/chat/pages/ChatView.vue'),
        meta: { title: 'navigation.natural_intelligence_chat' },
      },
      {
        path: 'server',
        name: 'natural-intelligence-server',
        component: () => import('@/modules/chat/pages/ServerView.vue'),
        meta: { title: 'navigation.natural_intelligence_server' },
      },
      {
        path: 'admin',
        name: 'natural-intelligence-admin',
        component: () => import('@/modules/chat/pages/AdminView.vue'),
        meta: { title: 'navigation.natural_intelligence_admin' },
      },
    ],
  },

  {
    path: '/admin',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'super-admin',
        component: () =>
          import('@/modules/admin/pages/SuperAdminDashboard.vue'),
        meta: {
          title: 'navigation.super_admin',
          requiresSuperAdmin: true,
          fullWidth: true,
        },
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
const { isLoggedIn, isAuthReady, initAuth, activeGroupId, userGroups } =
  useAppAuth();

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
    to.path.startsWith('/natural-intelligence');

  if (!isPublicRoute && !isLoggedIn.value) {
    finish();
    return next({
      path: '/login',
      replace: true,
    });
  }

  if ((to.path === '/' || to.path === '/auth') && isLoggedIn.value) {
    finish();
    return next({
      path: activeGroupId.value
        ? `/groups/${activeGroupId.value}/items/all`
        : '/home',
      replace: true,
    });
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
    } catch {}
  }

  if (to.meta.requiresSuperAdmin) {
    if (!userStore.initialized) await userStore.fetchUser();
    if (!userStore.isSuperadmin) {
      finish();
      return next({ path: '/home', replace: true });
    }
  }

  if (to.meta.requiresGroupAdmin) {
    if (!userStore.initialized) await userStore.fetchUser();
    if (!userStore.isGroupAdmin && !userStore.isSuperadmin) {
      finish();
      return next({ path: '/home', replace: true });
    }
  }

  if (to.meta.requiresTenant && !activeGroupId.value) {
    finish();
    return next({ path: '/home', replace: true });
  }

  const routeGroupId = to.params.groupId as string | undefined;
  if (routeGroupId && routeGroupId !== activeGroupId.value) {
    if (!userStore.initialized) await userStore.fetchUser();
    const isMember = userGroups.value.some((g) => g.id === routeGroupId);
    if (!isMember && !userStore.isSuperadmin) {
      finish();
      return next({ path: '/home', replace: true });
    }

    const { switchActiveGroup } = useAppAuth();
    const result = await switchActiveGroup(routeGroupId);
    if (!result.ok) {
      finish();
      return next({ path: '/home', replace: true });
    }
  }

  next();
});

router.afterEach(() => finish());

export default router;
