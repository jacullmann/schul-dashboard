package app.schuldashboard.domain

import app.schuldashboard.data.api.CourseSelection
import app.schuldashboard.data.api.GroupDto
import app.schuldashboard.data.api.MeResponse

/**
 * A regular group is a class that attends every lesson together. An Abitur group is a whole year:
 * every course is scheduled on its own.
 */
enum class GroupType {
    Regular, Abitur;

    companion object {
        /** Unknown values from the API degrade to a regular group. */
        fun from(value: String?): GroupType = if (value == "abitur") Abitur else Regular
    }
}

enum class Permission(val key: String) {
    EditGroupGeneral("edit_group_general"),
    EditSubjectsCourses("edit_subjects_courses"),
    EditSchedule("edit_schedule"),
    CreateItems("create_items"),
    UploadImages("upload_images"),
    ManageNotes("manage_notes"),
    SendMessages("send_messages"),
    ManageScheduleChanges("manage_schedule_changes"),
    ManageAnnouncements("manage_announcements"),
    ModerateMembers("moderate_members"),
    DeleteOtherContent("delete_other_content"),
    InviteMembers("invite_members");

    companion object {
        private val byKey = entries.associateBy { it.key }
        fun from(key: String): Permission? = byKey[key]
    }
}

data class ScheduleConfig(
    val startTime: String,
    val totalSlots: Int,
    val lessonDurationMins: Int,
    val breaks: Map<Int, Int>,
)

data class Group(
    val id: String,
    val name: String,
    val role: String,
    val ownerId: String,
    val scheduleConfig: ScheduleConfig,
    val avatarUrl: String?,
    val groupType: GroupType,
    val daltonEnabled: Boolean,
    val permissions: Set<Permission>,
) {
    fun can(permission: Permission) = permission in permissions
}

data class User(
    val id: String,
    val email: String,
    val username: String,
    val role: String,
    val emailVerified: Boolean,
    val courses: List<CourseSelection>,
    val doneSetup: Boolean,
    val personalized: Boolean,
    val mfaEnabled: Boolean,
    val preferences: app.schuldashboard.data.api.UserPreferences? = null,
) {
    val isSuperadmin get() = role == "superadmin"
}

fun MeResponse.toUser() = User(
    id = id,
    email = email,
    username = username,
    role = role,
    emailVerified = emailVerified,
    courses = courses,
    doneSetup = doneSetup,
    personalized = personalized,
    mfaEnabled = mfaEnabled,
    preferences = preferences,
)

fun GroupDto.toGroup() = Group(
    id = id,
    name = name,
    role = role,
    ownerId = ownerId,
    scheduleConfig = scheduleConfig.orDefault(),
    avatarUrl = avatarUrl,
    groupType = GroupType.from(groupType),
    daltonEnabled = daltonEnabled,
    permissions = effectivePermissions.mapNotNullTo(mutableSetOf(), Permission::from),
)

private fun app.schuldashboard.data.api.ScheduleConfigDto?.orDefault() = ScheduleConfig(
    startTime = this?.startTime ?: DEFAULT_START_TIME,
    totalSlots = this?.totalSlots ?: 9,
    lessonDurationMins = this?.lessonDurationMins ?: 45,
    breaks = this?.breaks?.mapNotNull { (slot, mins) -> slot.toIntOrNull()?.let { it to mins } }?.toMap()
        ?: DEFAULT_BREAKS,
)

const val DEFAULT_START_TIME = "08:00"

/** What a group without a configured schedule gets. */
val DEFAULT_BREAKS: Map<Int, Int> = mapOf(2 to 25, 3 to 5, 5 to 40, 7 to 10)
