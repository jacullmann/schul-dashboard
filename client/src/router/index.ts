import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth';
import { useLoadingBar } from '@/common/composables/loadingState';
import { useUserStore } from '@/stores/userStore';

const routes = [
    // ─── Welcome Layout ─────────────────────────────────────────────
    {
        path: '/',
        component: () => import('@/layouts/WelcomeLayout.vue'),
        meta: {
            title: 'schul-dashboard | Free Management Tool For Students',
            fullWidth: true
        },
        children: [
            {
                path: '',
                name: 'welcome-home',
                component: () => import('@/modules/welcome/pages/WelcomeHomePage.vue'),
                meta: {
                    title: 'schul-dashboard | Free Management Tool For Students'
                }
                },
            {
                path: 'auth',
                name: 'welcome-auth',
                component: () => import('@/modules/welcome/pages/WelcomeAuthPage.vue'),
                meta: {
                    title: 'Authentication'
                }
                },
            {
                path: 'legal',
                name: 'welcome-legal',
                component: () => import('@/modules/welcome/pages/WelcomeLegalPage.vue'),
                meta: {
                    title: 'Legal'
                }
                },
        ],
    },
    // ─── Default Layout (header + footer) ───────────────────────────
    {
        path: '/',
        component: () => import('@/layouts/DefaultLayout.vue'),
        children: [
            {
                path: 'home',
                name: 'home',
                component: () => import('@/core/pages/HomePage.vue'),
                meta: { title: 'Home' },
            },

            // ─── Group-scoped pages ─────────────────────────────────
            {
                path: 'groups/:groupId',
                children: [
                    { path: '', redirect: (to: { params: { groupId: string } }) => `/groups/${to.params.groupId}/items/ALLE` },
                    {
                        path: 'items/:type?/:itemId?',
                        name: 'group-items',
                        component: () => import('@/modules/tasks/pages/Aufgaben.vue'),
                        props: true,
                        meta: { title: 'Aufgaben', requiresTenant: true, groupContext: true },
                    },
                    {
                        path: 'stundenplan',
                        name: 'group-stundenplan',
                        component: () => import('@/modules/schedule/pages/Timetable.vue'),
                        meta: { title: 'Stundenplan', requiresTenant: true, groupContext: true },
                    },
                    {
                        path: 'admin',
                        name: 'group-admin',
                        component: () => import('@/modules/admin/pages/GroupAdminDashboard.vue'),
                        meta: { title: 'Gruppen-Verwaltung', requiresGroupAdmin: true, groupContext: true },
                    },
                ],
            },

            // ─── User-scoped pages (no group context needed) ────────
            {
                path: 'todos',
                name: 'private-todos',
                component: () => import('@/modules/tasks/pages/PrivateTodos.vue'),
                meta: { title: 'Meine Einträge' },
            },
            {
                path: 'kuerzel',
                name: 'kürzelfinder',
                component: () => import('@/modules/tools/pages/KuerzelPage.vue'),
                meta: { title: 'Kürzelfinder' },
            },
            {
                path: 'sorgenbox',
                name: 'sorgenbox',
                component: () => import('@/modules/sorgenbox/pages/Sorgenbox.vue'),
                meta: { title: 'Sorgenbox' },
            },
            {
                path: 'kontakt',
                name: 'contact',
                component: () => import('@/modules/support/pages/ContactInfo.vue'),
                meta: { title: 'Kontakt' },
            },
            {
                path: 'update-history',
                name: 'update-history',
                component: () => import('@/modules/patchinfo/pages/PatchInfo.vue'),
                meta: { title: 'Update History', fullWidth: true },
            },
            {
                path: 'spiele',
                name: 'games',
                component: () => import('@/modules/games/Games.vue'),
                meta: { title: 'Spiel Übersicht' },
            },
            {
                path: 'spiele/:id',
                name: 'GameDetail',
                component: () => import('@/modules/games/GameDetail.vue'),
                props: true,
                meta: { title: 'Spiel' },
            },
            {
                path: 'daltonraumfinder',
                name: 'daltonraumfinder',
                component: () => import('@/modules/tools/pages/DaltonFinderPage.vue'),
                meta: { title: 'Daltonraumfinder' },
            },
            {
                path: 'imagetool',
                name: 'imagetool',
                component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
                meta: { title: 'Bildbearbeitung' },
            },
            {
                path: 'info-dashboard',
                name: 'info-dashboard',
                component: () => import('@/modules/infodashboard/pages/InfoDashboard.vue'),
                meta: { title: 'Info Dashboard', fullWidth: true },
            },
            {
                path: 'brain',
                name: 'brain-library',
                component: () => import('@/modules/brain/pages/BrainLibrary.vue'),
                meta: { title: 'Gehirntraining' },
            },
            {
                path: 'brain/:testId',
                name: 'brain-test',
                component: () => import('@/modules/brain/pages/BrainTest.vue'),
                meta: { title: 'Gehirntest' },
            },
            {
                path: 'impressum-&-datenschutz',
                name: 'impressum-und-datenschutz',
                component: () => import('@/modules/legal/pages/LegalPagesWrapper.vue'),
                children: [
                    { path: 'impressum', name: 'impressum', component: () => import('@/modules/legal/components/Impress.vue'), meta: { title: 'Impressum' } },
                    { path: 'datenschutz', name: 'datenschutz', component: () => import('@/modules/legal/components/PrivacyPolicy.vue'), meta: { title: 'Datenschutz' } },
                    { path: 'nutzung', name: 'nutzung', component: () => import('@/modules/legal/components/Terms.vue'), meta: { title: 'Nutzungsbedingungen' } },
                ],
            },
        ],
    },

    // ─── Super Admin Dashboard ──────────────────────────────────────
    {
        path: '/admin',
        name: 'super-admin',
        component: () => import('@/modules/admin/pages/SuperAdminDashboard.vue'),
        meta: { title: 'Super Admin', requiresSuperAdmin: true, fullWidth: true },
    },

    // ─── Verify Email ───────────────────────────────────────────────
    {
        path: '/verify',
        component: () => import('@/layouts/WelcomeLayout.vue'),
        children: [
            { path: '', name: 'verify-email', component: () => import('@/core/pages/VerifyEmail.vue'), meta: { title: 'E-Mail Verifizierung' } },
        ],
    },

    // ─── Legacy Redirects ───────────────────────────────────────────
    { path: '/get-started', redirect: '/home' },
    { path: '/admin-dashboard', redirect: '/admin' },
    { path: '/hausaufgaben/verify', redirect: '/verify' },
    { path: '/stundenplan', redirect: '/home' },

    // ─── 404 ────────────────────────────────────────────────────────
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/core/pages/404-Page.vue'),
        meta: { title: '404', fullWidth: true },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const { start, finish } = useLoadingBar();
const { isAuthenticated, isLoggedIn, isAuthReady, initAuth, activeGroupId } = useAppAuth();

router.beforeEach(async (to, from, next) => {
    if (to.path !== from.path) start();

    if (!isAuthReady.value) await initAuth();

    const isPublicRoute = to.path === '/' || to.path.startsWith('/auth') ||
        to.path === '/legal' || to.path === '/verify';

    // Redirect unauthenticated users to welcome
    if (!isPublicRoute && !isLoggedIn.value) {
        const allowedWithoutAuth = ['/kontakt', '/impressum'];
        const isAllowed = allowedWithoutAuth.some(p => to.path.startsWith(p));
        if (!isAllowed) {
            finish();
            return next({ path: '/', replace: true });
        }
    }

    // Redirect authenticated users away from welcome
    if ((to.path === '/' || to.path === '/auth' || to.path === '/legal') && isLoggedIn.value) {
        finish();
        return next({ path: activeGroupId.value ? `/groups/${activeGroupId.value}/items/ALLE` : '/home', replace: true });
    }

    // Set document title
    if (to.meta.title) {
        if (to.path === '/') {
            document.title = to.meta.title;
        } else {
            document.title = to.meta.title + ' | Dashboard';
        }
    } else {
        document.title = 'Dashboard';
    }

    // Ensure user store is initialized
    const userStore = useUserStore();
    if (isLoggedIn.value && !isPublicRoute && !userStore.initialized) {
        try { await userStore.fetchUser(); } catch { }
    }

    // Super admin guard
    if (to.meta.requiresSuperAdmin) {
        if (!userStore.initialized) await userStore.fetchUser();
        if (!userStore.isSuperadmin) {
            finish();
            return next({ path: '/home', replace: true });
        }
    }

    // Group admin guard
    if (to.meta.requiresGroupAdmin) {
        if (!userStore.initialized) await userStore.fetchUser();
        if (!userStore.isGroupAdmin && !userStore.isSuperadmin) {
            finish();
            return next({ path: '/home', replace: true });
        }
    }

    // Tenant-required routes: ensure there's an active group
    if (to.meta.requiresTenant && !activeGroupId.value) {
        finish();
        return next({ path: '/home', replace: true });
    }

    // When navigating to a group route, switch active group if needed
    if (to.params.groupId && to.params.groupId !== activeGroupId.value) {
        const { switchActiveGroup } = useAppAuth();
        const result = await switchActiveGroup(to.params.groupId as string);
        if (!result.ok) {
            finish();
            return next({ path: '/home', replace: true });
        }
    }

    next();
});

router.afterEach(() => finish());

export default router;