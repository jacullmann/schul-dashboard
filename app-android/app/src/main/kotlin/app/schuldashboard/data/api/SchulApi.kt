package app.schuldashboard.data.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

/** Every group-bound endpoint names its group in the path, mirroring the web client. */
interface SchulApi {
    @GET("system/csrf/init")
    suspend fun initCsrf(): Response<Unit>

    @POST("auth/refresh")
    suspend fun refresh(): Response<Unit>

    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse

    @POST("auth/mfa/verify")
    suspend fun verifyMfa(@Body body: MfaCodeRequest): Response<Unit>

    @POST("auth/mfa/cancel")
    suspend fun cancelMfa(): Response<Unit>

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): Response<Unit>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>

    @POST("auth/logout-all")
    suspend fun logoutAll(): Response<Unit>

    @GET("auth/me")
    suspend fun me(): MeResponse

    @GET("groups/status")
    suspend fun groupStatus(): GroupStatusResponse

    @POST("groups")
    suspend fun createGroup(@Body body: CreateGroupRequest): CreateGroupResponse

    @POST("groups/{groupId}/visit")
    suspend fun visitGroup(@Path("groupId") groupId: String): Response<Unit>

    @DELETE("groups/{groupId}/leave")
    suspend fun leaveGroup(@Path("groupId") groupId: String): Response<Unit>

    @GET("invites/{token}")
    suspend fun invite(@Path("token") token: String): InviteInfo

    @POST("invites/{token}/accept")
    suspend fun acceptInvite(@Path("token") token: String): AcceptInviteResponse

    @PATCH("groups/{groupId}/me/courses")
    suspend fun updateCourses(
        @Path("groupId") groupId: String,
        @Body body: UpdateCoursesRequest,
    ): Response<Unit>

    @GET("groups/{groupId}/items")
    suspend fun items(
        @Path("groupId") groupId: String,
        @Query("type") type: String,
        @Query("filter") filter: String? = null,
        @Query("subject") subject: String? = null,
        @Query("hide_checked") hideChecked: Boolean? = null,
        @Query("personalized") personalized: Boolean? = null,
    ): Response<List<HwItem>>

    @GET("groups/{groupId}/items/{itemId}")
    suspend fun item(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): HwItem

    @POST("groups/{groupId}/items")
    suspend fun createItem(
        @Path("groupId") groupId: String,
        @Body body: CreateItemRequest,
    ): Response<Unit>

    @PATCH("groups/{groupId}/items/{itemId}")
    suspend fun updateItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
        @Body body: UpdateItemRequest,
    ): Response<Unit>

    @DELETE("groups/{groupId}/items/{itemId}")
    suspend fun deleteItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): Response<Unit>

    @POST("groups/{groupId}/items/{itemId}/check")
    suspend fun checkItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): Response<Unit>

    @DELETE("groups/{groupId}/items/{itemId}/check")
    suspend fun uncheckItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): Response<Unit>

    @POST("groups/{groupId}/items/{itemId}/pin")
    suspend fun pinItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): Response<Unit>

    @DELETE("groups/{groupId}/items/{itemId}/pin")
    suspend fun unpinItem(
        @Path("groupId") groupId: String,
        @Path("itemId") itemId: String,
    ): Response<Unit>

    @POST("groups/{groupId}/items/reports")
    suspend fun reportItem(
        @Path("groupId") groupId: String,
        @Body body: ReportRequest,
    ): Response<Unit>

    @GET("user/checks")
    suspend fun checks(): ItemIdsResponse

    @GET("user/pins")
    suspend fun pins(): ItemIdsResponse

    @GET("user/visibility")
    suspend fun visibility(): VisibilityResponse

    @POST("user/activity/pageload")
    suspend fun pageLoad(): Response<Unit>

    @GET("todos")
    suspend fun privateTasks(): List<PrivateTaskDto>

    @POST("todos")
    suspend fun createPrivateTask(@Body body: PrivateTaskRequest): PrivateTaskDto

    @PUT("todos/{id}")
    suspend fun updatePrivateTask(
        @Path("id") id: String,
        @Body body: PrivateTaskRequest,
    ): PrivateTaskDto

    @PATCH("todos/{id}/toggle")
    suspend fun togglePrivateTask(@Path("id") id: String): PrivateTaskDto

    @DELETE("todos/{id}")
    suspend fun deletePrivateTask(@Path("id") id: String): Response<Unit>

    @GET("groups/{groupId}/schedule")
    suspend fun schedule(@Path("groupId") groupId: String): Response<List<LessonDto>>

    @GET("groups/{groupId}/schedule/subjects")
    suspend fun scheduleSubjects(@Path("groupId") groupId: String): List<ScheduleSubjectDto>

    @GET("groups/{groupId}/schedule/subs")
    suspend fun substitutions(@Path("groupId") groupId: String): List<SubstitutionDto>

    @GET("groups/{groupId}/schedule/announcements")
    suspend fun announcements(@Path("groupId") groupId: String): List<AnnouncementDto>

    @GET("groups/{groupId}/schedule/announcements/read-status")
    suspend fun announcementReadStatus(@Path("groupId") groupId: String): List<String>

    @POST("groups/{groupId}/schedule/announcements/{id}/read")
    suspend fun markAnnouncementRead(
        @Path("groupId") groupId: String,
        @Path("id") id: String,
    ): Response<Unit>

    @GET("groups/{groupId}/messages")
    suspend fun messages(@Path("groupId") groupId: String): MessagesResponse

    @POST("groups/{groupId}/messages")
    suspend fun sendMessage(
        @Path("groupId") groupId: String,
        @Body body: SendMessageRequest,
    ): Response<Unit>

    @DELETE("groups/{groupId}/messages/{id}")
    suspend fun deleteMessage(
        @Path("groupId") groupId: String,
        @Path("id") id: String,
    ): Response<Unit>

    @POST("groups/{groupId}/messages/read")
    suspend fun markMessagesRead(@Path("groupId") groupId: String): Response<Unit>

    @POST("groups/{groupId}/messages/reports")
    suspend fun reportMessage(
        @Path("groupId") groupId: String,
        @Body body: ReportMessageRequest,
    ): Response<Unit>

    @POST("auth/forgot")
    suspend fun forgotPassword(@Body body: ForgotRequest): Response<Unit>

    @POST("auth/reset/verify")
    suspend fun verifyResetCode(@Body body: ResetVerifyRequest): ResetVerifyResponse

    @POST("auth/reset")
    suspend fun resetPassword(@Body body: ResetRequest): OkResponse

    @GET("auth/verify")
    suspend fun verifyEmail(@Query("token") token: String): OkResponse

    @POST("auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): Response<Unit>

    @GET("auth/sessions")
    suspend fun sessions(): SessionsResponse

    @DELETE("auth/sessions/{familyId}")
    suspend fun revokeSession(@Path("familyId") familyId: String): Response<Unit>

    @POST("auth/logout-others")
    suspend fun logoutOthers(): Response<Unit>

    @GET("mfa/status")
    suspend fun mfaStatus(): MfaStatusResponse

    @POST("mfa/setup")
    suspend fun mfaSetup(): MfaSetupResponse

    @POST("mfa/activate")
    suspend fun mfaActivate(@Body body: MfaCodeRequest): Response<Unit>

    @POST("mfa/deactivate")
    suspend fun mfaDeactivate(@Body body: MfaCodeRequest): Response<Unit>

    @GET("auth/providers")
    suspend fun providers(): ProvidersResponse

    @POST("auth/google/link")
    suspend fun linkGoogle(@Body body: GoogleLinkRequest): OkResponse

    @DELETE("auth/google/unlink")
    suspend fun unlinkGoogle(): Response<Unit>

    @PATCH("user/personalization")
    suspend fun setPersonalization(@Body body: PersonalizationRequest): PersonalizationResponse

    @PATCH("user/preferences")
    suspend fun setPreference(@Body body: Map<String, String>): Response<Unit>

    @DELETE("auth/me")
    suspend fun deleteAccount(): OkResponse
}
