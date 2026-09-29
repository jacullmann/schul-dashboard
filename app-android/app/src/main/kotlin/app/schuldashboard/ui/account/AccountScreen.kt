package app.schuldashboard.ui.account

import android.app.Application
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AppPreferences
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.ThemeMode
import app.schuldashboard.data.api.ActiveSession
import app.schuldashboard.data.api.ChangePasswordRequest
import app.schuldashboard.data.api.LinkedProvider
import app.schuldashboard.data.api.MfaCodeRequest
import app.schuldashboard.data.api.MfaSetupResponse
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.domain.User
import app.schuldashboard.ui.common.relativeTime
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.ConfirmDialog
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Modal
import app.schuldashboard.ui.design.NavRow
import app.schuldashboard.ui.design.Section
import app.schuldashboard.ui.design.SubPageHeader
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

data class AccountUiState(
    val sessions: List<ActiveSession> = emptyList(),
    val currentFamilyId: String? = null,
    val providers: List<LinkedProvider> = emptyList(),
    val mfaSetup: MfaSetupResponse? = null,
    val message: String? = null,
    val error: String? = null,
    val busy: Boolean = false,
)

@HiltViewModel
class AccountViewModel @Inject constructor(
    application: Application,
    private val api: SchulApi,
    private val sessions: SessionRepository,
    private val preferences: AppPreferences,
    private val json: Json,
) : AndroidViewModel(application) {
    val theme = preferences.theme
    val language: String? get() = preferences.language
    val user = sessions.state.map { (it as? AuthState.LoggedIn)?.user }

    private val _state = MutableStateFlow(AccountUiState())
    val state: StateFlow<AccountUiState> = _state.asStateFlow()

    init {
        loadSessions()
        viewModelScope.launch {
            runCatching { api.providers() }.onSuccess { r -> _state.update { it.copy(providers = r.providers) } }
        }
    }

    private fun str(id: Int) = getApplication<Application>().getString(id)

    /** Runs an account action, reporting the server's message on failure and [success] on completion. */
    private fun act(success: Int? = null, block: suspend () -> Unit) {
        _state.update { it.copy(busy = true, error = null, message = null) }
        viewModelScope.launch {
            try {
                block()
                _state.update { it.copy(message = success?.let(::str)) }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.apiErrorMessage(json, str(R.string.error_unknown))) }
            } finally {
                _state.update { it.copy(busy = false) }
            }
        }
    }

    fun clearFeedback() = _state.update { it.copy(message = null, error = null) }

    fun loadSessions() {
        viewModelScope.launch {
            runCatching { api.sessions() }.onSuccess { r ->
                _state.update { it.copy(sessions = r.sessions, currentFamilyId = r.currentFamilyId) }
            }
        }
    }

    fun revokeSession(session: ActiveSession) = act {
        api.revokeSession(session.familyId).requireSuccess()
        _state.update { s -> s.copy(sessions = s.sessions.filterNot { it.familyId == session.familyId }) }
    }

    fun logoutOthers() = act(R.string.account_sessions_ended) {
        api.logoutOthers().requireSuccess()
        loadSessions()
    }

    fun changePassword(current: String, new: String) =
        act(R.string.account_password_changed) { api.changePassword(ChangePasswordRequest(current, new)).requireSuccess() }

    fun setTheme(mode: ThemeMode) {
        preferences.setTheme(mode)
        viewModelScope.launch { runCatching { api.setPreference(mapOf("theme" to mode.key)) } }
    }

    fun setLanguage(language: String, onApplied: () -> Unit) {
        preferences.setLanguage(language)
        viewModelScope.launch {
            runCatching { api.setPreference(mapOf("language" to language)) }
            onApplied()
        }
    }

    fun setPersonalization(value: Boolean) = act { sessions.setPersonalization(value) }

    fun startMfaSetup() = act { _state.update { it.copy(mfaSetup = api.mfaSetup()) } }

    fun cancelMfaSetup() = _state.update { it.copy(mfaSetup = null) }

    fun activateMfa(code: String) = act(R.string.account_mfa_enabled) {
        api.mfaActivate(MfaCodeRequest(code)).requireSuccess()
        sessions.setMfaEnabled(true)
        _state.update { it.copy(mfaSetup = null) }
    }

    fun deactivateMfa(code: String) = act(R.string.account_mfa_disabled) {
        api.mfaDeactivate(MfaCodeRequest(code)).requireSuccess()
        sessions.setMfaEnabled(false)
    }

    fun unlinkGoogle() = act {
        api.unlinkGoogle().requireSuccess()
        _state.update { it.copy(providers = it.providers.filterNot { p -> p.provider == "google" }) }
    }

    fun deleteAccount() = act { sessions.deleteAccount() }

    fun logout(everywhere: Boolean) {
        viewModelScope.launch { sessions.logout(everywhere) }
    }
}

