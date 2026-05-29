# AGENTS.md: AI Developer Onboarding & Context Guide

## 1. System Overview & Core Purpose

- **High-Level Purpose:** `schul-dashboard` is a web-based educational and class-management platform designed for students/student groups. It facilitates coordinated task/homework tracking, student scheduling, real-time messaging, centralized announcements, games, and private encrypted personal notes.
- **Primary Tech Stack:**
  - **Backend API:** Rust (using the **Axum 0.8** framework and **Tokio** runtime).
  - **Main Dashboard App:** Single Page Application (SPA) built with **Vue 3** (Composition API), **TypeScript**, **Vite 6**, and styled with **TailwindCSS v4**.
  - **Marketing Homepage:** Static/SSR landing page powered by **Nuxt 4**.
  - **GeoIP Resolver:** Lightweight microservice written in Rust using Axum and MaxMind's mmdb database library to support automated IP-to-location updates.
  - **Database:** **PostgreSQL** for primary relational storage.
  - **Asset Storage:** Cloudinary integration for handling secure document and image uploads.
- **Key Constraints:**
  - **Multi-Tenancy & Tenant Isolation:** Every non-global interaction is tenant-isolated. Standard users must reside in a group (tenant). Database queries must explicitly join or filter on the tenant context (`tenant_id`), which is resolved securely at the request level via the server-side `TenantContext` extractor.
  - **Stateless Authentication:** Server-side sessions are stateless, managed via secure, HttpOnly JWT cookies. A rolling-token rotation system automatically updates short-lived access tokens via a long-lived refresh token.
  - **End-to-End CSRF Protection:** All mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) require a valid CSRF token validation matching between an `x-csrf-token` header and a `csrf_token` cookie using constant-time comparison.
  - **Cryptographic Privacy:** Personal "todos" (`encrypted_todos` table) are encrypted on the server before storage using **AES-256-GCM**. Encryption keys are dynamically derived per-user using **scrypt** key derivation to prevent database administrators or leaked DB dumps from compromising student privacy.

---

## 2. Architecture & High-Level Data Flow

### Architecture Style
The system is built as a **modular monolith** on the backend and a **domain-driven modular SPA** on the frontend, supported by a specialized **GeoIP microservice** for location analysis.

### High-Level Data Flow
1. **User Mutates State:** A student checks off a homework item or adds a private note in the Vue dashboard.
2. **CSRF & Cookie Insertion:** The frontend Axios client retrieves the `csrf_token` cookie and injects it as an `x-csrf-token` header, sending the payload to the Rust API.
3. **Axum Middleware & Extraction Layer:**
   - The Request enters the global middleware stack where the `csrf_middleware` validates the CSRF token.
   - The Axum route handler injects extractors like `AuthUser` or `TenantContext`.
   - `TenantContext` queries the database to confirm the user's role in the active group/tenant and inspects tenant permissions (e.g., `delete_other_content`).
4. **Validation (DTO):** Handlers trigger `dto.validate()` to assert fields like character lengths or formats. Validation errors are immediately serialized into JSON and returned.
5. **Business Logic (Service Layer):** The handler forwards parameters to the domain-specific Service (e.g., `ItemsService` or `TodoService`). If operations require key derivation (scrypt), the CPU-bound task is dispatched off-thread to `tokio::task::spawn_blocking`.
6. **Persistence:** The Service uses `sqlx::query!` macros to execute highly-performant, compile-time verified queries against PostgreSQL.
7. **Activity Logging:** All successful mutative state transitions write an audit trail event directly to `user_activity`.

```
[ Vue 3 Client ] --(HTTP Request with CSRF Header + JWT Cookie)--> [ Axum Routing ]
                                                                        |
                                                                        v
                                                               [ CSRF Middleware ]
                                                                        |
                                                                        v
                                                           [ Extractor (TenantContext) ] -> [ DB Role & Perm Check ]
                                                                        |
                                                                        v
                                                           [ Handler (DTO Validation) ]
                                                                        |
                                                                        v
                                                            [ Domain Service Layer ]
                                                                        |
                                                   +--------------------+--------------------+
                                                   |                                         |
                                                   v                                         v
                                        [ DB (sqlx::query!) ]                   [ CPU-Bound scrypt ] (spawn_blocking)
                                                   |
                                                   v
                                        [ Write user_activity ]
```

---

## 3. Critical Directory & File Map

