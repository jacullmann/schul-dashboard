# schul-dashboard

A free web-based platform where students can manage homework, view schedules, and organize in groups.

---

## Core Features

**Tasks** — Create and track homework, tasks, and exams with due dates, images, and status indicators. Pin important items, archive completed ones, or report inappropriate content.

**Timetable** — View your class schedule with substitution plans. Optionally personalize it by selecting the courses you take.

**Groups** — Every class or study group gets its own space. Join with a group name and password, or create your own. Switch between multiple groups seamlessly.

**Private To-dos** — Encrypted personal notes and to-dos that only you can see. Progress tracking and drag-and-drop sorting included.

**Admin Tools** — Group admins manage substitutions, announcements, and cleanup. Superadmins have global access to user management, reports, statistics, and a collaborative shared document.

**Security** — Email verification, optional TOTP-based two-factor authentication, encrypted personal data, and CSRF protection.

## Additional Tools

Image editor, mental tests, info dashboard and more.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue.js 3, TypeScript, Pinia, Vue Router, Tailwind CSS, Vite |
| Backend | Node.js, NestJS |
| Database | PostgreSQL via Supabase |
| Auth | JWT (HttpOnly cookies), bcrypt, TOTP |
| Encryption | AES-256-GCM with scrypt |
| Realtime | Socket.IO |
| Images | Cloudinary |
| Email | Resend |