private enum class AccountPane { Security, Account }

/**
 * AccountSettings as a phone shows it: a list of panes under the page title; picking one slides
 * its detail in from the right while the list eases back and dims, as the site's panes do.
 */
@Composable
fun AccountScreen(onBack: () -> Unit, viewModel: AccountViewModel = hiltViewModel()) {
    val user by viewModel.user.collectAsStateWithLifecycle(null)
    val state by viewModel.state.collectAsStateWithLifecycle()
    var pane by rememberSaveable { mutableStateOf<AccountPane?>(null) }
    var dialog by rememberSaveable { mutableStateOf<AccountDialog?>(null) }
    val toaster = LocalToaster.current
    val current = user ?: return

    LaunchedEffect(state.message, state.error) {
        state.message?.let(toaster::success)
        state.error?.let(toaster::error)
        if (state.message != null || state.error != null) viewModel.clearFeedback()
    }
    BackHandler(enabled = pane != null) { pane = null }

    Box(Modifier.fillMaxSize().background(AppTheme.colors.canvas).statusBarsPadding()) {
        AnimatedContent(
            pane,
            transitionSpec = {
                val spec = tween<IntOffset>(450, easing = Motion.Settle)
                val fade = tween<Float>(450, easing = Motion.Ease)
                if (targetState != null) {
                    slideInHorizontally(spec) { it } togetherWith
                        (slideOutHorizontally(spec) { -it * 15 / 100 } + fadeOut(fade, targetAlpha = 0.6f))
                } else {
                    (slideInHorizontally(spec) { -it * 15 / 100 } + fadeIn(fade, initialAlpha = 0.6f)) togetherWith
                        slideOutHorizontally(spec) { it }
                } using androidx.compose.animation.SizeTransform(clip = false)
            },
            label = "pane",
        ) { shown ->
            when (shown) {
                null -> Column(Modifier.fillMaxSize().background(AppTheme.colors.canvas)) {
                    SubPageHeader(stringResource(R.string.account_settings_title), onBack, subtitle = current.email)
                    NavRow(stringResource(R.string.acc_security), stringResource(R.string.acc_security_desc), Lucide.Shield, { pane = AccountPane.Security })
                    NavRow(stringResource(R.string.acc_account), stringResource(R.string.acc_account_desc), Lucide.UserRound, { pane = AccountPane.Account })
                }
                else -> Column(Modifier.fillMaxSize().background(AppTheme.colors.canvas)) {
                    SubPageHeader(
                        stringResource(if (shown == AccountPane.Security) R.string.acc_security else R.string.acc_account),
                        { pane = null },
                        large = false,
                    )
                    Column(
                        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding()
                            .padding(horizontal = 24.dp, vertical = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(40.dp),
                    ) {
                        if (shown == AccountPane.Security) {
                            SecurityPane(current, state, viewModel, onChangePassword = { dialog = AccountDialog.Password }, onDisableMfa = { dialog = AccountDialog.MfaDisable })
                        } else {
                            Section(stringResource(R.string.acc_email)) {
                                Text(current.email, style = AppText.base, fontWeight = FontWeight.SemiBold, color = AppTheme.colors.onGhost)
                            }
                            DangerZone { dialog = AccountDialog.Delete }
                        }
                    }
                }
            }
        }
    }

    PasswordModal(dialog == AccountDialog.Password, state.busy, { dialog = null }) { c, n -> viewModel.changePassword(c, n); dialog = null }
    CodeModal(dialog == AccountDialog.MfaDisable, R.string.account_mfa_disable, { dialog = null }) { viewModel.deactivateMfa(it); dialog = null }
    ConfirmDialog(
        dialog == AccountDialog.Delete,
        stringResource(R.string.account_delete),
        stringResource(R.string.account_delete_confirm),
        onDismiss = { dialog = null },
        onConfirm = { viewModel.deleteAccount(); dialog = null },
        confirmText = stringResource(R.string.action_delete),
        danger = true,
    )
    MfaSetupModal(state.mfaSetup, viewModel::cancelMfaSetup, viewModel::activateMfa)
}

private enum class AccountDialog { Password, MfaDisable, Delete }

@Composable
private fun SecurityPane(
    user: User,
    state: AccountUiState,
    viewModel: AccountViewModel,
    onChangePassword: () -> Unit,
    onDisableMfa: () -> Unit,
) {
    val colors = AppTheme.colors
    Section(stringResource(R.string.acc_password), description = stringResource(R.string.acc_password_desc)) {
        AppButton(onChangePassword, icon = Lucide.KeyRound, text = stringResource(R.string.account_change_password))
    }
    Section(stringResource(R.string.acc_2fa)) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        ) {
            Box(Modifier.size(44.dp), contentAlignment = Alignment.Center) {
                Icon(
                    if (user.mfaEnabled) Lucide.ShieldCheck else Lucide.ShieldOff, null, size = 32.dp,
                    tint = if (user.mfaEnabled) colors.success else colors.onGhostMuted,
                )
            }
            Column {
                Text(stringResource(R.string.acc_2fa), style = AppText.sm, color = colors.onGhostMuted)
                Text(
                    stringResource(if (user.mfaEnabled) R.string.acc_2fa_on else R.string.acc_2fa_off),
                    style = AppText.base, fontWeight = FontWeight.Bold,
                    color = if (user.mfaEnabled) colors.onGhost else colors.onGhostMuted,
                )
            }
        }
        Text(stringResource(R.string.acc_2fa_desc), style = AppText.sm.copy(lineHeight = 22.sp), color = colors.onGhostMuted)
        if (user.mfaEnabled) {
            AppButton(onDisableMfa, full = true, text = stringResource(R.string.acc_2fa_deactivate))
        } else {
            AppButton(viewModel::startMfaSetup, variant = ButtonVariant.Action, full = true, loading = state.busy, text = stringResource(R.string.acc_2fa_activate))
        }
    }
    Section(stringResource(R.string.acc_connected), description = stringResource(R.string.acc_connected_desc)) {
        val google = state.providers.firstOrNull { it.provider == "google" }
        Card(Modifier.fillMaxWidth(), radius = Radius.xl, padding = PaddingValues(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) {
                    Text("G", style = AppText.xl, fontWeight = FontWeight.Bold, color = colors.onGhost)
                }
                Column(Modifier.weight(1f)) {
                    Text("Google", style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost)
                    Text(google?.email ?: stringResource(R.string.acc_google_not_linked), style = AppText.sm, color = colors.onGhostMuted)
                }
            }
            if (google != null) {
                AppButton(viewModel::unlinkGoogle, Modifier.padding(top = 12.dp), full = true, text = stringResource(R.string.acc_google_unlink))
            }
        }
    }
    Section(stringResource(R.string.acc_sessions), description = stringResource(R.string.acc_sessions_desc)) {
        if (state.sessions.size > 1) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                AppButton(viewModel::logoutOthers, icon = Lucide.LogOut, text = stringResource(R.string.acc_sessions_end_others))
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            state.sessions.forEach { session ->
                SessionCard(session, session.familyId == state.currentFamilyId) { viewModel.revokeSession(session) }
            }
        }
    }
}

