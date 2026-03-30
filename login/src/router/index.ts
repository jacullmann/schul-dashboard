import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: 'Login' },
  },
  {
    path: '/mfa',
    name: 'mfa',
    component: () => import('@/pages/MfaPage.vue'),
    meta: { title: 'MFA' },
  },
  {
    path: '/reset',
    name: 'reset',
    component: () => import('@/pages/ResetPage.vue'),
    meta: { title: 'Reset Password' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
