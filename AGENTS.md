# AGENTS.md: Code Quality Standards

## Guiding Principles

Write **idiomatic, performant, secure code that speaks for itself.**

- **Modern & Idiomatic:** Follow language conventions. Rust: leverage the type system. Vue: use Composition API patterns.
- **Maintainable:** Code should be obvious to the next developer. Minimize comments—only explain *why*, never what.
- **Performant:** Avoid unnecessary allocations, blocking operations, database queries. Profile before optimizing.
- **Secure:** Tenant isolation, CSRF validation, encryption, input validation happen implicitly through the architecture.
- **Simple:** Prefer clarity over cleverness. One responsibility per function.

---

## Rust Backend

**Compile-time verification always:**
- Use `sqlx::query!()` and `sqlx::query_as!()` with `!`—queries checked at compile time
- Never `sqlx::query()` without `!`
- Run `cargo sqlx prepare` after any query change

**Type safety first:**
- Leverage Rust's type system. Use newtypes for IDs (`struct UserId(i64)`)
- Extract early, fail loudly. Invalid state should be unrepresentable

**Async & Blocking:**
- Async-all-the-way in handlers
- CPU-bound work (scrypt, hashing) → `tokio::task::spawn_blocking`
- Never block the executor

**Error handling:**
- Return `Result` types. Map errors to `AppError`
- No panics in production code
- Error messages should help debugging without leaking internals

**Performance:**
- Minimize database round-trips. Batch queries when sensible
- Avoid `clone()` in hot paths. Use references
- Log sparingly; `tracing::` at critical points only

---

## Vue 3 Frontend

**Composition API patterns:**
- Extract logic into composables. Keep components thin
- Use `ref()`, `computed()`, `watch()` idiomatically
- State in Pinia stores; UI logic in composables

**Types everywhere:**
- Full TypeScript coverage. No `any`
- Types document intent better than comments

**Minimal re-renders:**
- Use `v-memo`, computed properties. Avoid watchers when possible
- Lazy-load heavy components

**Style consistency:**
- Follow existing conventions in the codebase
- Use TailwindCSS utilities; minimal custom CSS
- No magic numbers in styles

---

## General

**Comments:** Write self-documenting code. Comment only:
- Non-obvious security decisions (e.g., why we use constant-time comparison)
- Performance trade-offs
- External constraints or specifications

**Naming:** Be explicit. `user_in_tenant()` not `check()`. Names are free.

**Testing:** Write tests for business logic. Skip boilerplate.

**Code Review:** Assume the reviewer wants to understand intent quickly.
