package app.schuldashboard.data.api

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

@Serializable
data class UploadSignature(
    val cloudName: String = "",
    val apiKey: String = "",
    val timestamp: Long = 0,
    val signature: String = "",
    val folder: String = "",
)

@Serializable
data class CloudinaryUpload(
    @SerialName("public_id") val publicId: String,
    @SerialName("secure_url") val secureUrl: String = "",
    val version: Int? = null,
    val format: String? = null,
    val width: Int? = null,
    val height: Int? = null,
)

@Serializable
data class AddImageRequest(val image: ImageItem)

@Serializable
data class AddImageResponse(val image: ImageItem)

@Serializable
data class NoteRequest(val editorNote: String)

@Serializable
data class VisibilityRequest(val status: String)

interface ImageApi {
    @POST("groups/{g}/items/uploads/sign")
    suspend fun sign(@Path("g") g: String): UploadSignature

    @POST("groups/{g}/items/{id}/images")
    suspend fun addImage(@Path("g") g: String, @Path("id") id: String, @Body body: AddImageRequest): AddImageResponse

    @DELETE("groups/{g}/items/{id}/images/{publicId}")
    suspend fun removeImage(
        @Path("g") g: String,
        @Path("id") id: String,
        @Path("publicId", encoded = true) publicId: String,
    ): Response<Unit>

    @PATCH("groups/{g}/items/{id}/note")
    suspend fun setNote(@Path("g") g: String, @Path("id") id: String, @Body body: NoteRequest): Response<Unit>

    @POST("groups/{g}/items/{id}/visibility")
    suspend fun setVisibility(@Path("g") g: String, @Path("id") id: String, @Body body: VisibilityRequest): Response<Unit>

    @DELETE("groups/{g}/items/{id}/visibility")
    suspend fun clearVisibility(@Path("g") g: String, @Path("id") id: String): Response<Unit>
}
