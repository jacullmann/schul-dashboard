export function filterLessonsForUser(lessons, user) {
    const courseMapping = {
        'enrichment': user.enrKurs,
        'wpu1': user.wpuKurs1,
        'wpu2': user.wpuKurs2,
        'theater': user.theater
    };

    return lessons.filter(lesson => {
        const userCourseId = courseMapping[lesson.subject];

        // Immer anzeigen wenn keine id
        if (userCourseId === undefined) {
            return true;
        }

        // keine anzeigen, wenn er übersprungen hat
        if (userCourseId === null) {
            return false;
        }

        // alle kurse ohne ki anzeigen
        if (lesson.courseId === null || lesson.courseId === undefined) {
            return true;
        }

        // personalisierte kurse anzeigen
        return lesson.courseId === userCourseId;
    });
}