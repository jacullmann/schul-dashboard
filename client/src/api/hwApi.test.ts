import { test, before, after, describe } from 'node:test';
import assert from 'node:assert';
import { setCsrfToken, getCsrfToken, syncCsrfFromCookie } from './hwApi.ts';

// Mock document.cookie
const originalDocument = global.document;
const mockDocument = {
  _cookie: '',
  get cookie() {
    return this._cookie;
  },
  set cookie(val) {
    this._cookie = val;
  }
};

describe('hwApi CSRF Token', () => {
  before(() => {
    // @ts-ignore
    global.document = mockDocument;
  });

  after(() => {
    global.document = originalDocument;
  });

  test('setCsrfToken should set the token', () => {
    setCsrfToken('test-token');
    assert.strictEqual(getCsrfToken(), 'test-token');
  });

  test('getCsrfToken should fallback to cookie if memory is empty', () => {
    setCsrfToken(''); // Clear memory
    mockDocument.cookie = 'csrf_token=cookie-token';
    assert.strictEqual(getCsrfToken(), 'cookie-token');
  });

  test('getCsrfToken should return empty string (initially) or null if no token is found', () => {
    setCsrfToken(''); // Clear memory
    mockDocument.cookie = '';
    const token = getCsrfToken();
    // It returns '' because of how we cleared it, or null if it was never set.
    // In our implementation, clearing with '' makes it ''.
    assert.ok(token === null || token === '');
  });

  test('syncCsrfFromCookie should update memory from cookie', () => {
    setCsrfToken('old-token');
    mockDocument.cookie = 'csrf_token=new-token';
    syncCsrfFromCookie();
    assert.strictEqual(getCsrfToken(), 'new-token');
  });

  test('getCsrfToken should use memory if available instead of cookie', () => {
    setCsrfToken('memory-token');
    mockDocument.cookie = 'csrf_token=cookie-token';
    assert.strictEqual(getCsrfToken(), 'memory-token');
  });
});
