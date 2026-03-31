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
        meta: { title: 'account.auth.login' },
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
        meta: { title: 'account.auth.register' },
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
        meta: { title: 'account.mfa.verify.title' },
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
        meta: { title: 'account.auth.reset.title' },
      },
    ],
  },

  // ── Default Layout (header + footer) ────────────────────────────────
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

      // ── Group-scoped pages ──────────────────────────────────────
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
              title: 'school.tasks.title',
              requiresTenant: true,
              groupContext: true,
            },
          },
          {
            path: 'schedule',
            name: 'group-schedule',
            component: () => import('@/modules/schedule/pages/Schedule.vue'),
            meta: {
              title: 'school.tables.schedule.title',
              requiresTenant: true,
              groupContext: true,
            },
          },
          {
            path: 'admin',
            name: 'group-admin',
            component: () =>
              import('@/modules/admin/pages/GroupAdminDashboard.vue'),
            meta: {
              title: 'navigation.groupAdmin',
              requiresGroupAdmin: true,
              groupContext: true,
            },
          },
        ],
      },

      // ── User-scoped pages ───────────────────────────────────────
      {
        path: 'todos',
        name: 'private-todos',
        component: () => import('@/modules/tasks/pages/PrivateTasks.vue'),
        meta: { title: 'navigation.privateTodos' },
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
        meta: { title: 'navigation.gameDetail' },
      },
      {
        path: 'imagetool',
        name: 'imagetool',
        component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
        meta: { title: 'navigation.imageTool' },
      },
      {
        path: 'info-dashboard',
        name: 'info-dashboard',
        component: () =>
          import('@/modules/infodashboard/pages/InfoDashboard.vue'),
        meta: { title: 'info.dashboard.title', fullWidth: true },
      },
      {
        path: 'brain',
        name: 'brain-library',
        component: () => import('@/modules/brain/pages/BrainLibrary.vue'),
        meta: { title: 'navigation.brainLibrary' },
      },
      {
        path: 'brain/:testId',
        name: 'brain-test',
        component: () => import('@/modules/brain/pages/BrainTest.vue'),
        meta: { title: 'navigation.brainTest' },
      },
    ],
  },

  // ── Super Admin Dashboard ───────────────────────────────────────────
  {
    path: '/admin',
    name: 'super-admin',
    component: () => import('@/modules/admin/pages/SuperAdminDashboard.vue'),
    meta: {
      title: 'navigation.superAdmin',
      requiresSuperAdmin: true,
      fullWidth: true,
    },
  },

  // ── Verify Email ────────────────────────────────────────────────────
  {
    path: '/verify',
    component: () => import('@/layouts/SimpleLayout.vue'),
    children: [
      {
        path: '',
        name: 'verify-email',
        component: () => import('@/core/pages/VerifyEmail.vue'),
        meta: { title: 'navigation.verifyEmail' },
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────────
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/layouts/DefaultLayout.vue'),
    children: [
      {
        path: '',
        name: 'not-found',
        component: () => import('@/core/pages/404-Page.vue'),
        meta: { title: 'navigation.notFound', fullWidth: true },
      },
    ],
  },
];

// ─── Router Instance ─────────────────────────────────────────────────────────

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const { start, finish } = useLoadingBar();
const { isLoggedIn, isAuthReady, initAuth, activeGroupId, userGroups } =
  useAppAuth();

// ─── Navigation Guard ─────────────────────────────────────────────────────────

router.beforeEach(async (to, from, next) => {
  if (to.path !== from.path) start();

  // Ensure auth is initialized exactly once on first navigation.
  if (!isAuthReady.value) await initAuth();

  const isPublicRoute =
    to.path === '/' ||
    to.path === '/login' ||
    to.path === '/register' ||
    to.path === '/mfa-verification' ||
    to.path === '/reset-password' ||
    to.path === '/forgott-password' ||
    to.path.startsWith('/verify')

  // ── Unauthenticated users → login page (internal) ────────────────────────────────
  if (!isPublicRoute && !isLoggedIn.value) {
    finish();
    return next({
      path: '/login',
      replace: true,
    });
  }

  // ── Authenticated users → away from public routes ──────────
  if ((to.path === '/' || to.path === '/auth') && isLoggedIn.value) {
    finish();
    return next({
      path: activeGroupId.value
        ? `/groups/${activeGroupId.value}/items/all`
        : '/home',
      replace: true,
    });
  }

  // ── Document title ─────────────────────────────────────────────────
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

  // ── User store init ────────────────────────────────────────────────
  const userStore = useUserStore();
  if (isLoggedIn.value && !isPublicRoute && !userStore.initialized) {
    try {
      await userStore.fetchUser();
    } catch {
      // Non-fatal
    }
  }

  // ── Role guards ────────────────────────────────────────────────────
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

  // ── Tenant-required routes ─────────────────────────────────────────
  if (to.meta.requiresTenant && !activeGroupId.value) {
    finish();
    return next({ path: '/home', replace: true });
  }

  const routeGroupId = to.params.groupId as string | undefined;
  if (routeGroupId && routeGroupId !== activeGroupId.value) {
    // Fast client-side membership check before hitting the server.
    // Note: this is advisory — the server will reject unauthorized access
    // regardless. But it saves a round-trip for obvious non-members.
    if (!userStore.initialized) await userStore.fetchUser();
    const isMember = userGroups.value.some((g) => g.id === routeGroupId);
    if (!isMember && !userStore.isSuperadmin) {
      finish();
      return next({ path: '/home', replace: true });
    }

    // switchActiveGroup has built-in debounce (singleton promise per groupId),
    // so rapid navigation to the same group won't cause parallel server calls.
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
