package app.schuldashboard.di

import android.content.Context
import app.schuldashboard.BuildConfig
import app.schuldashboard.data.api.AdminApi
import app.schuldashboard.data.api.ImageApi
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.SuperAdminApi
import app.schuldashboard.data.net.CsrfInterceptor
import app.schuldashboard.data.net.PersistentCookieJar
import app.schuldashboard.data.net.SessionAuthenticator
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun json(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    @Provides
    @Singleton
    fun cookieJar(@ApplicationContext context: Context) = PersistentCookieJar(context)

    @Provides
    @Singleton
    fun okHttpClient(
        cookieJar: PersistentCookieJar,
        authenticator: SessionAuthenticator,
    ): OkHttpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .addInterceptor(CsrfInterceptor(cookieJar))
        .authenticator(authenticator)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    @Provides
    @Singleton
    fun retrofit(client: OkHttpClient, json: Json): Retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_URL + "/")
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    @Provides
    @Singleton
    fun api(retrofit: Retrofit): SchulApi = retrofit.create(SchulApi::class.java)

    @Provides
    @Singleton
    fun imageApi(retrofit: Retrofit): ImageApi = retrofit.create(ImageApi::class.java)

    @Provides
    @Singleton
    fun superAdminApi(retrofit: Retrofit): SuperAdminApi = retrofit.create(SuperAdminApi::class.java)

    @Provides
    @Singleton
    fun adminApi(retrofit: Retrofit): AdminApi = retrofit.create(AdminApi::class.java)
}
