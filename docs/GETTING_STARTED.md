# Getting Started Guide

## Prerequisites

- **Node.js** (version 22 or higher)
- **pnpm** (version 10 or higher)
- **Docker & Docker Compose** (for containerized development)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Jannescynatix/schul-dashboard.git
cd schul-dashboard
```

### 2. Environment Setup

Configure environment variables for each component:

**Server** (`.server/.env`):
- NODE_ENV - Development or production environment
- PORT - Backend API port (default: 3000)
- SUPABASE_URL - Supabase instance URL
- SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET - Image hosting
- RESEND_API_KEY - Email service API key
- USER_JWT_SECRET, PASSWORD_RESET_JWT_SECRET, MFA_PENDING_JWT_SECRET - JWT signing keys
- ENCRYPTION_KEY - For encrypting sensitive user data
- CORS_ORIGIN - Frontend URL for CORS
- CLIENT_VERIFY_URL - Email verification callback URL
- EMAIL_FROM - Sender email address
- GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET - Google OAuth credentials
- GOOGLE_OAUTH_REDIRECT_URI - OAuth redirect URL
- COOKIE_DOMAIN - Domain for session cookies

**App** (`.app/.env`):
- VITE_HW_API_BASE - Backend API URL (default: http://localhost:3000)
- VITE_LOGIN_URL - Login page URL (default: http://localhost:5174)
- VITE_HOMEPAGE_URL - Homepage URL (default: http://localhost:3001)

**Homepage** (`.homepage/.env`):
- Configure as needed for the Nuxt homepage

## Running with Docker Compose

The easiest way to get started is using Docker Compose, which runs all services together:

```bash
docker compose up
```

This starts:
- **Frontend (Vite)** on http://localhost:5173 - Vue 3 development server with hot reload
- **Backend (NestJS)** on http://localhost:3000 - API server
- **Homepage (Nuxt)** on http://localhost:3001 - Homepage with SSR
- **Database** - PostgreSQL via Supabase

The docker-compose configuration includes health checks and automatic service dependencies.

## Project Structure

```
schul-dashboard/
├── app/              - Vue 3 frontend (Vite, TypeScript)
│   ├── src/          - Source code
│   ├── public/       - Static assets
│   └── Dockerfile.dev
├── server/           - NestJS backend (TypeScript)
│   ├── src/          - Source code
│   ├── test/         - Test files
│   └── Dockerfile.dev
├── homepage/         - Nuxt homepage (SSR)
│   ├── app/          - Page components
│   ├── locales/      - i18n translations
│   └── Dockerfile.dev
└── docs/             - Documentation
```

## Development Workflow

### Frontend Development (app/)

The frontend runs with Vite's hot module replacement. Changes to Vue components and TypeScript files reflect instantly.

**Scripts:**
- pnpm run dev - Start development server
- pnpm run build - Build for production
- pnpm run lint - Run ESLint with fixes
- pnpm run format - Format code with Prettier

### Backend Development (server/)

The backend runs in watch mode with NestJS CLI, recompiling on file changes.

**Scripts:**
- pnpm run dev - Start in watch mode
- pnpm run build - Build for production
- pnpm run start:prod - Run compiled production build
- pnpm run test - Run unit tests
- pnpm run test:e2e - Run e2e tests
- pnpm run lint - Run ESLint with fixes

### Homepage Development (homepage/)

**Scripts:**
- pnpm run dev - Start Nuxt development server
- pnpm run build - Build for production
- pnpm run preview - Preview production build

## Code Architecture & Standards

All code follows these principles (see CLAUDE.md):

- **Clean Code & SOLID** - Small, single-purpose functions; composition over inheritance
- **Type Safety** - Full TypeScript coverage; avoid any type
- **Modularity** - Independent, testable modules; no circular dependencies
- **Security First** - Input validation, error handling, respect encryption standards (AES-256-GCM, CSRF)
- **Documentation** - Self-documenting code with JSDoc for complex logic
- **Modern Practices** - Vue 3 Composition API, NestJS best practices, ESNext features

## Testing

**Backend Tests:**
```bash
cd server
pnpm run test        # Unit tests
pnpm run test:e2e    # E2E tests
pnpm run test:cov    # Coverage report
```

## Production Deployment

### Build Process

```bash
pnpm build
```

This creates optimized production builds for:
- Frontend: app/dist/
- Backend: server/dist/

### Environment Configuration

For production, ensure all environment variables are set correctly:
- Use secure, randomly generated JWT secrets
- Set NODE_ENV=production
- Use production Supabase credentials
- Configure production email and image service keys
- Set proper CORS origins
- Use secure, production-grade COOKIE_DOMAIN

### Hosting & Reverse Proxy

Deploy the application to a server with:

1. Node.js runtime (version 22+) or Docker
2. Reverse proxy (nginx/Apache) for:
   - SSL/TLS termination
   - Load balancing
   - Static file serving
3. PostgreSQL database (Supabase)
4. External services:
   - Cloudinary for images
   - Resend for email
   - Supabase for database

### Database

The application uses PostgreSQL via Supabase:

1. Create a Supabase project
2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
3. Database schema is automatically managed by NestJS

### Health Monitoring

Docker Compose includes health checks:
```bash
curl http://localhost:3000/api/system/serverstatus
```

Monitor in production:
- Application logs
- Database connections
- API response times
- Error rates

## Troubleshooting

### Port Conflicts

If ports 3000, 5173, or 3001 are in use, find and stop the processes:
```bash
# Linux/Mac - Find process on port
lsof -i :3000
```

### Docker Issues

```bash
# View logs
docker compose logs -f

# Rebuild containers
docker compose build --no-cache

# Reset volumes
docker compose down -v
```

### Environment Variable Issues

Verify .env files are in correct locations:
- server/.env for backend
- app/.env for frontend
- homepage/.env for homepage

### Database Connection

Test Supabase connection:
```bash
curl https://your-supabase-url/rest/v1/
  -H "apikey: your-api-key"
```

## Additional Resources

- Vue 3 Docs: https://vuejs.org/
- NestJS Docs: https://docs.nestjs.com/
- Supabase Docs: https://supabase.com/docs
- Vite Docs: https://vitejs.dev/
- Nuxt Docs: https://nuxt.com/
- Socket.IO Docs: https://socket.io/docs/
- Tailwind CSS Docs: https://tailwindcss.com/docs

## Support

For issues:
1. Check existing GitHub issues
2. Review logs: docker compose logs
3. Verify environment variables
4. Test individual services
