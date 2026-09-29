package app.schuldashboard.domain.schedule

import app.schuldashboard.data.api.CourseSelection
import app.schuldashboard.data.api.LessonDto
import app.schuldashboard.data.api.NameRef
import app.schuldashboard.data.api.ScheduleCourseDto
import app.schuldashboard.data.api.ScheduleSubjectDto
import app.schuldashboard.data.api.SubstitutionDto
import app.schuldashboard.domain.ScheduleConfig
import java.time.LocalDateTime

const val DALTON_SUBJECT_KEY = "dalton"
val SCHOOL_DAYS = listOf(1, 2, 3, 4, 5)

/** A lesson as the member sees it, after course personalization and substitutions. */
data class DisplayLesson(
    val id: String,
    val originalId: String,
    val day: Int,
    val slot: Int,
    val duration: Int,
    val room: String?,
    val subjectName: String,
    val courseId: String?,
    val courseName: String?,
    val cancelled: Boolean = false,
    val originalRoom: String? = null,
    val substitutedSubject: Boolean = false,
    /** Shown to the member although they take none of its courses. */
    val outsideCourseSelection: Boolean = false,
) {
    val lastSlot get() = slot + duration - 1
}

/** Lessons that start in the same slot of the same day share one cell. */
data class LessonGroup(val key: String, val day: Int, val slot: Int, val lessons: List<DisplayLesson>) {
    val span get() = lessons.maxOf { it.duration }
}

fun lessonSpan(duration: Int?) = maxOf(1, duration ?: 1)

data class PersonalizationResult(val lessons: List<DisplayLesson>, val hiddenCount: Int)

/**
 * Port of the web client's `personalLessons`: a lesson scheduled for one course is already personal,
 * a course-less lesson covers the whole group and, in a regular group, splits into the member's own courses.
 */
fun personalizeLessons(
    lessons: List<LessonDto>,
    subjects: List<ScheduleSubjectDto>,
    userCourses: List<CourseSelection>,
    isPersonalized: Boolean,
    hasCourseSelection: Boolean,
    schedulesCoursesIndividually: Boolean,
): PersonalizationResult {
    val subjectMap = subjects.associateBy { it.id }
    val userCourseIds = userCourses.mapTo(hashSetOf()) { it.courseId }
    val result = mutableListOf<DisplayLesson>()
    var hidden = 0

    for (lesson in lessons) {
        val subjectId = lesson.subjectId ?: lesson.subjects?.id
        val subject = subjectId?.let(subjectMap::get)
        val courses: List<ScheduleCourseDto> = subject?.courses.orEmpty()
        val subjectRef = lesson.subjects ?: subject?.let { NameRef(it.id, it.name) }
        val subjectName = subjectRef?.name ?: lesson.subject ?: lesson.subjectAbbr.orEmpty()
        val ownCourseId = lesson.courseId ?: lesson.courses?.id
        val ownCourse = lesson.courses?.let { ScheduleCourseDto(it.id, it.name) }
            ?: ownCourseId?.let { id -> courses.firstOrNull { it.id == id } }
        val base = DisplayLesson(
            id = lesson.id,
            originalId = lesson.id,
            day = lesson.day,
            slot = lesson.slot,
            duration = lessonSpan(lesson.duration),
            room = lesson.room,
            subjectName = subjectName,
            courseId = null,
            courseName = null,
        )

        if (ownCourseId != null) {
            result += base.copy(
                courseId = ownCourseId,
                courseName = lesson.courseName ?: ownCourse?.name,
                outsideCourseSelection = hasCourseSelection && ownCourseId !in userCourseIds,
            )
            continue
        }

        if (!isPersonalized || schedulesCoursesIndividually) {
            result += base.copy(
                outsideCourseSelection = hasCourseSelection &&
                    !schedulesCoursesIndividually &&
                    courses.isNotEmpty() &&
                    courses.none { it.id in userCourseIds },
            )
            continue
        }

        if (courses.isEmpty()) {
            result += base
            continue
        }

        val ownCourses = courses.filter { it.id in userCourseIds }
        if (ownCourses.isEmpty()) hidden++
        ownCourses.forEach { course ->
            result += base.copy(id = "${lesson.id}_${course.id}", courseId = course.id, courseName = course.name)
        }
    }
    return PersonalizationResult(result, hidden)
}

