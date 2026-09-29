package app.schuldashboard.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Group administration endpoints; the server enforces the permission each one needs. */
interface AdminApi {
    @GET("groups/{g}/admin/stats")
    suspend fun stats(@Path("g") g: String): GroupStatsDto

    @DELETE("groups/{g}/admin/cleanup/old-items")
    suspend fun cleanupOldItems(@Path("g") g: String): MessageResponse

    @DELETE("groups/{g}")
    suspend fun deleteGroup(@Path("g") g: String): Response<Unit>

    @PATCH("groups/{g}/admin/settings")
    suspend fun updateSettings(@Path("g") g: String, @Body body: GroupSettingsRequest): Response<Unit>

    @GET("groups/{g}/admin/permissions")
    suspend fun permissions(@Path("g") g: String): PermissionsResponse

    @PATCH("groups/{g}/admin/permissions")
    suspend fun updatePermissions(@Path("g") g: String, @Body body: PermissionsRequest): OkResponse

    @GET("groups/{g}/members")
    suspend fun members(@Path("g") g: String): List<MemberDto>

    @PATCH("groups/{g}/admin/members/{userId}/role")
    suspend fun changeRole(@Path("g") g: String, @Path("userId") userId: String, @Body body: RoleRequest): Response<Unit>

    @DELETE("groups/{g}/admin/members/{userId}")
    suspend fun removeMember(
        @Path("g") g: String,
        @Path("userId") userId: String,
        @Query("ban") ban: Boolean,
    ): Response<Unit>

    @GET("groups/{g}/admin/banned-users")
    suspend fun bannedUsers(@Path("g") g: String): List<BannedUserDto>

    @DELETE("groups/{g}/admin/banned-users/{userId}")
    suspend fun unban(@Path("g") g: String, @Path("userId") userId: String): Response<Unit>

    @GET("groups/{g}/admin/invites")
    suspend fun invites(@Path("g") g: String): List<InviteLogDto>

    @DELETE("groups/{g}/admin/invites/{id}")
    suspend fun revokeInvite(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @POST("groups/{g}/invites")
    suspend fun createInvite(@Path("g") g: String): CreateInviteResponse

    @POST("groups/{g}/admin/transfer-ownership")
    suspend fun transferOwnership(@Path("g") g: String, @Body body: TransferOwnershipRequest): Response<Unit>

    @POST("groups/{g}/admin/announcements")
    suspend fun createAnnouncement(@Path("g") g: String, @Body body: CreateAnnouncementRequest): Response<Unit>

    @DELETE("groups/{g}/admin/announcements/{id}")
    suspend fun deleteAnnouncement(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @GET("groups/{g}/admin/subjects")
    suspend fun subjects(@Path("g") g: String): List<AdminSubjectDto>

    @POST("groups/{g}/admin/subjects")
    suspend fun createSubject(@Path("g") g: String, @Body body: SubjectRequest): AdminSubjectDto

    @PATCH("groups/{g}/admin/subjects/{id}")
    suspend fun updateSubject(@Path("g") g: String, @Path("id") id: String, @Body body: SubjectRequest): Response<Unit>

    @DELETE("groups/{g}/admin/subjects/{id}")
    suspend fun deleteSubject(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @POST("groups/{g}/admin/subjects/{subjectId}/courses")
    suspend fun createCourse(
        @Path("g") g: String,
        @Path("subjectId") subjectId: String,
        @Body body: CourseRequest,
    ): AdminCourseDto

    @PATCH("groups/{g}/admin/courses/{id}")
    suspend fun updateCourse(@Path("g") g: String, @Path("id") id: String, @Body body: CourseRequest): Response<Unit>

    @DELETE("groups/{g}/admin/courses/{id}")
    suspend fun deleteCourse(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @GET("groups/{g}/admin/schedule")
    suspend fun schedule(@Path("g") g: String): List<AdminLessonDto>

    @POST("groups/{g}/admin/schedule")
    suspend fun saveLesson(@Path("g") g: String, @Body body: LessonRequest): Response<Unit>

    @DELETE("groups/{g}/admin/schedule/{id}")
    suspend fun deleteLesson(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @GET("groups/{g}/admin/schedule/subs")
    suspend fun subs(@Path("g") g: String): List<SubstitutionDto>

    @POST("groups/{g}/admin/schedule/subs")
    suspend fun saveSub(@Path("g") g: String, @Body body: SubstitutionRequest): Response<Unit>

    @DELETE("groups/{g}/admin/schedule/subs/{id}")
    suspend fun deleteSub(@Path("g") g: String, @Path("id") id: String): Response<Unit>

    @PATCH("groups/{g}/admin/schedule-config")
    suspend fun updateScheduleConfig(@Path("g") g: String, @Body body: ScheduleConfigRequest): Response<Unit>
}
