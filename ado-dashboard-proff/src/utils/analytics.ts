// src/utils/analytics.ts
type Props = Record<string, string | number | boolean | null>;

function randomId(): string {
    const a = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}

function sessionId(): string {
    const key = 'anon_session_id';
    const raw = sessionStorage.getItem(key);
    if (raw) return raw;
    const id = randomId();
    sessionStorage.setItem(key, id);
    return id;
}

function device(): string {
    return /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

function send(event: string, props: Props = {}) {
    if (!(window as any).umami) return;
    (window as any).umami.track(event, {
        properties: {
            anonSessionId: sessionId(),
            device: device(),
            lang: navigator.language,
            scroll: Math.round((window.scrollY / document.body.scrollHeight) * 100),
            ...props
        }
    });
}

export function initAnalytics(router: any) {
    if (!router) return;
    router.afterEach((to: any) => {
        send(to.fullPath || 'pageview', {
            page: to.name || null,
            path: to.fullPath,
            referrer: document.referrer || null
        });
    });
    window.addEventListener('beforeunload', () => {
        send('page_exit', { time: Date.now() });
    });
}

export function trackEvent(name: string, props: Props = {}) {
    send(name, props);
}
