package app.schuldashboard.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiErrorBody(val error: String? = null, val message: String? = null)

@Serializable
data class LoginRequest(val email: String, val password: String)

@Serializable
data class LoginResponse(val ok: Boolean = false, val requiresMfa: Boolean = false)

@Serializable
data class MfaCodeRequest(val code: String)

@Serializable
data class RegisterPreferences(
    val theme: String,
    val language: String,
    val personalized: Boolean = true,
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val preferences: RegisterPreferences,
)

@Serializable
data class CourseSelection(val subjectId: String, val courseId: String)

@Serializable
data class UserPreferences(
    val theme: String? = null,
    val language: String? = null,
    val dismissedNotices: List<String> = emptyList(),
)

@Serializable
data class MeResponse(
    val authenticated: Boolean = false,
    val id: String = "",
    val email: String = "",
    val role: String = "user",
    val emailVerified: Boolean = false,
    val courses: List<CourseSelection> = emptyList(),
    val doneSetup: Boolean = false,
    val personalized: Boolean = false,
    val mfaEnabled: Boolean = false,
    val preferences: UserPreferences? = null,
    val username: String = "",
)

@Serializable
data class ScheduleConfigDto(
    val startTime: String? = null,
    val totalSlots: Int? = null,
    val lessonDurationMins: Int? = null,
    val breaks: Map<String, Int>? = null,
)

@Serializable
data class GroupDto(
    val id: String,
    val name: String,
    val role: String = "user",
    val ownerId: String = "",
    val scheduleConfig: ScheduleConfigDto? = null,
    val avatarUrl: String? = null,
    val permissions: Map<String, String> = emptyMap(),
    val groupType: String? = null,
    val daltonEnabled: Boolean = false,
    val effectivePermissions: List<String> = emptyList(),
)

@Serializable
data class GroupStatusResponse(
    val authenticated: Boolean = false,
    val groups: List<GroupDto> = emptyList(),
    val landingGroupId: String? = null,
)

@Serializable
data class CreateGroupRequest(
    val groupName: String,
    val avatarUrl: String? = null,
    val groupType: String = "regular",
    val daltonEnabled: Boolean = false,
)

@Serializable
data class CreateGroupResponse(val ok: Boolean = false, val groupId: String = "")

@Serializable
data class InviteInfo(
    val groupName: String? = null,
    val avatarUrl: String? = null,
    val memberCount: Int? = null,
)

@Serializable
data class AcceptInviteResponse(val groupId: String = "")

@Serializable
data class ImageMetadata(
    val version: Int? = null,
    val format: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    val name: String? = null,
    val thumbnailId: String? = null,
)

@Serializable
data class ImageItem(
    val publicId: String,
    val url: String? = null,
    val thumbUrl: String? = null,
    val createdBy: String? = null,
    val metadata: ImageMetadata? = null,
)

