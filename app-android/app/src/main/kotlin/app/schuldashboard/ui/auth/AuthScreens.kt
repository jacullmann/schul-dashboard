package app.schuldashboard.ui.auth

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.AppLogo
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.LabeledCheckbox
import app.schuldashboard.ui.design.Notice
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.design.TextLink
import app.schuldashboard.ui.theme.animateEnter
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius

/** LoginLayout: the logo and name in a header, the form centred below at most 420dp wide. */
@Composable
internal fun AuthLayout(content: @Composable ColumnScope.() -> Unit) {
    val colors = AppTheme.colors
    Column(Modifier.fillMaxSize().safeDrawingPadding().imePadding().verticalScroll(rememberScrollState())) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            AppLogo(50.dp)
            Text(stringResource(R.string.app_name), style = AppText.xl2, fontWeight = FontWeight.Bold, color = colors.onGhost)
        }
        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(Modifier.widthIn(max = 420.dp).fillMaxWidth().animateEnter(), content = content)
        }
    }
}

/** The centred h1 and muted line above the login and register forms. */
@Composable
private fun AuthTitle(title: String, description: String) {
    Column(Modifier.fillMaxWidth().padding(bottom = 32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, style = AppText.h1, color = AppTheme.colors.onGhost, textAlign = TextAlign.Center)
        Text(description, Modifier.padding(top = 8.dp), style = AppText.sm, color = AppTheme.colors.onGhostMuted)
    }
}

/** The "Don't have an account? Register" line below the forms. */
@Composable
private fun SwitchLine(prompt: String, action: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 32.dp),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("$prompt ", style = AppText.sm, color = AppTheme.colors.onGhostMuted)
        Text(
            action,
            Modifier.clickable(onClick = onClick).padding(vertical = 12.dp),
            style = AppText.sm,
            fontWeight = FontWeight.Medium,
            color = AppTheme.colors.onGhost,
        )
    }
}

@Composable
private fun Field(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    error: Int?,
    placeholder: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    password: Boolean = false,
    imeAction: ImeAction = ImeAction.Next,
    onDone: () -> Unit = {},
) {
    FormGroup(label = label, error = error?.let { stringResource(it) }) {
        TextField(
            value, onValueChange,
            placeholder = placeholder,
            password = password,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            keyboardActions = KeyboardActions(onDone = { onDone() }),
        )
    }
}

@Composable
fun LoginScreen(
    onRegister: () -> Unit,
    onForgotPassword: () -> Unit,
    onMfaRequired: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    LaunchedEffect(Unit) { viewModel.mfaRequired.collect { onMfaRequired() } }

    AuthLayout {
        AuthTitle(stringResource(R.string.login_title), stringResource(R.string.login_description))
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Field(
                stringResource(R.string.field_email), state.email, viewModel::onEmail, state.emailError,
                stringResource(R.string.email_placeholder), KeyboardType.Email,
            )
            Field(
                stringResource(R.string.field_password), state.password, viewModel::onPassword, state.passwordError,
                stringResource(R.string.password_placeholder), KeyboardType.Password, password = true,
                imeAction = ImeAction.Done, onDone = viewModel::submit,
            )
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                TextLink(stringResource(R.string.forgot_link), onForgotPassword)
            }
            state.serverError?.let { Notice(it, error = true) }
        }
        Column(Modifier.padding(top = 16.dp)) {
            AppButton(
                viewModel::submit, variant = ButtonVariant.Action, full = true, loading = state.submitting,
                text = stringResource(R.string.login_submit),
            )
        }
        SwitchLine(stringResource(R.string.login_no_account), stringResource(R.string.register_submit), onRegister)
    }
}

@Composable
fun RegisterScreen(onBack: () -> Unit, viewModel: RegisterViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    AuthLayout {
        AuthTitle(stringResource(R.string.register_submit), stringResource(R.string.register_description))
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Field(
                stringResource(R.string.field_email), state.email, viewModel::onEmail, state.emailError,
                stringResource(R.string.email_placeholder), KeyboardType.Email,
            )
            Field(
                stringResource(R.string.field_password), state.password, viewModel::onPassword, state.passwordError,
                stringResource(R.string.password_placeholder), KeyboardType.Password, password = true,
            )
            Field(
                stringResource(R.string.field_password_confirm), state.passwordConfirm, viewModel::onPasswordConfirm,
                state.confirmError, stringResource(R.string.confirm_placeholder), KeyboardType.Password, password = true,
                imeAction = ImeAction.Done,
            )
            FormGroup(error = state.privacyError?.let { stringResource(it) }) {
                LabeledCheckbox(
                    state.acceptedPrivacy, viewModel::onPrivacy, stringResource(R.string.privacy_accept), Modifier.padding(top = 4.dp),
                )
            }
            state.serverError?.let { Notice(it, error = true) }
            if (state.registered) Notice(stringResource(R.string.register_success), error = false)
        }
        Column(Modifier.padding(top = 16.dp)) {
            AppButton(
                viewModel::submit, variant = ButtonVariant.Action, full = true, loading = state.submitting,
                text = stringResource(R.string.register_submit),
            )
        }
        SwitchLine(stringResource(R.string.login_have_account), stringResource(R.string.login_submit), onBack)
    }
}

/**
 * CenteredAuthModal, which the site uses for the reset and MFA steps: a bordered card with a
 * title, its fields and a right-aligned row of actions.
 */
@Composable
internal fun AuthCard(title: String, actions: @Composable () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val colors = AppTheme.colors
    Box(
        Modifier.fillMaxSize().safeDrawingPadding().imePadding().verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Card(
            Modifier.widthIn(max = 420.dp).fillMaxWidth().animateEnter(),
            radius = Radius.lg,
            padding = PaddingValues(24.dp),
            background = colors.canvas,
        ) {
            Text(title, Modifier.padding(bottom = 24.dp), style = AppText.xl, fontWeight = FontWeight.SemiBold, color = colors.onGhost)
            Column(Modifier.padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp), content = content)
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
            ) { actions() }
        }
    }
}

/** A field labelled the way the reset card labels them: medium weight, full colour. */
@Composable
internal fun CardField(label: String, content: @Composable () -> Unit) {
    Column {
        Text(label, Modifier.padding(bottom = 8.dp), style = AppText.base, fontWeight = FontWeight.Medium, color = AppTheme.colors.onGhost)
        content()
    }
}

@Composable
fun MfaScreen(onBack: () -> Unit, viewModel: MfaViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    AuthCard(
        stringResource(R.string.mfa_title),
        actions = {
            AppButton({ viewModel.cancel(); onBack() }, text = stringResource(R.string.action_cancel))
            AppButton(viewModel::submit, variant = ButtonVariant.Action, loading = state.submitting, text = stringResource(R.string.mfa_submit))
        },
    ) {
        Text(stringResource(R.string.mfa_description), style = AppText.sm, color = AppTheme.colors.onGhostMuted)
        CardField(stringResource(R.string.mfa_code)) {
            TextField(
                state.code, viewModel::onCode,
                placeholder = stringResource(R.string.mfa_code),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { viewModel.submit() }),
            )
        }
        state.error?.let { Notice(it, error = true) }
    }
}