fun applySubstitutions(lessons: List<DisplayLesson>, substitutions: List<SubstitutionDto>): List<DisplayLesson> {
    val byLesson = substitutions.groupBy { it.lessonId }
    return lessons.flatMap { original ->
        val subs = byLesson[original.originalId].orEmpty()
            .filter { it.courseId == null || (original.courseId != null && it.courseId == original.courseId) }
        if (subs.isEmpty()) return@flatMap listOf(original)

        subs.filterNot { it.hide == true }.map { sub ->
            original.copy(
                subjectName = sub.subject?.takeIf { it.isNotEmpty() } ?: original.subjectName,
                substitutedSubject = original.substitutedSubject || !sub.subject.isNullOrEmpty(),
                room = sub.room?.takeIf { it.isNotEmpty() } ?: original.room,
                originalRoom = original.room,
                cancelled = sub.cancelled ?: original.cancelled,
            )
        }
    }
}

fun groupLessonsBySlot(lessons: List<DisplayLesson>): List<LessonGroup> =
    lessons.groupBy { "${it.day}-${it.slot}" }
        .map { (key, group) -> LessonGroup(key, group.first().day, group.first().slot, group) }

/** Monday-first index (0..6) of a date. */
fun LocalDateTime.mondayIndex() = dayOfWeek.value - 1

/**
 * The day to open the schedule on: today, unless the weekend or the day's last lesson is over,
 * in which case the next school day.
 */
fun defaultDayIndex(
    now: LocalDateTime,
    lessons: List<DisplayLesson>,
    config: ScheduleConfig,
): Int {
    val dayIndex = now.mondayIndex()
    if (dayIndex >= 5) return 0
    val today = lessons.filter { it.day == SCHOOL_DAYS[dayIndex] }
    if (today.isNotEmpty()) {
        val lastEnd = today.maxOf { config.lessonRange(it).end }
        val nowMinutes = now.hour * 60 + now.minute
        if (nowMinutes > lastEnd + 10) return (dayIndex + 1) % 5
    }
    return dayIndex
}

/** The group in progress now, or the next one that starts soon; null when nothing is close. */
fun activeOrNextGroupKey(now: LocalDateTime, groups: List<LessonGroup>, config: ScheduleConfig): String? {
    val nowTotal = now.mondayIndex() * MINUTES_PER_DAY + now.hour * 60 + now.minute

    data class Block(val key: String, val start: Int, val end: Int)

    val blocks = groups.mapNotNull { group ->
        val dayIndex = SCHOOL_DAYS.indexOf(group.day)
        if (dayIndex < 0) return@mapNotNull null
        val range = config.slotRange(group.slot, group.slot + group.span - 1)
        Block(group.key, dayIndex * MINUTES_PER_DAY + range.start, dayIndex * MINUTES_PER_DAY + range.end)
    }

    blocks.firstOrNull { nowTotal >= it.start && nowTotal < it.end }?.let { return it.key }

    val next = blocks.filter { it.start > nowTotal }.minByOrNull { it.start } ?: return null
    val lastFinished = blocks.filter { it.end <= nowTotal }.maxByOrNull { it.end }
    if (lastFinished != null &&
        nowTotal - lastFinished.end > 10 &&
        next.start - nowTotal > 120
    ) {
        return null
    }
    return next.key
}

/** The lesson in progress or, failing that, the next one this week; null once the week is over. */
fun nextLessonGroup(now: LocalDateTime, groups: List<LessonGroup>, config: ScheduleConfig): LessonGroup? {
    val nowTotal = now.mondayIndex() * MINUTES_PER_DAY + now.hour * 60 + now.minute
    return groups
        .filter { group -> group.lessons.any { !it.cancelled } }
        .sortedWith(compareBy({ it.day }, { it.slot }))
        .firstOrNull { group ->
            val dayIndex = SCHOOL_DAYS.indexOf(group.day)
            dayIndex >= 0 && dayIndex * MINUTES_PER_DAY + config.slotRange(group.slot, group.slot + group.span - 1).end > nowTotal
        }
}

/** Lessons a substitution touched: cancelled, taught as another subject, or moved to another room. */
fun DisplayLesson.hasChange() = cancelled || substitutedSubject || (originalRoom != null && originalRoom != room)


private const val MINUTES_PER_DAY = 24 * 60
