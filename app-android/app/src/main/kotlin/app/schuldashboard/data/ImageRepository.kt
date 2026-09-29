package app.schuldashboard.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import app.schuldashboard.BuildConfig
import app.schuldashboard.data.api.ImageItem
import app.schuldashboard.data.api.ImageMetadata
import app.schuldashboard.data.api.ImageApi
import app.schuldashboard.data.api.AddImageRequest
import app.schuldashboard.data.api.CloudinaryUpload
import app.schuldashboard.data.api.requireSuccess
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.max

/** Builds delivery URLs the way the web client does, from a public id and the Cloudinary cloud. */
object Cloudinary {
    private const val THUMB = "f_webp,q_auto,w_256,h_256,c_fill"
    private const val THUMB_PDF = "f_auto,q_auto,w_256,h_256,c_fill,pg_1"
    private const val FULL = "f_webp,q_auto"
    private val base get() = "https://res.cloudinary.com/${BuildConfig.CLOUDINARY_CLOUD_NAME}"

    private fun image(publicId: String, transform: String): String {
        val id = if (publicId.endsWith(".pdf", ignoreCase = true)) publicId.dropLast(4) + ".jpg" else publicId
        return "$base/image/upload/$transform/$id"
    }

    fun thumb(image: ImageItem): String = image.thumbUrl?.takeIf { it.isNotEmpty() }
        ?: image.metadata?.thumbnailId?.let { image(it, THUMB) }
        ?: if (image.publicId.startsWith("http")) image.publicId
        else image(image.publicId, if (image.publicId.endsWith(".pdf", true)) THUMB_PDF else THUMB)

    fun full(image: ImageItem): String = image.url?.takeIf { it.isNotEmpty() }
        ?: if (image.publicId.startsWith("http")) image.publicId else image(image.publicId, FULL)

    fun raw(publicId: String): String =
        if (publicId.startsWith("http")) publicId else "$base/raw/upload/$publicId"

    fun isDocument(image: ImageItem): Boolean =
        image.metadata?.format?.lowercase() in setOf("docx", "pptx", "xlsx", "pdf")

    fun originalUrl(image: ImageItem): String =
        if (image.metadata?.format?.lowercase() in setOf("docx", "pptx", "xlsx")) raw(image.publicId) else full(image)
}

private const val MAX_EDGE = 2000
private const val JPEG_QUALITY = 85
private const val MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
private val OFFICE_EXTENSIONS = setOf("docx", "pptx", "xlsx")

class UploadTooLarge : Exception()

@Singleton
class ImageRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val api: ImageApi,
    private val json: Json,
) {
    /** Cloudinary takes signed uploads directly, so this client must not carry the API's session cookies. */
    private val plainClient = OkHttpClient()

    suspend fun upload(groupId: String, uri: Uri): ImageItem = withContext(Dispatchers.IO) {
        val name = displayName(uri)
        val extension = name.substringAfterLast('.', "").lowercase()
        val mime = context.contentResolver.getType(uri).orEmpty()
        val office = extension in OFFICE_EXTENSIONS
        val pdf = mime == "application/pdf" || extension == "pdf"

        val (bytes, uploadName, mediaType) = when {
            office || pdf -> {
                val raw = context.contentResolver.openInputStream(uri)!!.use { it.readBytes() }
                if (raw.size > MAX_DOCUMENT_BYTES) throw UploadTooLarge()
                Triple(raw, name, if (pdf) "application/pdf" else "application/octet-stream")
            }
            else -> Triple(compressedJpeg(uri), name.substringBeforeLast('.') + ".jpg", "image/jpeg")
        }

        val sign = api.sign(groupId)
        val resource = if (office) "raw" else "image"
        val body = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("file", uploadName, bytes.toRequestBody(mediaType.toMediaType()))
            .addFormDataPart("api_key", sign.apiKey)
            .addFormDataPart("timestamp", sign.timestamp.toString())
            .addFormDataPart("signature", sign.signature)
            .addFormDataPart("folder", sign.folder)
            .build()
        val request = Request.Builder()
            .url("https://api.cloudinary.com/v1_1/${sign.cloudName}/$resource/upload")
            .post(body)
            .build()
        val response = plainClient.newCall(request).execute().use { res ->
            check(res.isSuccessful) { "Upload failed" }
            json.decodeFromString<CloudinaryUpload>(res.body!!.string())
        }

        val metadata = ImageMetadata(
            version = response.version,
            format = if (office) extension else response.format,
            width = response.width,
            height = response.height,
            name = if (office) name else null,
        )
        ImageItem(publicId = response.publicId, url = response.secureUrl, metadata = metadata)
    }

    suspend fun attach(groupId: String, itemId: String, image: ImageItem): ImageItem =
        api.addImage(groupId, itemId, AddImageRequest(ImageItem(image.publicId, metadata = image.metadata))).image

    suspend fun remove(groupId: String, itemId: String, publicId: String) {
        api.removeImage(groupId, itemId, Uri.encode(publicId)).requireSuccess()
    }

    private fun displayName(uri: Uri): String =
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            if (it.moveToFirst()) it.getString(0) else null
        } ?: "upload"

    /** Downscales large photos like the web client's converter so uploads stay small. */
    private fun compressedJpeg(uri: Uri): ByteArray {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        context.contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (max(bounds.outWidth, bounds.outHeight) / sample > MAX_EDGE * 2) sample *= 2
        val bitmap = context.contentResolver.openInputStream(uri)!!.use {
            BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
        } ?: error("Not an image")
        val scale = MAX_EDGE.toFloat() / max(bitmap.width, bitmap.height)
        val scaled = if (scale < 1f) {
            Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true)
        } else {
            bitmap
        }
        return ByteArrayOutputStream().also { scaled.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, it) }.toByteArray()
    }
}
