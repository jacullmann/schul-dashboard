# Schul Dashboard

A web-based school platform where students manage homework, view timetables, and organize in groups.

---

## Core Features

**Tasks** — Create and track homework, Dalton tasks, and exams with due dates, images, and status indicators. Pin important items, archive completed ones, or report inappropriate content.

**Timetable** — View your class schedule with substitution plans. Optionally personalize it by selecting your WPU courses, enrichment, and theater preferences.

**Groups** — Every class or study group gets its own space. Join with a group name and password, or create your own. Switch between multiple groups seamlessly.

**Private Todos** — Encrypted personal notes and to-dos that only you can see. Drag-and-drop sorting included.

**Sorgenbox** — Submit anonymous concerns or feedback.

**Admin Tools** — Group admins manage substitutions, announcements, and cleanup. Superadmins have global access to user management, reports, statistics, and a collaborative shared document.

**Security** — Email verification, optional TOTP-based two-factor authentication, encrypted personal data, and CSRF protection.

## Additional Tools

Kürzelfinder (teacher abbreviation lookup), Dalton room finder, image editor, AI text detector, brain training games, and more.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue.js 3, TypeScript, Pinia, Vue Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL via Supabase |
| Auth | JWT (HttpOnly cookies), bcrypt, TOTP |
| Encryption | AES-256-GCM with scrypt |
| Realtime | Socket.IO |
| Images | Cloudinary |
| Email | Resend |