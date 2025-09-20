import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import PersonDetail from './views/PersonDetail.vue';
import Admin from './views/Admin.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', component: Home },
        { path: '/person/:id', component: PersonDetail, props: true },
        { path: '/admin', component: Admin }
    ]
});
export default router;
