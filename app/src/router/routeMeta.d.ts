import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * i18n key of the document title, or a getter for pages whose title
     * depends on the signed-in user.
     */
    title?: string | (() => string);
    /**
     * Routes are private by default, so a route that forgets this stays
     * behind the login. `public` is open to everyone, `guest` only to
     * signed-out visitors (signed-in ones are sent home).
     */
    access?: 'public' | 'guest';
    requiresSuperAdmin?: boolean;
    fullWidth?: boolean;
    /** The navigation entry shown as active, when not the route's own. */
    navItem?: string;
    /** The page puts the window where it belongs itself on every entry. */
    restoresScroll?: boolean;
  }
}
