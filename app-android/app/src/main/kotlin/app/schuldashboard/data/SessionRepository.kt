package app.schuldashboard.data

import app.schuldashboard.data.api.CreateGroupRequest
import app.schuldashboard.data.api.LoginRequest
import app.schuldashboard.data.api.MfaCodeRequest
import app.schuldashboard.data.api.RegisterPreferences
import app.schuldashboard.data.api.RegisterRequest
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.UpdateCoursesRequest
import app.schuldashboard.data.api.CourseSelection
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.data.net.PersistentCookieJar
import app.schuldashboard.data.net.SessionEvents
import app.schuldashboard.domain.Group
import app.schuldashboard.domain.User
import app.schuldashboard.domain.toGroup
import app.schuldashboard.domain.toUser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

sealed interface AuthState {
    /** The app must not render until the session is resolved: an expired access token with a valid refresh cookie is still a logged-in user. */
    data object Loading : AuthState
    data object LoggedOut : AuthState
    data class LoggedIn(
        val user: User,
        val groups: List<Group>,
        val landingGroupId: String?,
    ) : AuthState
}

enum class LoginOutcome { LoggedIn, MfaRequired }

@Singleton
class SessionRepository @Inject constructor(
    private val api: SchulApi,
    private val cookieJar: PersistentCookieJar,
    private val appPreferences: AppPreferences,
    events: SessionEvents,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val initMutex = Mutex()

    private val _state = MutableStateFlow<AuthState>(AuthState.Loading)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        events.expired.onEach { _state.value = AuthState.LoggedOut }.launchIn(scope)
    }

    val loggedIn: AuthState.LoggedIn? get() = _state.value as? AuthState.LoggedIn

    fun groupFlow(groupId: String): Flow<Group?> =
        state.map { (it as? AuthState.LoggedIn)?.groups?.firstOrNull { group -> group.id == groupId } }
            .distinctUntilChanged()

    fun group(groupId: String): Group? = loggedIn?.groups?.firstOrNull { it.id == groupId }

    suspend fun init() {
        initMutex.withLock {
            if (_state.value !is AuthState.Loading) return@withLock
            runCatching {
                ensureCsrf()
                if (!fetchState()) restoreSession()
            }.onFailure { _state.value = AuthState.LoggedOut }
        }
    }

    private suspend fun restoreSession() {
        val refreshed = runCatching { api.refresh().isSuccessful }.getOrDefault(false)
        if (!refreshed || !fetchState()) _state.value = AuthState.LoggedOut
    }

    /** Returns whether the server considers the session authenticated. */
    private suspend fun fetchState(): Boolean {
        val me = api.me()
        if (!me.authenticated) {
            _state.value = AuthState.LoggedOut
            return false
        }
        appPreferences.syncFromAccount(me.preferences)
        val status = api.groupStatus()
        _state.value = AuthState.LoggedIn(
            user = me.toUser(),
            groups = status.groups.map { it.toGroup() },
            landingGroupId = status.landingGroupId,
        )
        return true
    }

    suspend fun refreshState() {
        runCatching { fetchState() }
    }

    private suspend fun ensureCsrf() {
        api.initCsrf()
    }

    suspend fun login(email: String, password: String): LoginOutcome {
        ensureCsrf()
        val response = api.login(LoginRequest(email, password))
        if (response.requiresMfa) return LoginOutcome.MfaRequired
        fetchState()
        return LoginOutcome.LoggedIn
    }

    suspend fun verifyMfa(code: String) {
        api.verifyMfa(MfaCodeRequest(code)).requireSuccess()
        fetchState()
    }

    suspend fun cancelMfa() {
        runCatching { api.cancelMfa() }
    }

    suspend fun register(email: String, password: String, language: String) {
        ensureCsrf()
        api.register(
            RegisterRequest(email, password, RegisterPreferences(theme = "system", language = language)),
        ).requireSuccess()
    }

    suspend fun logout(everywhere: Boolean = false) {
        // Local state is cleared regardless of what the server replies.
        runCatching { (if (everywhere) api.logoutAll() else api.logout()) }
        cookieJar.clear()
        _state.value = AuthState.LoggedOut
    }

    suspend fun createGroup(name: String, abitur: Boolean, dalton: Boolean): String {
        val response = api.createGroup(
            CreateGroupRequest(
                groupName = name,
                groupType = if (abitur) "abitur" else "regular",
                daltonEnabled = dalton,
            ),
        )
        fetchState()
        return response.groupId
    }

    suspend fun leaveGroup(groupId: String) {
        api.leaveGroup(groupId).requireSuccess()
        fetchState()
    }

    suspend fun acceptInvite(token: String): String {
        val groupId = api.acceptInvite(token).groupId
        fetchState()
        return groupId
    }

    suspend fun setPersonalization(value: Boolean) {
        val response = api.setPersonalization(app.schuldashboard.data.api.PersonalizationRequest(value))
        _state.update { current ->
            if (current !is AuthState.LoggedIn) current
            else current.copy(user = current.user.copy(personalized = response.personalized))
        }
    }

    suspend fun deleteAccount() {
        api.deleteAccount()
        cookieJar.clear()
        _state.value = AuthState.LoggedOut
    }

    fun setMfaEnabled(enabled: Boolean) {
        _state.update { current ->
            if (current !is AuthState.LoggedIn) current
            else current.copy(user = current.user.copy(mfaEnabled = enabled))
        }
    }

    fun recordVisit(groupId: String) {
        scope.launch { runCatching { api.visitGroup(groupId) } }
    }

    suspend fun saveCourses(groupId: String, courses: List<CourseSelection>, groupSubjectIds: Set<String>) {
        api.updateCourses(groupId, UpdateCoursesRequest(courses)).requireSuccess()
        _state.update { current ->
            if (current !is AuthState.LoggedIn) return@update current
            val others = current.user.courses.filter { it.subjectId !in groupSubjectIds }
            current.copy(user = current.user.copy(courses = others + courses, doneSetup = true))
        }
    }
}
