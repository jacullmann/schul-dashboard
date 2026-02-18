import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import '@/style.css';
import router from '@/router';
import { useTheme } from '@/composables/useTheme';
import i18n from '@/locales';

const { initializeTheme } = useTheme();
initializeTheme();
const app = createApp(App);





app.use(createPinia());
app.use(router);
app.use(i18n);
app.config.errorHandler = (err, instance, info) => {
    console.error('Vue Error:', err);
    console.error('Component:', instance);
    console.error('Info:', info);
};
app.mount('#app');



