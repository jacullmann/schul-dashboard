export function filterLessonsForUser(
  lessons: any[],
  user: { enrKurs: string | null; wpuKurs1: string | null; wpuKurs2: string | null; theater: number },
): any[] {
  const courseMapping: Record<string, string | number | null> = {
    enrichment: user.enrKurs,
    wpu1: user.wpuKurs1,
    wpu2: user.wpuKurs2,
    theater: user.theater,
  };

  return lessons.filter((lesson) => {
    const subjectName = lesson.subjects?.name;
    const normalizedSubject = subjectName ? subjectName.toLowerCase() : '';
    const userCourseId = courseMapping[normalizedSubject];

    if (userCourseId === undefined) {
      return true;
    }

    if (!userCourseId) {
      return false;
    }

    if (normalizedSubject === 'theater') {
      return true;
    }

    const lessonCourseId = lesson.course_id;

    if (!lessonCourseId) {
      return true;
    }

    return lessonCourseId === userCourseId;
  });
}