@Serializable
data class HwItem(
    val id: String,
    val type: String = "homework",
    val title: String = "",
    val subject: String = "",
    val description: String = "",
    val images: List<ImageItem> = emptyList(),
    val dueDate: String = "",
    val createdBy: String = "",
    val createdByName: String? = null,
    val timeColor: String = "",
    val editorNote: String = "",
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

@Serializable
data class ItemIdsResponse(val itemIds: List<String> = emptyList())

@Serializable
data class VisibilityResponse(
    val archived: List<String> = emptyList(),
    val kept: List<String> = emptyList(),
)

@Serializable
data class CreateItemRequest(
    val title: String,
    val subject: String,
    val description: String,
    val images: List<ImageItem> = emptyList(),
    val dueDate: String,
    val type: String,
    val confirmDoubleTask: Boolean = false,
)

@Serializable
data class UpdateItemRequest(
    val title: String,
    val subject: String,
    val description: String,
    val images: List<ImageItem> = emptyList(),
    val dueDate: String? = null,
)

@Serializable
data class ReportRequest(
    val itemId: String,
    val itemTitle: String,
    val reason: String? = null,
)

@Serializable
data class PrivateTaskDto(
    val id: String,
    val title: String = "",
    val description: String = "",
    val completed: Boolean = false,
    val position: String? = null,
    val createdAt: String = "",
    val updatedAt: String = "",
)

@Serializable
data class PrivateTaskRequest(
    val title: String,
    val description: String,
    val completed: Boolean = false,
)

@Serializable
data class NameRef(val id: String, val name: String)

@Serializable
data class LessonDto(
    val id: String,
    val day: Int,
    val slot: Int,
    val duration: Int? = null,
    val room: String? = null,
    val subjectId: String? = null,
    val courseId: String? = null,
    val subjects: NameRef? = null,
    val courses: NameRef? = null,
    val subjectAbbr: String? = null,
    val subject: String? = null,
    val courseName: String? = null,
)

@Serializable
data class ScheduleCourseDto(val id: String, val name: String)

@Serializable
data class ScheduleSubjectDto(
    val id: String,
    val name: String,
    val category: String? = null,
    val isDalton: Boolean = false,
    val courses: List<ScheduleCourseDto>? = null,
)

@Serializable
data class SubstitutionDto(
    val id: String,
    val lessonId: String,
    val courseId: String? = null,
    val subject: String? = null,
    val subjectAbbr: String? = null,
    val room: String? = null,
    val cancelled: Boolean? = null,
    val hide: Boolean? = null,
)

@Serializable
data class AnnouncementDto(
    val id: String,
    val content: String = "",
    val title: String? = null,
    val color: String? = null,
    val priority: String? = null,
    val authorName: String? = null,
    val createdAt: String = "",
)

@Serializable
data class MessageDto(
    val id: String,
    val userId: String = "",
    val content: String = "",
    val createdAt: String = "",
    val senderName: String? = null,
    val parentId: String? = null,
    val parentContent: String? = null,
    val parentSenderName: String? = null,
)

@Serializable
data class MessagesResponse(
    val messages: List<MessageDto> = emptyList(),
    val lastVisitAt: String? = null,
)

@Serializable
data class SendMessageRequest(val content: String, val parentId: String? = null)

@Serializable
data class ReportMessageRequest(val messageId: String, val reason: String? = null)

@Serializable
data class UpdateCoursesRequest(val courses: List<CourseSelection>)

@Serializable
data class WsClientEvent(
    val type: String,
    val groupId: String? = null,
)

@Serializable
data class WsServerEvent(
    val type: String,
    val message: MessageDto? = null,
    val messageId: String? = null,
    val userId: String? = null,
    val senderName: String? = null,
    @SerialName("isTyping") val isTyping: Boolean? = null,
)

@Serializable
data class OkResponse(val ok: Boolean = false, val message: String? = null, val error: String? = null)

@Serializable
data class ForgotRequest(val email: String)

@Serializable
data class ResetVerifyRequest(val email: String, val code: String)

@Serializable
data class ResetVerifyResponse(val resetToken: String = "")

@Serializable
data class ResetRequest(val resetToken: String, val password: String)

@Serializable
data class ChangePasswordRequest(val currentPassword: String, val newPassword: String)

@Serializable
data class SessionLocation(val city: String? = null, val country: String? = null, val countryCode: String? = null)

@Serializable
data class ActiveSession(
    val familyId: String,
    val issuedAt: String = "",
    val lastUsedAt: String = "",
    val userAgent: String? = null,
    val ipAddress: String? = null,
    val location: SessionLocation? = null,
)

@Serializable
data class SessionsResponse(val sessions: List<ActiveSession> = emptyList(), val currentFamilyId: String? = null)

@Serializable
data class MfaStatusResponse(val ok: Boolean = false, val mfaEnabled: Boolean = false)

@Serializable
data class MfaSetupResponse(
    val ok: Boolean = false,
    val qrCode: String = "",
    val secret: String = "",
    val expiresAt: String = "",
)

@Serializable
data class LinkedProvider(val provider: String = "", val email: String? = null)

@Serializable
data class ProvidersResponse(val providers: List<LinkedProvider> = emptyList())

@Serializable
data class GoogleLinkRequest(val password: String)

@Serializable
data class PersonalizationRequest(val personalized: Boolean)

@Serializable
data class PersonalizationResponse(val ok: Boolean = false, val personalized: Boolean = false)

@Serializable
data class GroupStatsDto(
    val itemCount: Int = 0,
    val subsCount: Int = 0,
    val oldItemsCount: Int = 0,
    val memberCount: Int = 0,
)

@Serializable
data class MemberDto(
    val userId: String,
    val generatedName: String = "",
    val role: String = "user",
    val joinedAt: String = "",
    val assignableRoles: List<String> = emptyList(),
    val canRemove: Boolean = false,
)

@Serializable
data class RoleRequest(val role: String)

@Serializable
data class BannedUserDto(val userId: String, val generatedName: String = "", val bannedAt: String = "")

@Serializable
data class InviteLogDto(
    val id: String,
    val token: String = "",
    val createdByName: String? = null,
    val createdAt: String = "",
    val expiresAt: String = "",
    val usedAt: String? = null,
    val usedByName: String? = null,
    val revokedAt: String? = null,
)

@Serializable
data class CreateInviteResponse(val token: String = "")

@Serializable
data class TransferOwnershipRequest(val targetUserId: String)

@Serializable
data class GroupSettingsRequest(
    val name: String? = null,
    val groupType: String? = null,
    val daltonEnabled: Boolean? = null,
)

@Serializable
data class PermissionsResponse(val permissions: Map<String, String> = emptyMap())

@Serializable
data class PermissionsRequest(val permissions: Map<String, String>)

@Serializable
data class MessageResponse(val message: String? = null)

@Serializable
data class CreateAnnouncementRequest(val content: String, val color: String)

@Serializable
data class AdminCourseDto(val id: String, val name: String, val courseType: String? = null)

@Serializable
data class AdminSubjectDto(
    val id: String,
    val name: String,
    val category: String? = null,
    val isDalton: Boolean = false,
    val courses: List<AdminCourseDto> = emptyList(),
)

@Serializable
data class SubjectRequest(val name: String? = null, val category: String? = null, val isDalton: Boolean? = null)

@Serializable
data class CourseRequest(val name: String, val courseType: String? = null)

@Serializable
data class AdminLessonDto(
    val id: String,
    val day: Int,
    val slot: Int,
    val duration: Int? = null,
    val room: String? = null,
    val subjectId: String? = null,
    val courseId: String? = null,
    val isDalton: Boolean = false,
    val subjects: NameRef? = null,
    val courses: NameRef? = null,
)

@Serializable
data class LessonRequest(
    val id: String? = null,
    val day: Int,
    val slot: Int,
    val duration: Int,
    val room: String? = null,
    val subjectId: String? = null,
    val courseId: String? = null,
    val isDalton: Boolean = false,
)

@Serializable
data class SubstitutionRequest(
    val lessonId: String,
    val courseId: String? = null,
    val subject: String? = null,
    val room: String? = null,
    val slot: Int? = null,
    val duration: Int? = null,
    val day: Int? = null,
    val cancelled: Boolean? = null,
    val hide: Boolean? = null,
)

@Serializable
data class ScheduleConfigRequest(val scheduleConfig: ScheduleConfigBody)

@Serializable
data class ScheduleConfigBody(
    val startTime: String,
    val totalSlots: Int,
    val lessonDurationMins: Int,
    val breaks: Map<String, Int>,
)