### The Repository Map
```
/
├── app/                       # Main Vue 3 + Vite SPA client
│   ├── src/
│   │   ├── api/               # Shared Axios client config & CSRF handler (api.ts)
│   │   ├── common/            # Shared composables, layouts, and helpers
│   │   ├── core/              # Global pages (HomePage, 404) and main setup
│   │   ├── i18n/              # Frontend internationalization
│   │   │   ├── locales/de/    # German JSON namespaces (e.g. auth.json, tasks.json) and index.ts
│   │   │   ├── locales/en/    # English JSON namespaces (e.g. auth.json, tasks.json) and index.ts
│   │   │   └── index.ts       # Vue-i18n configuration and entry point
│   │   ├── modules/           # Domain-driven features (brain of the frontend)
│   │   │   ├── admin/         # Tenant workspace management & admin settings
│   │   │   ├── announcements/ # Centralized "notifications" with read tracking
│   │   │   ├── auth/          # Stateless authentication (Login, Register, MFA, reset_password)
│   │   │   ├── chat/          # Real-time group messaging & chat
│   │   │   ├── games/         # Leisure games that are separate from the rest of the site
│   │   │   ├── infodashboard/ # News articles that are separate from the rest of the site
│   │   │   ├── schedule/      # Course timetables, lesson slots, and teacher substitutions
│   │   │   ├── tasks/         # Homework, Dalton tasks, and exam trackers
│   │   │   └── tools/         # Utility helper tools (e.g. image manipulation tools)
│   │   ├── stores/            # Pinia stores (user, modal, subject)
│   │   └── main.ts            # Frontend entry point
│   ├── package.json           # Vite build script & dependency manifest
│   └── vite.config.ts         # Vite bundler configuration
│
├── server/                    # Axum Rust API server
│   ├── migrations/            # SQLx migration files (0001_init.sql)
│   ├── src/
│   │   ├── common/            # Global shared logic (JWT, Encryption, CSRF, Extractors)
│   │   │   ├── extractors.rs  # TenantContext and AuthUser Axum request-guards
│   │   │   ├── encryption.rs  # AES-256-GCM and Scrypt KDF encryption service
│   │   │   └── csrf.rs        # CSRF middleware and token generator
│   │   ├── [modules]/         # Modular domains (e.g. user, items, todos, auth, mfa)
│   │   │   ├── dto.rs         # Serializers and validator constraints
│   │   │   ├── handlers.rs    # HTTP route endpoint targets
│   │   │   ├── routes.rs      # Axum Router definitions
│   │   │   └── service.rs     # Database operations and domain logic
│   │   ├── config.rs          # Strong-typed environment config
│   │   ├── error.rs           # AppError enum and IntoResponse implementation
│   │   ├── state.rs           # Shared thread-safe app state (AppState)
│   │   └── main.rs            # Axum server configuration, routing and entry point
│   ├── .sqlx/                 # Cached SQL compilation metadata for offline verification
│   └── Cargo.toml             # Rust package configuration and dependencies
│
├── homepage/                  # Marketing page built on Nuxt 4
└── geoip-service/             # Rust Axum microservice running MaxMind GeoIP lookups
```

---

## 4. Common Developer Workflows (The "How-To")

### How to Add a New API Endpoint/Route
To introduce a new endpoint (e.g., adding `GET /todos/summary` inside the `todos` domain):
1. **Define the DTO (if needed):** In `server/src/todos/dto.rs`, declare inputs or outputs using `#[derive(Deserialize, Validate)]`. Include appropriate field validation ranges.
2. **Create the Service Method:** In `server/src/todos/service.rs`, write an async function under `impl TodoService`. Query the database with `sqlx::query!` or `sqlx::query_as!`. Return an `AppResult<T>`.
3. **Write the Handler:** In `server/src/todos/handlers.rs`, create the async handler:
   - Inject the shared `State(s): State<AppState>`.
   - Inject the `AuthUser` or `TenantContext` extractor to resolve security scope.
   - Invoke `dto.validate()` on parameters and map errors.
   - Call the `TodoService` and return the response wrapped in `Ok(Json(...))`.
4. **Register the Route:** In `server/src/todos/routes.rs`, append the endpoint mapping onto the `Router::new()` block.
5. **Prepare Offline SQL Metadata:** Run `cargo sqlx prepare` inside the `/server` directory to regenerate cached compilation data. **Do not omit this!**

### How to Add a New Database Migration
1. **Create the Migration File:** Create a file inside `server/migrations/` using a sequential filename convention (e.g., `0002_add_grades_table.sql`).
2. **Write Pure SQL:** Place raw DDL (e.g., `CREATE TABLE ...`) inside. Ensure proper constraints and foreign key triggers (e.g., `ON DELETE CASCADE`).
3. **Apply the Migration:** Since migrations run automatically on server initialization (`sqlx::migrate!("./migrations")` in `main.rs`), simply restarting the Rust server will execute the SQL and verify schema health.

### How to Handle Errors & Logging
- **Database / Internal Failures:** Any SQL or unrecoverable system failure should be returned as a `Result` matching `AppError`. Never panic or return generic messages; return `AppError::internal(message)` or `AppError::Database(err)`.
- **User Validation Failures:** Map validators using:
  ```rust
  dto.validate().map_err(|e| {
      AppError::Validation(e.field_errors().keys().map(|k| k.to_string()).collect())
  })?;
  ```
- **Logging Best Practice:** Use the `tracing` crate. Add logging at critical system levels:
  - Error logs (`tracing::error!`) capture structural database bugs or connection losses.
  - Informational messages (`tracing::info!`) note server lifecycles.
  - Debug logs (`tracing::debug!`) track connection states or request flows.

---

## 5. Coding Standards, Patterns & "Gotchas"

