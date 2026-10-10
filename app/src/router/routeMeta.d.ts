import 'vue-router';
import type { AdminTab } from '@/modules/admin/types';

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * i18n key of the document title, or a getter for pages whose title
     * depends on the signed-in user.
     */
    title?: string | (() => string);
    /**
     * i18n key of the title AppHeader shows in place of the group's name,
     * for pages whose own heading would scroll away under it.
     */
    headerTitle?: string;
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
    /** The superadmin tab shown as active, inherited by the tab's subpages. */
    adminTab?: AdminTab;
    /** The page puts the window where it belongs itself on every entry. */
    restoresScroll?: boolean;
  }
}
