# schul-dashboard

A free web-based platform where students can manage tasks, view schedules, and organize in groups.

---

## Core Features

### Tasks

Create and track homework, tasks, and exams with due dates, images, and status indicators. Pin important items, archive old ones, and check off completed tasks.

### Schedule

View your class schedule with live changes. Personalize your schedule by selecting the courses you take.

### Groups

Every class or study group gets its own space. Join with a group name and password, or create your own. Switch between multiple groups seamlessly.

### Private Tasks

Encrypted personal notes and todos visible only to you. Progress tracking and drag-and-drop sorting included.

### Admin Tools

Admins and moderators handle user content, oversee members, and manage announcements and schedule changes. Private data is protected through randomly-generated user names.

### Quick Search

A powerful command palette with handy keyboard shortcuts lets you reach anything in seconds.

### Security

Email verification, optional TOTP-based two-factor authentication, encrypted personal data, and CSRF protection.

---

## Tech Stack

| Layer        | Technology                                                  |
|:-------------|:------------------------------------------------------------|
| Frontend     | Vue.js 3, TypeScript, Pinia, Vue Router, Tailwind CSS, Vite |
| Backend      | Node.js, NestJS                                             |
| Database     | PostgreSQL via Supabase                                     |
| Auth         | JWT (HttpOnly cookies), bcryptjs, TOTP                      |
| Encryption   | AES-256-GCM                                                 |
| Realtime     | Socket.IO                                                   |
| Images       | Cloudinary                                                  |
| Email        | Resend                                                      |
| Validation   | Class Validator, Class Transformer                          |

## Quick Start

For detailed setup and deployment instructions, see [Getting Started Guide](./docs/GETTING_STARTED.md).

**Development (Docker):**
```bash
docker compose up
```
**Linux with SELinux (Fedora/RHEL):**
```bash
podman-compose -f docker-compose.yaml -f docker-compose.selinux.yaml up

Ports:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Homepage: http://localhost:3001
