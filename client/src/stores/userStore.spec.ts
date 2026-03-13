import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from './userStore';
import hw from '@/api/hwApi';
import { vi } from 'vitest';

vi.mock('@/api/hwApi', () => ({
  default: {
    get: vi.fn(),
  }
}));

describe('userStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('initializes with default values', () => {
    const store = useUserStore();
    expect(store.user).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.initialized).toBe(false);
    expect(store.hasShownSetup).toBe(false);
    expect(store.isLoggedIn).toBe(false);
  });

  describe('fetchUser', () => {
    it('sets user data on successful auth', async () => {
      const store = useUserStore();
      const mockData = {
        authenticated: true,
        id: 'user-1',
        email: 'test@test.com',
        role: 'user',
        emailVerified: true,
        enrKurs: null,
        wpuKurs1: null,
        wpuKurs2: null,
        theater: 0,
        doneSetup: true,
        personalized: false,
        mfaEnabled: true,
        tenantRole: null
      };

      (hw.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: mockData });

      await store.fetchUser();

      expect(store.user?.id).toBe('user-1');
      expect(store.isLoggedIn).toBe(true);
      expect(store.initialized).toBe(true);
      expect(store.mfaEnabled).toBe(true);
    });

    it('sets user to null on failed auth', async () => {
      const store = useUserStore();
      (hw.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: { authenticated: false } });

      await store.fetchUser();

      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect(store.initialized).toBe(true);
    });

    it('handles api errors gracefully', async () => {
      const store = useUserStore();
      (hw.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      await store.fetchUser();

      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
      expect(store.initialized).toBe(true);
      expect(store.loading).toBe(false);
    });
  });

  it('clearUser resets state', () => {
    const store = useUserStore();
    store.user = { id: 'test' } as any;
    store.initialized = true;
    store.hasShownSetup = true;

    store.clearUser();

    expect(store.user).toBeNull();
    expect(store.initialized).toBe(false);
    expect(store.hasShownSetup).toBe(false);
  });

  it('updateUser updates user state', () => {
    const store = useUserStore();
    store.user = { id: 'test', doneSetup: false } as any;

    store.updateUser({ doneSetup: true });

    expect(store.user?.doneSetup).toBe(true);
  });

  it('computes isGroupAdmin properly', () => {
    const store = useUserStore();

    // Test base user
    store.user = { role: 'user', tenantRole: 'member' } as any;
    expect(store.isGroupAdmin).toBe(false);

    // Test superadmin
    store.user = { role: 'superadmin', tenantRole: 'member' } as any;
    expect(store.isGroupAdmin).toBe(true);

    // Test tenant admin
    store.user = { role: 'user', tenantRole: 'admin' } as any;
    expect(store.isGroupAdmin).toBe(true);

    // Test tenant moderator
    store.user = { role: 'user', tenantRole: 'moderator' } as any;
    expect(store.isGroupAdmin).toBe(true);
  });
});