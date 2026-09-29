package app.schuldashboard.data.api

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class SuperAdminStats(
    val userCount: Int = 0,
    val itemCount: Int = 0,
    val reportCount: Int = 0,
    val reportCountTotal: Int = 0,
    val reportCountProcessed: Int = 0,
    val bannedCount: Int = 0,
    val verifiedUsers: Int = 0,
    val unverifiedUsers: Int = 0,
    val adminCount: Int = 0,
    val oldItemsCount: Int = 0,
    val newUsersThisWeek: Int = 0,
    val newItemsThisWeek: Int = 0,
)

@Serializable
data class SuperAdminUser(
    val id: String,
    val email: String = "",
    val username: String = "",
    val role: String = "user",
    val isBanned: Boolean = false,
    val emailVerified: Boolean = false,
    val createdAt: String = "",
    val lastLogin: String? = null,
    val activityCount: Int? = null,
)

@Serializable
data class UserActivity(val at: String = "", val type: String = "", val meta: JsonObject? = null)

@Serializable
data class SuperAdminReport(
    val id: String,
    val reportedAt: String = "",
    val processed: Boolean = false,
    val reason: String? = null,
    val reporterEmail: String? = null,
    val reportType: String? = null,
    val itemTitle: String? = null,
    val itemDescription: String? = null,
    val creatorEmail: String? = null,
    val messageContent: String? = null,
    val messageSenderEmail: String? = null,
)

@Serializable
data class SuperAdminGroup(
    val id: String,
    val name: String = "",
    val ownerEmail: String? = null,
    val ownerName: String = "",
    val createdAt: String = "",
    val memberCount: Int = 0,
    val itemCount: Int = 0,
)

@Serializable
data class ProcessedRequest(val processed: Boolean)

interface SuperAdminApi {
    @GET("admin/stats")
    suspend fun stats(): SuperAdminStats

    @DELETE("admin/cleanup/old-items")
    suspend fun cleanupOldItems(): MessageResponse

    @GET("admin/all-users")
    suspend fun users(): List<SuperAdminUser>

    @GET("admin/users/{id}/activity")
    suspend fun activity(@Path("id") id: String): List<UserActivity>

    @POST("admin/users/{id}/ban")
    suspend fun ban(@Path("id") id: String): Response<Unit>

    @DELETE("admin/users/{id}/ban")
    suspend fun unban(@Path("id") id: String): Response<Unit>

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(@Path("id") id: String): Response<Unit>

    @DELETE("admin/users/{id}/activity/prune")
    suspend fun pruneActivity(@Path("id") id: String): Response<Unit>

    @GET("admin/reports")
    suspend fun reports(): List<SuperAdminReport>

    @PATCH("admin/reports/{id}/processed")
    suspend fun processReport(@Path("id") id: String, @Body body: ProcessedRequest): Response<Unit>

    @DELETE("admin/reports/{id}")
    suspend fun deleteReport(@Path("id") id: String): Response<Unit>

    @GET("admin/groups")
    suspend fun groups(): List<SuperAdminGroup>

    @DELETE("admin/groups/{id}")
    suspend fun deleteGroup(@Path("id") id: String): Response<Unit>
}
