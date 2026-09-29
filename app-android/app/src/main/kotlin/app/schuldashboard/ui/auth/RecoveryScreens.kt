package app.schuldashboard.ui.auth

import android.app.Application
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.api.ForgotRequest
import app.schuldashboard.data.api.ResetRequest
import app.schuldashboard.data.api.ResetVerifyRequest
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.ui.common.LoadingBox
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Notice
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import androidx.compose.material3.Text
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

enum class ResetStep { Email, Code, Password, Done }

data class ForgotState(
    val step: ResetStep = ResetStep.Email,
    val email: String = "",
    val code: String = "",
    val password: String = "",
    val passwordConfirm: String = "",
    val busy: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    application: Application,
    private val api: SchulApi,
    private val json: Json,
) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(ForgotState())
    val state: StateFlow<ForgotState> = _state.asStateFlow()
    private var resetToken = ""

    fun onEmail(v: String) = _state.update { it.copy(email = v, error = null) }
    fun onCode(v: String) = _state.update { it.copy(code = v.filter(Char::isDigit).take(6), error = null) }
    fun onPassword(v: String) = _state.update { it.copy(password = v, error = null) }
    fun onPasswordConfirm(v: String) = _state.update { it.copy(passwordConfirm = v, error = null) }

    private fun run(next: ResetStep, block: suspend () -> Unit) {
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                block()
                _state.update { it.copy(step = next) }
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(error = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(busy = false) }
            }
        }
    }

    fun submit() {
        val s = _state.value
        when (s.step) {
            ResetStep.Email -> run(ResetStep.Code) { api.forgotPassword(ForgotRequest(s.email.trim())).requireSuccess() }
            ResetStep.Code -> run(ResetStep.Password) { resetToken = api.verifyResetCode(ResetVerifyRequest(s.email.trim(), s.code)).resetToken }
            ResetStep.Password -> run(ResetStep.Done) { api.resetPassword(ResetRequest(resetToken, s.password)) }
            ResetStep.Done -> Unit
        }
    }
}

@Composable
fun ForgotPasswordScreen(onBack: () -> Unit, viewModel: ForgotPasswordViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val canSubmit = when (state.step) {
        ResetStep.Email -> state.email.contains('@')
        ResetStep.Code -> state.code.length == 6
        ResetStep.Password -> state.password.length >= 8 && state.password == state.passwordConfirm
        ResetStep.Done -> false
    }
    val title = when (state.step) {
        ResetStep.Code -> R.string.forgot_step2_title
        ResetStep.Password -> R.string.forgot_step3_title
        else -> R.string.forgot_title
    }

    AuthCard(
        stringResource(title),
        actions = {
            AppButton(onBack, text = stringResource(if (state.step == ResetStep.Done) R.string.action_back else R.string.action_cancel))
            if (state.step != ResetStep.Done) {
                AppButton(
                    viewModel::submit,
                    variant = ButtonVariant.Action,
                    enabled = canSubmit,
                    loading = state.busy,
                    text = stringResource(
                        when (state.step) {
                            ResetStep.Email -> R.string.forgot_send_code
                            ResetStep.Code -> R.string.forgot_verify
                            else -> R.string.forgot_reset
                        },
                    ),
                )
            }
        },
    ) {
        val muted = AppTheme.colors.onGhostMuted
        when (state.step) {
            ResetStep.Email -> {
                Text(stringResource(R.string.forgot_step1), style = AppText.sm, color = muted)
                CardField(stringResource(R.string.field_email)) {
                    TextField(
                        state.email, viewModel::onEmail,
                        placeholder = stringResource(R.string.field_email),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    )
                }
            }
            ResetStep.Code -> {
                Text(stringResource(R.string.forgot_step2), style = AppText.sm, color = muted)
                CardField(stringResource(R.string.mfa_code)) {
                    TextField(
                        state.code, viewModel::onCode,
                        placeholder = stringResource(R.string.mfa_code),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    )
                }
            }
            ResetStep.Password -> {
                Text(stringResource(R.string.forgot_step3), style = AppText.sm, color = muted)
                CardField(stringResource(R.string.forgot_new_password)) {
                    TextField(state.password, viewModel::onPassword, placeholder = stringResource(R.string.forgot_new_password), password = true)
                }
                CardField(stringResource(R.string.forgot_new_password_confirm)) {
                    TextField(
                        state.passwordConfirm, viewModel::onPasswordConfirm,
                        placeholder = stringResource(R.string.forgot_new_password_confirm), password = true,
                    )
                }
            }
            ResetStep.Done -> Notice(stringResource(R.string.forgot_done), error = false)
        }
        state.error?.let { Notice(it, error = true) }
    }
}

@dagger.hilt.android.lifecycle.HiltViewModel
class VerifyEmailViewModel @Inject constructor(handle: SavedStateHandle, api: SchulApi) : androidx.lifecycle.ViewModel() {
    private val _ok = MutableStateFlow<Boolean?>(null)
    val ok: StateFlow<Boolean?> = _ok.asStateFlow()

    init {
        val token: String = handle["token"] ?: ""
        viewModelScope.launch { _ok.value = runCatching { api.verifyEmail(token).ok }.getOrDefault(false) }
    }
}

@Composable
fun VerifyEmailScreen(onDone: () -> Unit, viewModel: VerifyEmailViewModel = hiltViewModel()) {
    val ok by viewModel.ok.collectAsStateWithLifecycle()
    val result = ok
    if (result == null) {
        LoadingBox()
        return
    }
    AuthCard(
        stringResource(R.string.verify_title),
        actions = { AppButton(onDone, variant = ButtonVariant.Action, text = stringResource(R.string.action_back)) },
    ) {
        Notice(stringResource(if (result) R.string.verify_success else R.string.verify_failed), error = !result)
    }
}
