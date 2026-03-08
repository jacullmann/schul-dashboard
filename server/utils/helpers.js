export function filterLessonsForUser(lessons, user) {
    const courseMapping = {
        'enrichment': user.enrKurs,
        'wpu1': user.wpuKurs1,
        'wpu2': user.wpuKurs2,
        'theater': user.theater
    };

    return lessons.filter(lesson => {
        const subjectName = lesson.subjects?.name || lesson.subject;
        const normalizedSubject = subjectName ? subjectName.toLowerCase() : '';
        const userCourseId = courseMapping[normalizedSubject];

        // Immer anzeigen wenn es kein personalisiertes Fach ist
        if (userCourseId === undefined) {
            return true;
        }

        // Wenn der User den Kurs nicht gewählt hat (UUID ist null oder Theater ist 0), nicht anzeigen
        if (!userCourseId) {
            return false;
        }

        // Theater hat keine course_id, aber user.theater > 0 bedeutet gewählt
        if (normalizedSubject === 'theater') {
            return true;
        }

        // Für WPU/ENR die UUID vergleichen
        const lessonCourseId = lesson.courseId || lesson.course_id;

        // Wenn die Lesson komischerweise keine ID hat, sicherheitshalber anzeigen
        if (!lessonCourseId) {
            return true;
        }

        return lessonCourseId === userCourseId;
    });
}