import { validateCsrf } from './csrf.js';
import assert from 'assert';

async function runTests() {
    console.log('Running CSRF middleware tests...');

    const middleware = validateCsrf();

    const mockRes = () => {
        const res = {};
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };
        res.json = (data) => {
            res.body = data;
            return res;
        };
        return res;
    };

    // 1. Test GET request (should skip)
    {
        const req = { method: 'GET' };
        let nextCalled = false;
        middleware(req, {}, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, 'GET request should skip CSRF validation');
        console.log('✓ GET request skipped');
    }

    // 2. Test matching tokens
    {
        const token = 'abcdef123456';
        const req = {
            method: 'POST',
            cookies: { csrf_token: token },
            headers: { 'x-csrf-token': token }
        };
        let nextCalled = false;
        middleware(req, {}, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true, 'Matching tokens should pass');
        console.log('✓ Matching tokens passed');
    }

    // 3. Test mismatching tokens (same length)
    {
        const req = {
            method: 'POST',
            cookies: { csrf_token: 'abcdef123456' },
            headers: { 'x-csrf-token': 'abcdef123457' }
        };
        const res = mockRes();
        let nextCalled = false;
        middleware(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, 'Mismatching tokens should not pass');
        assert.strictEqual(res.statusCode, 403, 'Should return 403');
        console.log('✓ Mismatching tokens (same length) rejected');
    }

    // 4. Test mismatching tokens (different length)
    {
        const req = {
            method: 'POST',
            cookies: { csrf_token: 'abcdef123456' },
            headers: { 'x-csrf-token': 'abc' }
        };
        const res = mockRes();
        let nextCalled = false;
        middleware(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, 'Mismatching tokens (diff length) should not pass');
        assert.strictEqual(res.statusCode, 403, 'Should return 403');
        console.log('✓ Mismatching tokens (different length) rejected');
    }

    // 5. Test missing tokens
    {
        const req = {
            method: 'POST',
            cookies: {},
            headers: {}
        };
        const res = mockRes();
        let nextCalled = false;
        middleware(req, res, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false, 'Missing tokens should not pass');
        assert.strictEqual(res.statusCode, 403, 'Should return 403');
        console.log('✓ Missing tokens rejected');
    }

    console.log('All tests passed!');
}

runTests().catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
});
