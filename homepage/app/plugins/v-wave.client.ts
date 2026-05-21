import VWave from 'v-wave'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(VWave, {
        color: 'currentColor',
        initialOpacity: 0.2,
        duration: 0.4,
    })
})
