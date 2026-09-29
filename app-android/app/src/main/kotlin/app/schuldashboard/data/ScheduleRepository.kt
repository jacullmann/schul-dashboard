package app.schuldashboard.data

import app.schuldashboard.data.api.AnnouncementDto
import app.schuldashboard.data.api.LessonDto
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.ScheduleSubjectDto
import app.schuldashboard.data.api.SubstitutionDto
import app.schuldashboard.data.api.requireSuccess
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import javax.inject.Inject
import javax.inject.Singleton

data class RawSchedule(
    val lessons: List<LessonDto>,
    val subjects: List<ScheduleSubjectDto>,
    val substitutions: List<SubstitutionDto>,
    val hiddenByServer: Int,
)

@Singleton
class ScheduleRepository @Inject constructor(private val api: SchulApi) {
    suspend fun load(groupId: String): RawSchedule = coroutineScope {
        val lessons = async { api.schedule(groupId).requireSuccess() }
        val subjects = async { runCatching { api.scheduleSubjects(groupId) }.getOrDefault(emptyList()) }
        val subs = async { runCatching { api.substitutions(groupId) }.getOrDefault(emptyList()) }
        val lessonResponse = lessons.await()
        RawSchedule(
            lessons = lessonResponse.body().orEmpty(),
            subjects = subjects.await(),
            substitutions = subs.await(),
            hiddenByServer = lessonResponse.headers()["x-hidden-by-courses"]?.toIntOrNull() ?: 0,
        )
    }

    suspend fun subjects(groupId: String): List<ScheduleSubjectDto> = api.scheduleSubjects(groupId)

    suspend fun announcements(groupId: String): List<AnnouncementDto> = api.announcements(groupId)

    suspend fun readAnnouncementIds(groupId: String): Set<String> =
        runCatching { api.announcementReadStatus(groupId).toSet() }.getOrDefault(emptySet())

    suspend fun markAnnouncementRead(groupId: String, id: String) {
        runCatching { api.markAnnouncementRead(groupId, id) }
    }
}
