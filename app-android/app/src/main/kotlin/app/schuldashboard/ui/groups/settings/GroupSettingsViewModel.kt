package app.schuldashboard.ui.groups.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.AdminApi
import app.schuldashboard.data.api.AdminLessonDto
import app.schuldashboard.data.api.AdminSubjectDto
import app.schuldashboard.data.api.AnnouncementDto
import app.schuldashboard.data.api.BannedUserDto
import app.schuldashboard.data.api.CourseRequest
import app.schuldashboard.data.api.CreateAnnouncementRequest
import app.schuldashboard.data.api.GroupSettingsRequest
import app.schuldashboard.data.api.GroupStatsDto
import app.schuldashboard.data.api.InviteLogDto
import app.schuldashboard.data.api.LessonRequest
import app.schuldashboard.data.api.MemberDto
import app.schuldashboard.data.api.PermissionsRequest
import app.schuldashboard.data.api.RoleRequest
import app.schuldashboard.data.api.ScheduleConfigBody
import app.schuldashboard.data.api.ScheduleConfigRequest
import app.schuldashboard.data.api.SubjectRequest
import app.schuldashboard.data.api.SubstitutionDto
import app.schuldashboard.data.api.SubstitutionRequest
import app.schuldashboard.data.api.TransferOwnershipRequest
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.domain.Group
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

enum class SettingsTab { Overview, General, Members, Subjects, Schedule, Announcements }

