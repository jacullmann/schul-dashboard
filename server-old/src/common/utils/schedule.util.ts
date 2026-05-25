export function filterLessonsForUser(
  lessons: any[],
  userCourseIds: string[],
): any[] {
  return lessons.filter((lesson) => {
    if (lesson.course_id) {
      return userCourseIds.includes(lesson.course_id);
    }
    return true;
  });
}
