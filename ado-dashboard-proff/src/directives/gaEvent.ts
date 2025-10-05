// src/directives/gaEvent.ts
import type { DirectiveBinding, ObjectDirective } from 'vue'
import { useAnalytics } from '../composables/useAnalytics'

type GaDirectiveValue = {
    name: string
    params?: Record<string, string | number | boolean>
    on?: string
}

function parseDataAttrs(el: Element): Record<string, string> {
    const out: Record<string, string> = {}
    Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('data-ga-') && attr.name !== 'data-ga-event' && attr.name !== 'data-ga-on') {
            const key = attr.name.replace(/^data-ga-/, '')
            out[key] = attr.value
        }
    })
    return out
}

const gaDirective: ObjectDirective = {
    mounted(el: Element, binding: DirectiveBinding<GaDirectiveValue>) {
        const cfg = binding.value
        const eventName = cfg?.name ?? el.getAttribute('data-ga-event') ?? ''
        const params = cfg?.params ?? parseDataAttrs(el)
        const eventType = cfg?.on ?? (el.getAttribute('data-ga-on') || 'click')

        const handler = () => {
            if (!eventName) return
            const { trackEvent } = useAnalytics()
            trackEvent(eventName, params)
        }

        el.addEventListener(eventType, handler)
        ;(el as any).__ga_event_handler__ = { handler, eventType }
    },

    unmounted(el: Element) {
        const ref = (el as any).__ga_event_handler__
        if (ref?.handler && ref?.eventType) {
            el.removeEventListener(ref.eventType, ref.handler)
        }
        delete (el as any).__ga_event_handler__
    }
}

export default gaDirective
