// src/router/index.ts

import { createRouter, createWebHistory } from 'vue-router';


import Hausaufgaben from './views/Hausaufgaben.vue';

const PersonDetail = () => import('./views/PersonDetail.vue');
const Admin = () => import('./views/Admin.vue');
const Home = () => import('./views/Home.vue');
const VerifyEmail = () => import('./views/VerifyEmail.vue');
const Impressum = () => import('./views/Impressum.vue')

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Hausaufgaben },
        { path: '/bewerten', component: Home },
        { path: '/person/:id', component: PersonDetail, props: true },
        { path: '/admin', component: Admin },
        { path: '/verify', component: VerifyEmail },
        { path: '/impressum-&-datenschutz', component: Impressum }
    ]
});

export default router;