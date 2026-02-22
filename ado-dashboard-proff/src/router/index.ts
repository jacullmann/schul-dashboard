import { createRouter, createWebHistory } from 'vue-router';
import { useAppAuth } from '@/modules/auth/composables/useAppAuth.ts';
import { useLoadingBar } from '@/common/composables/loadingState.ts';
import { useUserStore } from '@/stores/userStore';

const routes = [
    {
        path: '/',
        redirect: '/items/HAUSAUFGABE'
    },
    {
        path: '/welcome',
        name: 'welcome-page',
        component: () => import('@/modules/welcome/pages/WelcomeMainPage.vue'),
        meta: {
            title: 'Anmeldung',
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/items/:type?/:itemId?',
        name: 'items',
        component: () => import('@/modules/tasks/pages/Hausaufgaben.vue'),
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
        component: () => import('@/modules/admin/pages/AdminDashboard.vue'),
        meta: {
            title: 'Admin Dashboard',
            requiresAdmin: true,
            fullWidth: true,
            hideNavigation: true
        }
    },
    {
        path: '/hausaufgaben/verify',
        redirect: '/verify'
    },
    {
        path: '/verify',
        name: 'verify-email',
        component: () => import('@/core/pages/VerifyEmail.vue'),
        meta: {
            title: 'E-Mail Verifizierung',
            fullWidth: false,
            hideNavigation: true
        }
    },
    {
        path: '/kuerzel',
        name: 'kürzelfinder',
        component: () => import('@/modules/tools/pages/KuerzelPage.vue'),
        meta: {
            title: 'Kürzelfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kanye',
        name: 'kanye',
        component: () => import('@/layouts/KanyeLayout.vue'),
        meta: {
            title: 'Kanye',
            fullWidth: true,
            hideNavigation: true
        },
        children: [
            {
                path: 'graduation',
                name: 'kanye-graduation',
                component: () => import('@/modules/kanye/pages/Graduation.vue'),
                meta: {
                    title: 'Graduation',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'late-registration',
                name: 'kanye-late-registration',
                component: () => import('@/modules/kanye/pages/LateRegistration.vue'),
                meta: {
                    title: 'Late Registration',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'twisted-fantasy',
                name: 'kanye-twisted-fantasy',
                component: () => import('@/modules/kanye/pages/TwistedFantasy.vue'),
                meta: {
                    title: 'Twisted Fantasy',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'ye',
                name: 'kanye-ye',
                component: () => import('@/modules/kanye/pages/Ye.vue'),
                meta: {
                    title: 'Ye',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'yeezus',
                name: 'kanye-yeezus',
                component: () => import('@/modules/kanye/pages/Yeezus.vue'),
                meta: {
                    title: 'Yeezus',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'the-college-droupout',
                name: 'kanye-college-dropout',
                component: () => import('@/modules/kanye/pages/CollegeDropout.vue'),
                meta: {
                    title: 'The College Dropout',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: '808s-and-heartbreak',
                name: 'kanye-808s-and-heartbreak',
                component: () => import('@/modules/kanye/pages/808sAndHeartbreak.vue'),
                meta: {
                    title: '808s & Heartbreak',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'watch-the-throne',
                name: 'kanye-watch-the-throne',
                component: () => import('@/modules/kanye/pages/WatchTheThrone.vue'),
                meta: {
                    title: 'Watch The Throne',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'life-of-pablo',
                name: 'kanye-life-of-pablo',
                component: () => import('@/modules/kanye/pages/LifeOfPablo.vue'),
                meta: {
                    title: 'The Life Of Pablo',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'kids-see-ghosts',
                name: 'kanye-kids-see-ghosts',
                component: () => import('@/modules/kanye/pages/KidsSeeGhosts.vue'),
                meta: {
                    title: 'KIDS SEE GHOSTS',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'jesus-is-king',
                name: 'kanye-jesus-is-king',
                component: () => import('@/modules/kanye/pages/JesusIsKing.vue'),
                meta: {
                    title: 'Jesus Is King',
                    fullWidth: true,
                    hideNavigation: true
                }
            },
            {
                path: 'donda',
                name: 'kanye-donda',
                component: () => import('@/modules/kanye/pages/Donda.vue'),
                meta: {
                    title: 'Donda',
                    fullWidth: true,
                    hideNavigation: true
                }
            }
        ]
    },
    {
        path: '/ai-detector',
        name: 'ai-detector',
        component: () => import('@/modules/tools/pages/AiDetectorPage.vue'),
        meta: {
            title: 'AI Detektor',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/sorgenbox',
        name: 'sorgenbox',
        component: () => import('@/modules/sorgenbox/pages/Sorgenbox.vue'),
        meta: {
            title: 'Sorgenbox',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/kontakt',
        name: 'contact',
        component: () => import('@/modules/support/pages/ContactInfo.vue'),
        meta: {
            title: 'Kontakt',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/update-history',
        name: 'update-history',
        component: () => import('@/modules/patchinfo/pages/PatchInfo.vue'),
        meta: {
            title: 'Update History',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/spiele',
        name: 'games',
        component: () => import('@/modules/games/Games.vue'),
        meta: {
            title: 'Spiel Übersicht',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/stundenplan',
        name: 'stundenplan',
        component: () => import('@/modules/schedule/pages/Stundenplan.vue'),
        meta: {
            title: 'Stundenplan',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/daltonraumfinder',
        name: 'daltonraumfinder',
        component: () => import('@/modules/tools/pages/DaltonFinderPage.vue'),
        meta: {
            title: 'Daltonraumfinder',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/imagetool',
        name: 'imagetool',
        component: () => import('@/modules/tools/pages/ImageToolPage.vue'),
        meta: {
            title: 'Bildbearbeitung',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/infodashboard-dashboard',
        name: 'info-dashboard',
        component: () => import('@/modules/infodashboard/InfoDashboard.vue'),
        meta: {
            title: 'Info Dashboard',
            fullWidth: true,
            hideNavigation: false
        }
    },
    {
        path: '/countdown',
        name: 'countdown',
        component: () => import('@/modules/tools/pages/CountdownPage.vue'),
        meta: {
            title: 'Countdown',
            fullWidth: false,
            hideNavigation: false
        }
    },
    {
        path: '/spiele/:id',
        name: 'GameDetail',
        component: () => import('@/modules/games/GameDetail.vue'),
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
        component: () => import('@/modules/legal/pages/LegalLayout.vue'),
        children: [
            {
                path: 'impressum',
                name: 'impressum',
                component: () => import('@/modules/legal/components/ImpressumPage.vue'),
                meta: {
                    title: 'Impressum',
                    fullWidth: false,
                    hideNavigation: false
                }
            },
            {
                path: 'datenschutz',
                name: 'datenschutz',
                component: () => import('@/modules/legal/components/DatenschutzPage.vue'),
                meta: {
                    title: 'Datenschutzerklärung',
                    fullWidth: false,
                    hideNavigation: false
                }
            },
            {
                path: 'nutzung',
                name: 'nutzung',
                component: () => import('@/modules/legal/components/Nutzungsbedingungen.vue'),
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
        component: () => import('@/core/pages/404-Page.vue'),
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