/** A session card: the device glyph, "Browser on OS", and where and when it signed in. */
@Composable
private fun SessionCard(session: ActiveSession, current: Boolean, onRevoke: () -> Unit) {
    val colors = AppTheme.colors
    val agent = session.userAgent.orEmpty()
    val mobile = listOf("Android", "iPhone", "iPad", "Mobile").any { it in agent }
    val browser = listOf("Edg" to "Edge", "Firefox" to "Firefox", "Chrome" to "Chrome", "Safari" to "Safari", "okhttp" to "App")
        .firstOrNull { it.first in agent }?.second ?: "Browser"
    val os = listOf("Android" to "Android", "iPhone" to "iOS", "iPad" to "iPadOS", "Windows" to "Windows", "Mac OS" to "macOS", "Linux" to "Linux")
        .firstOrNull { it.first in agent }?.second
    Card(Modifier.fillMaxWidth(), radius = Radius.xl, padding = PaddingValues(14.dp), shadow = true) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) {
                Icon(if (mobile) Lucide.Smartphone else if (os != null) Lucide.Laptop else Lucide.Monitor, null, size = 24.dp, tint = colors.onGhostMuted)
            }
            Column(Modifier.weight(1f)) {
                Text(
                    listOfNotNull(browser, os?.let { stringResource(R.string.acc_on_device) + " " + it }).joinToString(" "),
                    style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
                val where = session.location?.let { l -> listOfNotNull(l.city, l.country).joinToString(", ") }?.takeIf { it.isNotBlank() }
                    ?: stringResource(R.string.acc_location_unknown)
                Text(
                    "$where • " + if (current) stringResource(R.string.account_session_current) else relativeTime(session.issuedAt.ifBlank { session.lastUsedAt }),
                    style = AppText.sm, color = colors.onGhostMuted,
                )
            }
            if (!current) IconButton(Lucide.Trash2, stringResource(R.string.acc_session_end), onRevoke)
        }
    }
}