data class SettingsState(
    val stats: GroupStatsDto? = null,
    val permissions: Map<String, String> = emptyMap(),
    val members: List<MemberDto> = emptyList(),
    val banned: List<BannedUserDto> = emptyList(),
    val invites: List<InviteLogDto> = emptyList(),
    val newInviteToken: String? = null,
    val subjects: List<AdminSubjectDto> = emptyList(),
    val lessons: List<AdminLessonDto> = emptyList(),
    val subs: List<SubstitutionDto> = emptyList(),
    val announcements: List<AnnouncementDto> = emptyList(),
    val busy: Boolean = false,
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class GroupSettingsViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val admin: AdminApi,
    private val schedule: ScheduleRepository,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    val groupId: String = checkNotNull(handle["groupId"])

    val group: Group? get() = sessions.group(groupId)
    val currentUserId: String get() = (sessions.state.value as? AuthState.LoggedIn)?.user?.id.orEmpty()
    val isSuperadmin: Boolean get() = (sessions.state.value as? AuthState.LoggedIn)?.user?.isSuperadmin == true

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    private val _groupGone = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val groupGone = _groupGone.asSharedFlow()

    private fun str(id: Int) = getApplication<Application>().getString(id)

    fun clearFeedback() = _state.update { it.copy(message = null, error = null) }

    /** Loads a tab's data; failures surface as the server's message. */
    fun load(tab: SettingsTab) {
        when (tab) {
            SettingsTab.Overview -> fetch { val v = admin.stats(groupId); { s -> s.copy(stats = v) } }
            SettingsTab.General -> fetch { val v = admin.permissions(groupId).permissions; { s -> s.copy(permissions = v) } }
            SettingsTab.Members -> {
                fetch { val v = admin.members(groupId); { s -> s.copy(members = v) } }
                fetch { val v = runCatching { admin.bannedUsers(groupId) }.getOrDefault(emptyList()); { s -> s.copy(banned = v) } }
                fetch { val v = runCatching { admin.invites(groupId) }.getOrDefault(emptyList()); { s -> s.copy(invites = v) } }
            }
            SettingsTab.Subjects -> fetch { val v = admin.subjects(groupId); { s -> s.copy(subjects = v) } }
            SettingsTab.Schedule -> {
                fetch { val v = admin.schedule(groupId); { s -> s.copy(lessons = v) } }
                fetch { val v = admin.subs(groupId); { s -> s.copy(subs = v) } }
                fetch { val v = admin.subjects(groupId); { s -> s.copy(subjects = v) } }
            }
            SettingsTab.Announcements -> fetch { val v = schedule.announcements(groupId); { s -> s.copy(announcements = v) } }
        }
    }

    /** The block fetches first and returns the change, so parallel fetches never overwrite each other's fields. */
    private fun fetch(block: suspend () -> (SettingsState) -> SettingsState) {
        viewModelScope.launch {
            try {
                val change = block()
                _state.update(change)
            } catch (e: Exception) {
                _state.update { it.copy(error = e.apiErrorMessage(json, str(R.string.error_loading))) }
            }
        }
    }

    private fun act(reload: SettingsTab? = null, success: Int? = null, block: suspend () -> Unit) {
        _state.update { it.copy(busy = true, error = null, message = null) }
        viewModelScope.launch {
            try {
                block()
                _state.update { it.copy(message = success?.let(::str)) }
                reload?.let(::load)
            } catch (e: Exception) {
                _state.update { it.copy(error = e.apiErrorMessage(json, str(R.string.error_unknown))) }
            } finally {
                _state.update { it.copy(busy = false) }
            }
        }
    }

    // ---- overview / general ----
    fun cleanup() = act(SettingsTab.Overview) { admin.cleanupOldItems(groupId) }

    fun deleteGroup() = act {
        admin.deleteGroup(groupId).requireSuccess()
        sessions.refreshState()
        _groupGone.tryEmit(Unit)
    }

    fun rename(name: String) = act { admin.updateSettings(groupId, GroupSettingsRequest(name = name.trim())).requireSuccess(); sessions.refreshState() }

    fun setDalton(enabled: Boolean) = act { admin.updateSettings(groupId, GroupSettingsRequest(daltonEnabled = enabled)).requireSuccess(); sessions.refreshState() }

    fun setGroupType(type: String) = act { admin.updateSettings(groupId, GroupSettingsRequest(groupType = type)).requireSuccess(); sessions.refreshState() }

    fun setPermission(key: String, value: String) {
        val updated = _state.value.permissions + (key to value)
        _state.update { it.copy(permissions = updated) }
        act {
            try {
                admin.updatePermissions(groupId, PermissionsRequest(updated))
                sessions.refreshState()
            } catch (e: Exception) {
                load(SettingsTab.General)
                throw e
            }
        }
    }

    // ---- members ----
    fun changeRole(userId: String, role: String) = act(SettingsTab.Members) { admin.changeRole(groupId, userId, RoleRequest(role)).requireSuccess() }

    fun removeMember(userId: String, ban: Boolean) = act(SettingsTab.Members) { admin.removeMember(groupId, userId, ban).requireSuccess() }

    fun unban(userId: String) = act(SettingsTab.Members) { admin.unban(groupId, userId).requireSuccess() }

    fun transferOwnership(userId: String) = act(SettingsTab.Members) {
        admin.transferOwnership(groupId, TransferOwnershipRequest(userId)).requireSuccess()
        sessions.refreshState()
    }

    fun createInvite() = act(SettingsTab.Members) {
        val token = admin.createInvite(groupId).token
        _state.update { it.copy(newInviteToken = token) }
    }

    fun clearInvite() = _state.update { it.copy(newInviteToken = null) }

    fun revokeInvite(id: String) = act(SettingsTab.Members) { admin.revokeInvite(groupId, id).requireSuccess() }

    // ---- announcements ----
    fun createAnnouncement(content: String, color: String) =
        act(SettingsTab.Announcements) { admin.createAnnouncement(groupId, CreateAnnouncementRequest(content.trim(), color)).requireSuccess() }

    fun deleteAnnouncement(id: String) = act(SettingsTab.Announcements) { admin.deleteAnnouncement(groupId, id).requireSuccess() }

    // ---- subjects ----
    fun createSubject(name: String, category: String?, dalton: Boolean) =
        act(SettingsTab.Subjects) { admin.createSubject(groupId, SubjectRequest(name.trim(), category, dalton)) }

    fun updateSubject(id: String, request: SubjectRequest) =
        act(SettingsTab.Subjects) { admin.updateSubject(groupId, id, request).requireSuccess() }

    fun deleteSubject(id: String) = act(SettingsTab.Subjects) { admin.deleteSubject(groupId, id).requireSuccess() }

    fun createCourse(subjectId: String, name: String, type: String?) =
        act(SettingsTab.Subjects) { admin.createCourse(groupId, subjectId, CourseRequest(name.trim(), type)) }

    fun deleteCourse(id: String) = act(SettingsTab.Subjects) { admin.deleteCourse(groupId, id).requireSuccess() }

    // ---- schedule ----
    fun saveLesson(request: LessonRequest) = act(SettingsTab.Schedule, R.string.settings_saved) { admin.saveLesson(groupId, request).requireSuccess() }

    fun deleteLesson(id: String) = act(SettingsTab.Schedule) { admin.deleteLesson(groupId, id).requireSuccess() }

    fun saveSub(request: SubstitutionRequest) = act(SettingsTab.Schedule, R.string.settings_saved) { admin.saveSub(groupId, request).requireSuccess() }

    fun deleteSub(id: String) = act(SettingsTab.Schedule) { admin.deleteSub(groupId, id).requireSuccess() }

    fun saveScheduleConfig(startTime: String, totalSlots: Int, durationMins: Int, breaks: Map<Int, Int>) =
        act(success = R.string.settings_saved) {
            admin.updateScheduleConfig(
                groupId,
                ScheduleConfigRequest(ScheduleConfigBody(startTime, totalSlots, durationMins, breaks.mapKeys { it.key.toString() })),
            ).requireSuccess()
            sessions.refreshState()
        }
}
