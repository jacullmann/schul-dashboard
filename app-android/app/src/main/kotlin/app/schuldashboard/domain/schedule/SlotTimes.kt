package app.schuldashboard.domain.schedule

import app.schuldashboard.domain.DEFAULT_START_TIME
import app.schuldashboard.domain.ScheduleConfig

/** Minutes since midnight for an `HH:MM` string; malformed input falls back to the default start. */
fun minutesSinceMidnight(time: String?): Int {
    val parts = (time ?: DEFAULT_START_TIME).split(':').map { it.toIntOrNull() }
    return (parts.getOrNull(0) ?: 8) * 60 + (parts.getOrNull(1) ?: 0)
}

fun formatTimeOfDay(minutes: Int): String = "%02d:%02d".format(minutes / 60, minutes % 60)

data class MinuteRange(val start: Int, val end: Int) {
    fun format() = "${formatTimeOfDay(start)} - ${formatTimeOfDay(end)}"
}

/** When a slot starts, after every lesson and break before it. */
fun ScheduleConfig.slotStartMinutes(slot: Int): Int {
    var minutes = minutesSinceMidnight(startTime)
    for (earlier in 1 until slot) minutes += lessonDurationMins + (breaks[earlier] ?: 0)
    return minutes
}

/** From the start of the first slot to the end of the last, breaks between them included. */
fun ScheduleConfig.slotRange(firstSlot: Int, lastSlot: Int = firstSlot) =
    MinuteRange(slotStartMinutes(firstSlot), slotStartMinutes(lastSlot) + lessonDurationMins)

fun ScheduleConfig.lessonRange(lesson: DisplayLesson) =
    slotRange(lesson.slot, lesson.lastSlot)
