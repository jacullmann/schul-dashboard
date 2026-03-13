import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useUserStore } from '@/stores/userStore';
import i18n from '@/i18n';

// ─── Routes ───────────────────────────────────────────────────────────────────

const routes = [
    // ── Welcome Layout ─────────────────────────────────────────────────
    {
        path: '/',
        component: () => import('@/layouts/WelcomeLayout.vue'),
        meta: { title: 'global.fullTitle', fullWidth: true },
        children: [
            {
                path: '',
                name: 'welcome-home',
                component: () => import('@/modules/welcome/pages/WelcomeHomePage.vue'),
                meta: { title: 'global.fullTitle' },
            },
            {
                path: 'auth',
                name: 'welcome-auth',
                component: () => import('@/modules/welcome/pages/WelcomeAuthPage.vue'),
                meta: { title: 'navigation.auth' },
            },
            {
                path: 'legal',
                name: 'welcome-legal',
                component: () => import('@/modules/welcome/pages/WelcomeLegalPage.vue'),
                meta: { title: 'navigation.legal' },
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
                        redirect: (to: any) =>
                            `/groups/${to.params.groupId}/items/all`,
                    },
                    {
                        path: 'items/:type?/:itemId?',
                        name: 'group-items',
                        component: () => import('@/modules/tasks/pages/Aufgaben.vue'),
                        props: true,
                        meta: {
                            title: 'school.tasks.title',
                            requiresTenant: true,
                            groupContext: true,
                        },
                    },
                    {
                        path: 'stundenplan',
                        name: 'group-stundenplan',
                        component: () => import('@/modules/schedule/pages/Timetable.vue'),
                        meta: {
                            title: 'school.tables.timetable.title',
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
                component: () => import('@/modules/tasks/pages/PrivateTodos.vue'),
                meta: { title: 'navigation.privateTodos' },
            },
            {
                path: 'kuerzel',
                name: 'kürzelfinder',
                component: () => import('@/modules/tools/pages/KuerzelPage.vue'),
                meta: { title: 'school.tables.abbr.title' },
            },
            {
                path: 'sorgenbox',
                name: 'sorgenbox',
                component: () => import('@/modules/sorgenbox/pages/Sorgenbox.vue'),
                meta: { title: 'tools.worrybox.title' },
            },
            {
                path: 'kontakt',
                name: 'contact',
                component: () => import('@/modules/support/pages/ContactInfo.vue'),
                meta: { title: 'contact.contact.title' },
            },
            {
                path: 'update-history',
                name: 'update-history',
                component: () => import('@/modules/patchinfo/pages/PatchInfo.vue'),
                meta: { title: 'navigation.updateHistory', fullWidth: true },
            },
            {
                path: 'spiele',
                name: 'games',
                component: () => import('@/modules/games/Games.vue'),
                meta: { title: 'navigation.games' },
            },
            {
                path: 'spiele/:id',
                name: 'GameDetail',
                component: () => import('@/modules/games/GameDetail.vue'),
                props: true,
                meta: { title: 'navigation.gameDetail' },
            },
            {
                path: 'daltonraumfinder',
                name: 'daltonraumfinder',
                component: () => import('@/modules/tools/pages/DaltonFinderPage.vue'),
                meta: { title: 'school.tables.dalton.title' },
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
            {
                path: 'impressum-&-datenschutz',
                name: 'impressum-und-datenschutz',
                component: () =>
                    import('@/modules/legal/pages/LegalPagesWrapper.vue'),
                children: [
                    {
                        path: 'impressum',
                        name: 'impressum',
                        component: () => import('@/modules/legal/components/Impress.vue'),
                        meta: { title: 'legal.imprint.title' },
                    },
                    {
                        path: 'datenschutz',
                        name: 'datenschutz',
                        component: () =>
                            import('@/modules/legal/components/PrivacyPolicy.vue'),
                        meta: { title: 'legal.privacy.title' },
                    },
                    {
                        path: 'nutzung',
                        name: 'nutzung',
                        component: () => import('@/modules/legal/components/Terms.vue'),
                        meta: { title: 'legal.terms.title' },
                    },
                ],
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
        component: () => import('@/layouts/WelcomeLayout.vue'),
        children: [
            {
                path: '',
                name: 'verify-email',
                component: () => import('@/core/pages/VerifyEmail.vue'),
                meta: { title: 'navigation.verifyEmail' },
            },
        ],
    },

    // ── Legacy Redirects ────────────────────────────────────────────────
    { path: '/get-started', redirect: '/home' },
    { path: '/admin-dashboard', redirect: '/admin' },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/stundenplan', redirect: '/home' },

    // ── 404 ─────────────────────────────────────────────────────────────
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/core/pages/404-Page.vue'),
        meta: { title: 'navigation.notFound', fullWidth: true },
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

    // Ensure auth is initialised exactly once on first navigation.
    if (!isAuthReady.value) await initAuth();

    const isPublicRoute =
        to.path === '/' ||
        to.path.startsWith('/auth') ||
        to.path === '/legal' ||
        to.path === '/verify';

    // ── Unauthenticated users → welcome ────────────────────────────────
    if (!isPublicRoute && !isLoggedIn.value) {
        const allowedWithoutAuth = ['/kontakt', '/impressum'];
        const isAllowed = allowedWithoutAuth.some((p) => to.path.startsWith(p));
        if (!isAllowed) {
            finish();
            return next({ path: '/', replace: true });
        }
    }

    // ── Authenticated users → away from welcome/public routes ──────────
    if (
        (to.path === '/' || to.path === '/auth' || to.path === '/legal') &&
        isLoggedIn.value
    ) {
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
        document.title =
            to.path === '/' ? translated : `${translated} | Dashboard`;
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
        const isMember = userGroups.value.some((g) => g.id === routeGroupId);
        if (!isMember) {
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