### Naming Conventions
- **Rust API Server (`/server`):**
  - **Modules, files, and functions:** `snake_case` (e.g., `handlers.rs`, `toggle_todo()`).
  - **Structs, Enums, Traits:** `PascalCase` (e.g., `TenantContext`, `AppError`).
  - **Constants:** `SCREAMING_SNAKE_CASE`.
- **Vue Dashboard (`/app`):**
  - **Component files:** `PascalCase` (e.g., `Tasks.vue`, `DefaultLayout.vue`).
  - **Types, composables, and variables:** `camelCase` (e.g., `useAppAuth.ts`, `switchActiveGroup`).

### Primary Design Patterns
- **Extraction-based Authorization:** Utilizing Axum request guards (`FromRequestParts`) to parse HTTP headers or cookies into strongly-typed contexts like `AuthUser` or `TenantContext` before hitting handlers. This acts as a compile-time guarantee of request authorization.
- **Repository/Service Separation:** Handlers only coordinate HTTP details. All business logic, scrypt key derivation, and SQL executions must reside within the designated `Service` struct for that domain.
- **Vue Composition API & Stores:** Global state is delegated to Pinia stores (`userStore`, `subjectStore`, `modalStore`). Domain-specific business logic must be isolated in Vue Composables (e.g., `useTasks`, `useHwImages`).

### Frontend Internationalization (i18n) Rules
All user-facing strings in `/app` must be externalized using Vue-i18n. Keys must be defined in the German (`app/src/i18n/locales/de/`) and English (`app/src/i18n/locales/en/`) folders within their respective namespace files (e.g., `auth.json`, `tasks.json`) and combined via `index.ts`. All translation keys MUST adhere to the following strict guidelines:
1. **Hierarchical Nesting:** Use a structured, nested JSON format following the pattern: `[module].[page_or_component].[element].[action_or_attribute]`.
2. **Context over Value:** Name keys based on their semantic meaning and location in the UI, NOT the English text itself (e.g., use `auth.login.cta_button`, NOT `auth.login.click_here_to_signup`).
3. **No Lazy Reuse:** Create unique keys for different contexts, even if the English text is identical.
4. **Casing & Formatting:** Use strict lower `snake_case` for all keys. Do not use spaces, capital letters, or special characters in the key names.
5. **Smart Plurals & Variables:** Use proper i18n framework interpolation syntax `{{variable}}` for dynamic data, and split plurals using `_one` and `_other` suffixes.
6. **Common Namespace:** Only isolate genuinely universal, context-independent words into the global `common.json` namespace.

### Critical "Gotchas" & Anti-Patterns to Avoid
> [!IMPORTANT]
> **SQLx Compilation gotcha:** The Rust compiler parses SQL query validity at compile-time by connecting to a live database or loading cached files from `server/.sqlx`. If you add or modify a `sqlx::query!` query and fail to run `cargo sqlx prepare` (with a running database instance), compiler builds will fail in CI pipelines.

> [!WARNING]
> **Scrypt CPU Blocking:** Scrypt key derivation is highly CPU-bound. **Never** run `scrypt::scrypt` directly inside an async block without wrapping it in `tokio::task::spawn_blocking`! Blocking the main tokio executor threadpool directly degrades request throughput.

> [!CAUTION]
> **Hardcoding secret keys:** Do not add encryption, JWT, or database secret values anywhere in the source repository. Use `server/src/config.rs` which reads variables dynamically from environment configurations (`.env`).

---

## 6. Verification & Testing

### Spinning up Local Development Environments
Ensure Docker and PostgreSQL are running locally before executing the following:

- **Launch Rust API Server:**
  ```powershell
  cd server
  # Ensure your .env matches .env.example
  cargo run
  ```
- **Launch Vue Dashboard SPA:**
  ```powershell
  cd app
  pnpm install
  pnpm dev
  ```
- **Launch Nuxt Homepage:**
  ```powershell
  cd homepage
  pnpm install
  pnpm dev
  ```
- **Launch GeoIP Service:**
  ```powershell
  cd geoip-service
  cargo run
  ```

### Running Tests
- **Rust Backend:** Execute all unit tests and query validation using standard Cargo:
  ```powershell
  cd server
  cargo test
  ```
- **Frontend Code Quality:** Assert style rules and compiler readiness in `/app`:
  ```powershell
  cd app
  pnpm lint
  pnpm format
  ```

### Definition of Done (DoD)
Before declaring a development task complete, ensure the following checklist is checked off:
1. [ ] **Rust Compile Check:** Code successfully compiles without warnings (`cargo check`).
2. [ ] **SQL Offline Prepared:** If SQL queries changed, `cargo sqlx prepare` was run and the `.sqlx` metadata was committed.
3. [ ] **Tests Pass:** All backend unit tests run and pass (`cargo test`).
4. [ ] **Frontend Lints clean:** All frontend Vue/TypeScript files pass style checks and are formatted (`pnpm lint` and `pnpm format`).
5. [ ] **Security Maintained:** CSRF, tenant validation, and encryption patterns are strictly followed without manual bypasses.
6. [ ] **Documentation updated:** Types in `types.ts` (if applicable) and structural API changes are updated.
