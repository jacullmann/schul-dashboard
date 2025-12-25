// tests/setupFile.js
import { beforeAll, afterAll, vi } from 'vitest';

afterAll(() => {
  vi.restoreAllMocks();
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  })),
}));

vi.mock('cloudinary', () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      destroy: vi.fn().mockResolvedValue({}),
      upload: vi.fn().mockResolvedValue({ public_id: 'test_public_id', secure_url: 'https://test.com/image.jpg' }),
    },
    utils: {
      api_sign_request: vi.fn().mockReturnValue('test_signature'),
    }
  },
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn().mockResolvedValue([{}, {}]),
    request: vi.fn().mockResolvedValue([{}, {}]),
  },
}));
