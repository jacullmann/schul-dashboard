import type { Request, Response } from 'express';
// routes/timetable.ts
// Read-only timetable and substitution data for authenticated users
import { Router } from 'express';
import * as db from '../db/db.js';
import type { RouteDeps } from '../types/index.js';

export default function createTimetableRoutes(deps: RouteDeps): Router {
  const router = Router();
  const {
    supabase,
    authSecret,
    requireAuth,
    requireTenant,
    sendJSONError,
    filterLessonsForUser,
  } = deps;

  // GET /api/timetable
  router.get(
    '/',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (req: Request, res: Response) => {
      try {
        const lessons = await db.getTimetableLessons(supabase, req.tenantId!);
        if (!lessons) {
          res.json([]);
          return;
        }

        let filteredLessons = lessons;
        if (req.user) {
          const user = await db.findUserById(
            supabase,
            req.user.sub,
            'personalized, done_setup, enr_kurs, wpu_kurs_1, wpu_kurs_2, theater',
          );
          if (user?.personalized && user?.done_setup) {
            filteredLessons = filterLessonsForUser(lessons, {
              enrKurs: user.enr_kurs as string | null,
              wpuKurs1: user.wpu_kurs_1 as string | null,
              wpuKurs2: user.wpu_kurs_2 as string | null,
              theater: user.theater as number,
            });
          }
        }

        res.json(
          filteredLessons.map((l) => ({
            id: l.id,
            day: l.day,
            slot: l.slot,
            duration: l.duration,
            room: l.room,
            courseId: l.course_id,
            persons: l.persons ? { id: l.persons.id } : null,
            subjects: l.subjects
              ? { id: l.subjects.id, name: l.subjects.name }
              : null,
            courses: l.courses
              ? { id: l.courses.id, name: l.courses.name }
              : null,
          })),
        );
      } catch (err) {
        console.error('GET /api/timetable error', err);
        sendJSONError(res, 500, 'Fehler beim Laden des Stundenplans');
      }
    },
  );

  // GET /api/timetable/subs
  router.get(
    '/subs',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (req: Request, res: Response) => {
      try {
        const subs = await db.listTimetableSubs(supabase, req.tenantId!);
        res.json(
          subs.map((s) => ({
            id: s.id,
            lessonId: s.lesson_id,
            day: s.day,
            slot: s.slot,
            duration: s.duration,
            subject: s.subject,
            room: s.room,
            cancelled: s.cancelled,
            hide: s.hide,
            createdAt: s.created_at,
          })),
        );
      } catch (err) {
        console.error('GET /api/timetable/subs error', err);
        sendJSONError(res, 500, 'Fehler beim Laden der Substitutions');
      }
    },
  );

  // GET /api/timetable/subjects
  router.get(
    '/subjects',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (_req: Request, res: Response) => {
      try {
        res.json(await db.listSubjects(supabase, _req.tenantId!));
      } catch {
        sendJSONError(res, 500, 'Fehler beim Laden der Fächer');
      }
    },
  );

  // GET /api/timetable/persons
  router.get(
    '/persons',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (req: Request, res: Response) => {
      try {
        const data = await db.listPersons(supabase, req.tenantId!);
        res.json(
          data.map((p) => ({
            id: p.id,
            name: p.name,
            short: p.short,
            title: p.title,
            personSubjects: p.person_subjects,
          })),
        );
      } catch {
        sendJSONError(res, 500, 'Fehler beim Laden der Personen');
      }
    },
  );

  // GET /api/timetable/dalton-schedule
  router.get(
    '/dalton-schedule',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (req: Request, res: Response) => {
      try {
        const data = await db.listDaltonSchedule(supabase, req.tenantId!);
        res.json(
          data.map((r) => ({
            id: r.id,
            room: r.room,
            size: r.size,
            moPersonId: r.mo_person_id,
            diPersonId: r.di_person_id,
            miPersonId: r.mi_person_id,
            doPersonId: r.do_person_id,
            frPersonId: r.fr_person_id,
          })),
        );
      } catch {
        sendJSONError(res, 500, 'Fehler beim Laden der Dalton-Pläne');
      }
    },
  );

  // GET /api/timetable/announcements
  router.get(
    '/announcements',
    requireAuth(authSecret, supabase),
    requireTenant(supabase),
    async (req: Request, res: Response) => {
      try {
        const list = await db.listAnnouncements(supabase, req.tenantId!, 5);
        res.json(
          list.map((a) => ({
            id: a.id,
            content: a.content,
            color: a.color,
            showAsPopup: a.show_as_popup,
            createdBy: a.created_by,
            createdAt: a.created_at,
          })),
        );
      } catch {
        sendJSONError(res, 500, 'Fehler beim Laden der Ankündigungen');
      }
    },
  );

  return router;
}
