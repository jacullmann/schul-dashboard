package app.schuldashboard.ui.design

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import app.schuldashboard.ui.theme.focusBlur

/**
 * BaseInput: a 12dp-rounded field with a hairline border. Focus firms up the border and grows a
 * 3dp ring around it over the site's 200ms focus transition. Passwords get the eye toggle.
 */
@Composable
fun TextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    password: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = 1,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val border by animateColorAsState(if (focused) colors.focus else colors.ghostBorder, Motion.focus(), label = "border")
    val ring by animateDpAsState(if (focused) 3.dp else 0.dp, Motion.focus(), label = "ring")
    var revealed by rememberSaveable { mutableStateOf(false) }
    val shape = RoundedCornerShape(Radius.lg)
    val textStyle = AppText.base.copy(lineHeight = 20.sp, color = colors.onGhost)

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                val grow = ring.toPx()
                if (grow > 0f) {
                    val radius = Radius.lg.toPx() + grow
                    drawRoundRect(
                        colors.focusRing,
                        topLeft = Offset(-grow, -grow),
                        size = Size(size.width + grow * 2, size.height + grow * 2),
                        cornerRadius = CornerRadius(radius),
                    )
                }
            }
            .inputShadow(shape)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, border, shape),
        enabled = enabled,
        textStyle = textStyle,
        singleLine = singleLine,
        minLines = minLines,
        maxLines = maxLines,
        keyboardOptions = keyboardOptions,
        keyboardActions = keyboardActions,
        visualTransformation = if (password && !revealed) PasswordVisualTransformation() else visualTransformation,
        interactionSource = interaction,
        cursorBrush = SolidColor(colors.onGhost),
        decorationBox = { field ->
            Row(
                Modifier.defaultMinSize(minHeight = 40.dp).padding(start = 12.dp, end = if (password) 8.dp else 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(Modifier.weight(1f).padding(vertical = 8.dp)) {
                    if (value.isEmpty() && placeholder != null) {
                        Text(placeholder, style = textStyle, color = colors.onGhostSubtle, maxLines = maxLines)
                    }
                    field()
                }
                if (password) {
                    Box(
                        Modifier.clip(RoundedCornerShape(Radius.sm)).clickable { revealed = !revealed }.padding(4.dp),
                    ) {
                        Icon(
                            if (revealed) Lucide.EyeOff else Lucide.Eye,
                            stringResource(if (revealed) R.string.a11y_hide_password else R.string.a11y_show_password),
                            size = 20.dp,
                            tint = colors.onGhostMuted,
                        )
                    }
                }
            }
        },
    )
}

/** BaseLabel: small muted text above a field, with a danger asterisk when required. */
@Composable
fun Label(text: String, modifier: Modifier = Modifier, required: Boolean = false) {
    val colors = AppTheme.colors
    Text(
        buildAnnotatedString {
            append(text)
            if (required) withStyle(SpanStyle(color = colors.danger)) { append(" *") }
        },
        modifier.padding(bottom = 6.dp),
        style = AppText.sm,
        color = colors.onGhostMuted,
    )
}

/**
 * BaseFormGroup: a label, the field, and an error that eases the content below into place
 * rather than shoving it. The text trails the row opening and leads it closing; a changed
 * message crossfades in place.
 */
@Composable
fun FormGroup(
    modifier: Modifier = Modifier,
    label: String? = null,
    required: Boolean = false,
    error: String? = null,
    content: @Composable () -> Unit,
) {
    Column(modifier.fillMaxWidth()) {
        label?.let { Label(it, required = required) }
        content()
        FormError(error)
    }
}

@Composable
fun FormError(error: String?, modifier: Modifier = Modifier) {
    // Holds the last message while the row closes, so it leaves with its text.
    var shown by remember { mutableStateOf(error) }
    if (error != null) shown = error
    AnimatedVisibility(
        visible = error != null,
        modifier = modifier,
        enter = expandVertically(tween(350, easing = Motion.Drawer), expandFrom = Alignment.Top) +
            fadeIn(tween(250, delayMillis = 50)) +
            slideInVertically(tween(300, 50, Motion.Settle)) { -it / 4 },
        exit = shrinkVertically(tween(250, 50, Motion.Drawer), shrinkTowards = Alignment.Top) +
            fadeOut(tween(150)) +
            slideOutVertically(tween(150, easing = Motion.Exit)) { -it / 4 },
    ) {
        AnimatedContent(
            shown,
            Modifier.focusBlur(this, 2f, 300, 150, enterDelayMs = 50),
            transitionSpec = {
                (fadeIn(tween(250)) + slideInVertically(tween(300, easing = Motion.Settle)) { -it / 4 }) togetherWith
                    fadeOut(tween(150))
            },
            label = "error",
        ) { message ->
            Text(
                message.orEmpty(),
                Modifier.padding(top = 6.dp).focusBlur(this, 2f, 300, 150),
                style = AppText.sm.copy(lineHeight = (14 * 1.4).sp),
                color = AppTheme.colors.danger,
            )
        }
    }
}

/** A tinted notice like the login page's message (`bg-danger-hover text-danger`, or success). */
@Composable
fun Notice(text: String, error: Boolean, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Text(
        text,
        modifier.fillMaxWidth().clip(RoundedCornerShape(Radius.md))
            .background(if (error) colors.dangerHover else colors.successHover)
            .padding(12.dp),
        style = AppText.sm,
        color = if (error) colors.danger else colors.success,
    )
}

/** The underlined field the task note editor uses: a rule that thickens and darkens on focus. */
@Composable
fun UnderlineTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val rule by animateDpAsState(if (focused) 4.dp else 2.dp, Motion.focus(), label = "rule")
    val ruleColor by animateColorAsState(if (focused) colors.onGhost else colors.onGhostSubtle, Motion.focus(), label = "ruleColor")
    val style = AppText.base.copy(color = colors.onGhost)
    BasicTextField(
        value, onValueChange,
        modifier.fillMaxWidth().drawBehind {
            val h = rule.toPx()
            drawRect(ruleColor, Offset(0f, size.height - h), Size(size.width, h))
        },
        textStyle = style,
        interactionSource = interaction,
        cursorBrush = SolidColor(colors.onGhost),
        decorationBox = { field ->
            Box(Modifier.padding(bottom = 8.dp + rule)) {
                if (value.isEmpty() && placeholder != null) Text(placeholder, style = style, color = colors.onGhostSubtle)
                field()
            }
        },
    )
}