/** The account pane's danger zone: a danger-bordered card with the delete button. */
@Composable
private fun DangerZone(onDelete: () -> Unit) {
    val colors = AppTheme.colors
    Card(Modifier.fillMaxWidth(), borderColor = colors.danger, background = colors.canvas) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.acc_danger), style = AppText.h3, color = colors.danger)
            Text(stringResource(R.string.acc_danger_desc), style = AppText.sm.copy(lineHeight = 22.sp), color = colors.onGhostMuted)
            AppButton(onDelete, variant = ButtonVariant.Danger, icon = Lucide.Trash2, text = stringResource(R.string.account_delete))
        }
    }
}

@Composable
private fun PasswordModal(open: Boolean, busy: Boolean, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var current by rememberSaveable(open) { mutableStateOf("") }
    var new by rememberSaveable(open) { mutableStateOf("") }
    var confirm by rememberSaveable(open) { mutableStateOf("") }
    val valid = current.isNotEmpty() && new.length >= 8 && new == confirm
    Modal(
        open, onDismiss, stringResource(R.string.account_change_password),
        actions = { FormActions(stringResource(R.string.action_save), { onSave(current, new) }, onDismiss, loading = busy, enabled = valid) },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.account_current_password)) { TextField(current, { current = it }, password = true) }
            FormGroup(label = stringResource(R.string.account_new_password)) {
                TextField(new, { new = it }, password = true, placeholder = stringResource(R.string.password_placeholder))
            }
            FormGroup(
                label = stringResource(R.string.field_password_confirm),
                error = if (confirm.isNotEmpty() && confirm != new) stringResource(R.string.error_confirm_wrong) else null,
            ) { TextField(confirm, { confirm = it }, password = true) }
        }
    }
}

@Composable
private fun CodeModal(open: Boolean, title: Int, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var code by rememberSaveable(open) { mutableStateOf("") }
    Modal(
        open, onDismiss, stringResource(title),
        actions = { FormActions(stringResource(R.string.action_confirm), { onConfirm(code) }, onDismiss, enabled = code.length == 6) },
    ) {
        FormGroup(label = stringResource(R.string.mfa_code)) {
            TextField(
                code, { code = it.filter(Char::isDigit).take(6) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            )
        }
    }
}

/** MfaSettings' setup: the QR code on white, the key to type in by hand, then the code. */
@Composable
private fun MfaSetupModal(setup: MfaSetupResponse?, onDismiss: () -> Unit, onActivate: (String) -> Unit) {
    var code by rememberSaveable(setup?.secret) { mutableStateOf("") }
    val colors = AppTheme.colors
    val qr = remember(setup?.qrCode) {
        setup?.let {
            runCatching {
                val bytes = Base64.decode(it.qrCode.substringAfter("base64,"), Base64.DEFAULT)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
            }.getOrNull()
        }
    }
    Modal(
        setup != null, onDismiss, stringResource(R.string.account_mfa_enable),
        actions = { FormActions(stringResource(R.string.action_confirm), { onActivate(code) }, onDismiss, enabled = code.length == 6) },
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.fillMaxWidth()) {
            qr?.let {
                Box(Modifier.clip(RoundedCornerShape(Radius.xl)).background(Color.White).padding(8.dp)) {
                    Image(it, null, Modifier.size(200.dp))
                }
            }
            setup?.let {
                Text(
                    it.secret.chunked(4).joinToString(" "),
                    Modifier.clip(RoundedCornerShape(Radius.lg)).background(colors.surface).padding(horizontal = 12.dp, vertical = 8.dp),
                    style = AppText.sm.copy(fontFamily = FontFamily.Monospace, letterSpacing = 4.sp),
                    color = colors.onGhost,
                )
            }
            FormGroup(label = stringResource(R.string.mfa_code)) {
                TextField(
                    code, { code = it.filter(Char::isDigit).take(6) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                )
            }
        }
    }
}
