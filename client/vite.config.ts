import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from "@tailwindcss/vite";
import Components from 'unplugin-vue-components/vite';

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        Components({
            resolvers: [
                (componentName) => {
                    if (componentName === 'BaseButton') {
                        return '@/common/components/BaseButton.vue';
                    }
                    if (componentName === 'BaseInput') {
                        return '@/common/components/BaseInput.vue';
                    }
                }
            ],
            dts: true
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }

});
