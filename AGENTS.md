# Testing Guidelines & Conventions

This project uses tests to ensure code quality and prevent regressions. Below are the established frameworks, testing conventions, and commands to run tests.

## Frontend (Vue.js + Vite)

### Frameworks
- **Test Runner:** [Vitest](https://vitest.dev/)
- **UI Testing Utility:** [@vue/test-utils](https://test-utils.vuejs.org/)
- **Environment:** JSDOM

### Conventions
1. **Location:** Frontend test files are located alongside the components/files they test, with a `.spec.ts` suffix.
2. **Components:** Test for proper rendering (e.g., specific classes, texts) and interactive events (e.g., emitted `click` events).
3. **Stores:** For Pinia stores, always initialize with `setActivePinia(createPinia())` in a `beforeEach` hook. Use `vi.mock()` for API dependencies (like axios or custom wrappers such as `@/api/hwApi`).
4. **Types:** Strictly adhere to TypeScript typings in tests. Ensure mocks reflect the correct structure.

### Commands
- Run all frontend tests: `cd client && npm run test` or `cd client && npm run test:frontend`

---

## Backend (NestJS)

### Frameworks
- **Test Runner:** [Jest](https://jestjs.io/)
- **E2E Testing:** [Supertest](https://github.com/ladjs/supertest)

### Conventions
1. **Location:** Unit tests are located alongside the files they test, with a `.spec.ts` suffix. E2E tests are located in `server/test/` with a `.e2e-spec.ts` suffix.
2. **ESM Dependencies:** Since some dependencies (like `@scure`, `@noble`, `@otplib`) are published as ES Modules, `jest` requires special handling. This project maps these modules using `moduleNameMapper` and `transformIgnorePatterns` in `package.json` and `jest-e2e.json` to safely ignore them from transforms and route them correctly.
3. **Mocking:**
   - **Database:** Mock database calls. When mocking Supabase chaining (e.g., `.from().select().eq()...`), you must provide layered/chained `jest.fn()` structures that mirror the API you're testing.
   - **External utils:** Keep mocking at the boundaries. If testing a service, mock the external encrypt/decrypt utils rather than internal logic.
4. **Environment Setup:** E2E tests load a mock configuration from `server/test/test-env.ts` initialized in `server/test/setup.ts` to pass global validation.

### Commands
- Run all backend unit tests: `cd server && npm run test`
- Run all backend E2E tests: `cd server && npm run test:e2e`
