// src/composables/useAnalytics.ts
import { useGtag } from 'vue-gtag-next'

export type AnalyticsParams = Record<string, string | number | boolean | undefined>

export function useAnalytics() {
    const gtag = useGtag()

    function trackEvent(name: string, params: AnalyticsParams = {}) {
        if (gtag && typeof (gtag as any).event === 'function') {
            ;(gtag as any).event(name, params)
            return
        }

        const dl = (window as any).dataLayer
        if (Array.isArray(dl)) {
            dl.push({ event: name, ...params })
        } else {
            ;(window as any).dataLayer = [{ event: name, ...params }]
        }
    }

    return { trackEvent }
}
