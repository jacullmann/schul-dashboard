package app.schuldashboard.domain.schedule

import app.schuldashboard.data.api.CourseSelection
import app.schuldashboard.data.api.LessonDto
import app.schuldashboard.data.api.NameRef
import app.schuldashboard.data.api.ScheduleCourseDto
import app.schuldashboard.data.api.ScheduleSubjectDto
import app.schuldashboard.data.api.SubstitutionDto
import app.schuldashboard.domain.DEFAULT_BREAKS
import app.schuldashboard.domain.ScheduleConfig
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.LocalDateTime

class ScheduleLogicTest {
    private val config = ScheduleConfig("08:00", 9, 45, DEFAULT_BREAKS)

    @Test
    fun slotStartAddsEarlierLessonsAndBreaks() {
        assertEquals(8 * 60, config.slotStartMinutes(1))
        assertEquals(8 * 60 + 45, config.slotStartMinutes(2))
        assertEquals(8 * 60 + 45 + 45 + 25, config.slotStartMinutes(3))
    }

    @Test
    fun rangeSpansDoubleLessons() {
        val range = config.slotRange(1, 2)
        assertEquals("08:00 - 09:30", range.format())
    }

    @Test
    fun malformedStartTimeFallsBackToDefault() {
        assertEquals(8 * 60, minutesSinceMidnight(null))
        assertEquals(8 * 60, minutesSinceMidnight("xx:yy"))
    }

    private val math = ScheduleSubjectDto(
        id = "s1",
        name = "math",
        courses = listOf(ScheduleCourseDto("c1", "GK1"), ScheduleCourseDto("c2", "GK2")),
    )
    private val lesson = LessonDto(id = "l1", day = 1, slot = 1, subjects = NameRef("s1", "math"))

    @Test
    fun personalizedRegularGroupSplitsIntoOwnCourse() {
        val result = personalizeLessons(
            lessons = listOf(lesson),
            subjects = listOf(math),
            userCourses = listOf(CourseSelection("s1", "c2")),
            isPersonalized = true,
            hasCourseSelection = true,
            schedulesCoursesIndividually = false,
        )
        assertEquals(1, result.lessons.size)
        assertEquals("c2", result.lessons.single().courseId)
        assertEquals("l1", result.lessons.single().originalId)
        assertEquals(0, result.hiddenCount)
    }

    @Test
    fun lessonWithoutMatchingCourseCountsAsHidden() {
        val result = personalizeLessons(
            lessons = listOf(lesson),
            subjects = listOf(math),
            userCourses = listOf(CourseSelection("s2", "c9")),
            isPersonalized = true,
            hasCourseSelection = true,
            schedulesCoursesIndividually = false,
        )
        assertTrue(result.lessons.isEmpty())
        assertEquals(1, result.hiddenCount)
    }

    @Test
    fun substitutionOverridesRoomAndCancels() {
        val base = personalizeLessons(listOf(lesson.copy(room = "101")), listOf(math), emptyList(), false, false, false).lessons
        val substituted = applySubstitutions(
            base,
            listOf(SubstitutionDto(id = "x", lessonId = "l1", room = "202", cancelled = true)),
        ).single()
        assertEquals("202", substituted.room)
        assertTrue(substituted.cancelled)
    }

    @Test
    fun hiddenSubstitutionRemovesLesson() {
        val base = personalizeLessons(listOf(lesson), listOf(math), emptyList(), false, false, false).lessons
        val result = applySubstitutions(base, listOf(SubstitutionDto(id = "x", lessonId = "l1", hide = true)))
        assertTrue(result.isEmpty())
    }

    @Test
    fun weekendOpensOnMonday() {
        val saturday = LocalDateTime.of(2026, 9, 26, 12, 0)
        assertEquals(0, defaultDayIndex(saturday, emptyList(), config))
    }

    @Test
    fun afterLastLessonOpensNextDay() {
        val tuesdayEvening = LocalDateTime.of(2026, 9, 29, 18, 0)
        val lessons = personalizeLessons(
            listOf(lesson.copy(day = 2)), listOf(math), emptyList(), false, false, false,
        ).lessons
        assertEquals(2, defaultDayIndex(tuesdayEvening, lessons, config))
    }

    @Test
    fun activeGroupIsHighlightedAndDistantOnesAreNot() {
        val groups = groupLessonsBySlot(
            personalizeLessons(listOf(lesson), listOf(math), emptyList(), false, false, false).lessons,
        )
        val monday830 = LocalDateTime.of(2026, 9, 28, 8, 30)
        assertEquals("1-1", activeOrNextGroupKey(monday830, groups, config))
        val mondayNoon = LocalDateTime.of(2026, 9, 28, 12, 0)
        assertNull(activeOrNextGroupKey(mondayNoon, groups, config))
    }
}
