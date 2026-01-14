export function filterLessonsForUser(lessons, user) {
    const courseMapping = {
        'Enrichment': user.enrKurs,
        'WPU (Di)': user.wpuKurs1,
        'WPU (Do)': user.wpuKurs2,
        'Theater': user.theater
    };

    return lessons.filter(lesson => {
        const userCourseId = courseMapping[lesson.subject];

        // Immer anzeigen wenn keine id
        if (userCourseId === undefined) {
            return true;
        }

        // keine anzeigen, wenn er übersprungen hat
        if (userCourseId === 0) {
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