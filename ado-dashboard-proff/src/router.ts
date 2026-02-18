import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/composables/useAppAuth';
import { useLoadingBar } from '@/composables/loadingState';
import { useUserStore } from '@/stores/userStore';

const routes = [
    {
        path: '/',
        redirect: '/items/HAUSAUFGABE'
    },
    {
        path: '/welcome',
        name: 'welcome-page',
        component: () => import('@/views/AuthPage.vue'),
        meta: {
            title: 'Anmeldung',
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/items/:type?/:itemId?',
        name: 'items',
        component: () => import('@/views/Hausaufgaben.vue'),
        props: true,
        meta: {
            title: 'Hausaufgaben',
            fullWidth: false,
            hideNavigation: false
        }
    },

    {
        path: '/admin-dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/AdminDashboard.vue'),
        meta: {
            title: 'Admin Dashboard',
            requiresAdmin: true,
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/divide',
        name: 'divider',
        component: () => import('@/views/divider/Divide.vue'),
        meta: {
            title: 'Divided',
            fullWidth: true,
            hideNavigation: false
        }
    },

    {
        path: '/hausaufgaben/verify',
        redirect: '/verify'
    },
    {
        path: '/verify',
        name: 'verify-email',
        component: () => import('@/views/VerifyEmail.vue'),
        meta: {
            title: 'E-Mail Verifizierung',
            fullWidth: false,
            hideNavigation: true
        }
    },
    {
        path: '/kuerzel',
        name: 'kürzelfinder',
        component: () => import('@/views/tools/Kuerzel.vue'),
        meta: {
            title: 'Kürzelfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kanye',
        name: 'kanye',
        component: () => import('@/views/kanye/Ye.vue'),
        meta: {
            title: 'Kanye',
            fullWidth: true,
            hideNavigation: true
        },
        children: [
            {
                path: 'graduation',
                name: 'kanye-graduation',
                component: () => import('@/views/kanye/routes/Graduation.vue'),
                meta: {
                    title: 'Graduation',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'late-registration',
                name: 'kanye-late-registration',
                component: () => import('@/views/kanye/routes/LateRegistration.vue'),
                meta: {
                    title: 'Late Registration',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'twisted-fantasy',
                name: 'kanye-twisted-fantasy',
                component: () => import('@/views/kanye/routes/TwistedFantasy.vue'),
                meta: {
                    title: 'Twisted Fantasy',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'ye',
                name: 'kanye-ye',
                component: () => import('@/views/kanye/routes/Ye.vue'),
                meta: {
                    title: 'Ye',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'yeezus',
                name: 'kanye-yeezus',
                component: () => import('@/views/kanye/routes/Yeezus.vue'),
                meta: {
                    title: 'Yeezus',
                    fullWidth: true,
                    hideNavigation: true
                }
            }
        ]
    },
    {
        path: '/ai-detector',
        name: 'ai-detector',
        component: () => import('@/views/aiDetector.vue'),
        meta: {
            title: 'AI Detektor',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/sorgenbox',
        name: 'sorgenbox',
        component: () => import('@/views/Sorgenbox.vue'),
        meta: {
            title: 'Sorgenbox',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kontakt',
        name: 'contact',
        component: () => import('@/components/ContactForm.vue'),
        meta: {
            title: 'Kontakt',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/update-history',
        name: 'update-history',
        component: () => import('@/views/updates/PatchInfo.vue'),
        meta: {
            title: 'Update History',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/spiele',
        name: 'games',
        component: () => import('@/views/Games.vue'),
        meta: {
            title: 'Spiel Übersicht',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/stundenplan',
        name: 'stundenplan',
        component: () => import('@/components/Stundenplan.vue'),
        meta: {
            title: 'Stundenplan',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/daltonraumfinder',
        name: 'daltonraumfinder',
        component: () => import('@/views/tools/DaltonFinder.vue'),
        meta: {
            title: 'Daltonraumfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/imagetool',
        name: 'imagetool',
        component: () => import('@/views/tools/ImageTool.vue'),
        meta: {
            title: 'Bildbearbeitung',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/info-dashboard',
        name: 'info-dashboard',
        component: () => import('@/views/InfoDashboard/InfoDashboard.vue'),
        meta: {
            title: 'Info Dashboard',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/countdown',
        name: 'countdown',
        component: () => import('@/views/Countdown.vue'),
        meta: {
            title: 'Countdown',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/spiele/:id',
        name: 'GameDetail',
        component: () => import('@/views/GameDetail.vue'),
        props: true,
        meta: {
            title: 'Spiel',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/goat',
        redirect: '/kanye'
    },
    {
        path: '/impressum-&-datenschutz',
        name: 'impressum-und-datenschutz',
        component: () => import('@/views/legal/LegalLayout.vue'),
        children: [
            {
                path: 'impressum',
                name: 'impressum',
                component: () => import('@/views/legal/ImpressumPage.vue'),
                meta: {
                    title: 'Impressum',
                    fullWidth: false,
                    hideNavigation: false
                }
            },
            {
                path: 'datenschutz',
                name: 'datenschutz',
                component: () => import('@/views/legal/DatenschutzPage.vue'),
                meta: {
                    title: 'Datenschutzerklärung',
                    fullWidth: false,
                    hideNavigation: false
                }
            },
            {
                path: 'nutzung',
                name: 'nutzung',
                component: () => import('@/views/legal/Nutzungsbedingungen.vue'),
                meta: {
                    title: 'Nutzungsbedingungen',
                    fullWidth: false,
                    hideNavigation: false
                }
            }

        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFound.vue'),
        meta: {
            title: '404',
            fullWidth: true,
            hideNavigation: false
        }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

const { start, finish } = useLoadingBar();
const { isAuthenticated, isAuthReady, initAuth } = useAppAuth();

router.beforeEach(async (to, from, next) => {
    if (to.path !== from.path) start();

    if (!isAuthReady.value) {
        await initAuth();
    }

    const publicPaths = [
        '/welcome',
        '/verify'
    ];
    const isPublicRoute = publicPaths.includes(to.path);
    if (!isPublicRoute && !isAuthenticated.value) {
        finish();
        return next({
            path: '/welcome',
            replace: true
        });
    }
    if (to.path === '/welcome' && isAuthenticated.value) {
        finish();
        return next({
            path: '/items/HAUSAUFGABE',
            replace: true
        });
    }

    if (to.name === 'items') {
        const type = to.params.type;
        let title = 'Hausaufgaben';
        if (type === 'DALTON') title = 'Dalton';
        else if (type === 'PRUEFUNG') title = 'Prüfungen';
        else if (type === 'PRIVATE') title = 'Privat';
        document.title = title + ' | Dashboard';
    } else if (to.meta.title) {
        document.title = to.meta.title + ' | Dashboard';
    } else {
        document.title = 'Dashboard';
    }

    const userStore = useUserStore();

    if (isAuthenticated.value && !isPublicRoute) {
        if (!userStore.initialized) {
            try {
                await userStore.fetchUser();
            } catch {
            }
        }
    }

    if (to.meta.requiresAdmin) {
        if (!userStore.initialized || userStore.loading) {
            await userStore.fetchUser();
        }

        if (!userStore.initialized) {
            finish();
            return next({ path: '/welcome', replace: true });
        }

        if (!userStore.isAdmin) {
            console.warn('Autorisierung fehlgeschlagen: Kein Admin.');
            finish();
            return next({ path: '/items/HAUSAUFGABE', replace: true });
        }
    }

    next();
});

router.afterEach(() => {
    finish();
});

export default router;