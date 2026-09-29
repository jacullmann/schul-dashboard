package app.schuldashboard.ui.design

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.LucideIcon
import app.schuldashboard.ui.theme.AppColors
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius

/** BaseButton's `variant`. */
enum class ButtonVariant { Action, Ghost, Danger, Input }

/** BaseButton's `on`: the surface a ghost button sits on, which picks its text colours. */
enum class ButtonOn { Ghost, Action, Danger }

enum class ButtonSize(val iconSize: Dp) { Xs(16.dp), Sm(18.dp), Md(20.dp) }

private data class ButtonColors(val background: Color, val pressedBackground: Color, val content: Color, val pressedContent: Color)

private fun AppColors.buttonColors(variant: ButtonVariant, on: ButtonOn): ButtonColors = when (variant) {
    ButtonVariant.Action -> ButtonColors(action, actionHover, onAction, onAction)
    ButtonVariant.Danger -> ButtonColors(danger, dangerHighlight, onDanger, onDanger)
    ButtonVariant.Input -> ButtonColors(surface, surfaceHighlight, onGhost, onGhost)
    ButtonVariant.Ghost -> when (on) {
        ButtonOn.Ghost -> ButtonColors(Color.Transparent, ghostHover, onGhostMuted, onGhost)
        ButtonOn.Action -> ButtonColors(Color.Transparent, actionHover, onActionMuted, onAction)
        ButtonOn.Danger -> ButtonColors(Color.Transparent, dangerHighlight, onDangerMuted, onDanger)
    }
}

/**
 * The site's BaseButton: a pill with a `v-wave` ripple. Pressing shows what hovering shows on
 * the site, fading in over the same 100ms.
 */
@Composable
fun AppButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.Ghost,
    on: ButtonOn = ButtonOn.Ghost,
    size: ButtonSize = ButtonSize.Md,
    icon: LucideIcon? = null,
    iconTrailing: Boolean = false,
    iconFilled: Boolean = false,
    iconRotation: Float = 0f,
    iconSize: Dp = size.iconSize,
    full: Boolean = false,
    loading: Boolean = false,
    enabled: Boolean = true,
    contentDescription: String? = null,
    contentColor: Color? = null,
    text: String? = null,
) {
    val colors = AppTheme.colors.buttonColors(variant, on)
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val active = enabled && !loading
    val background by animateColorAsState(if (pressed && active) colors.pressedBackground else colors.background, Motion.hover(), label = "bg")
    val content by animateColorAsState(
        contentColor ?: if (pressed && active) colors.pressedContent else colors.content, Motion.hover(), label = "fg",
    )
    val isInput = variant == ButtonVariant.Input
    val shape: Shape = if (isInput) RoundedCornerShape(Radius.lg) else CircleShape
    val hasText = text != null
    val padding = when {
        isInput -> PaddingValues(horizontal = 12.dp, vertical = 8.dp)
        size == ButtonSize.Xs -> PaddingValues(4.dp)
        size == ButtonSize.Sm -> PaddingValues(8.dp)
        !loading && icon != null && hasText ->
            if (iconTrailing) PaddingValues(start = 20.dp, end = 12.dp, top = 8.dp, bottom = 8.dp)
            else PaddingValues(start = 12.dp, end = 20.dp, top = 8.dp, bottom = 8.dp)
        loading || icon != null -> PaddingValues(8.dp)
        else -> PaddingValues(horizontal = 20.dp, vertical = 8.dp)
    }
    val weight = when {
        full -> FontWeight.SemiBold
        isInput -> FontWeight.Normal
        else -> FontWeight.Medium
    }

    Row(
        modifier
            .then(if (full || isInput) Modifier.fillMaxWidth() else Modifier)
            .then(if (size == ButtonSize.Md) Modifier.defaultMinSize(40.dp, 40.dp) else Modifier)
            .alpha(if (enabled) 1f else 0.5f)
            .clip(shape)
            .background(background)
            .then(if (isInput) Modifier.inputShadow(shape).border(1.dp, AppTheme.colors.ghostBorder, shape) else Modifier)
            .clickable(
                interactionSource = interaction,
                indication = ripple(color = content),
                enabled = active,
                role = Role.Button,
                onClickLabel = contentDescription,
                onClick = onClick,
            )
            .padding(padding),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CompositionLocalProvider(LocalContentColor provides content) {
            if (loading) {
                Spinner(size.iconSize, content)
            } else {
                val iconView: @Composable () -> Unit = {
                    icon?.let {
                        Icon(it, if (hasText) null else contentDescription, Modifier.rotate(iconRotation), iconSize, filled = iconFilled)
                    }
                }
                if (!iconTrailing) iconView()
                text?.let {
                    Text(
                        it,
                        style = AppText.sm.copy(lineHeight = 16.sp),
                        fontWeight = weight,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = if (isInput) Modifier.weight(1f) else Modifier,
                    )
                }
                if (iconTrailing) iconView()
            }
        }
    }
}

/** Icon-only ghost button, the site's most common `<BaseButton :icon="…" />`. */
@Composable
fun IconButton(
    icon: LucideIcon,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: ButtonSize = ButtonSize.Md,
    variant: ButtonVariant = ButtonVariant.Ghost,
    on: ButtonOn = ButtonOn.Ghost,
    filled: Boolean = false,
    enabled: Boolean = true,
    contentColor: Color? = null,
    rotation: Float = 0f,
    iconSize: Dp = size.iconSize,
) = AppButton(
    onClick, modifier, variant, on, size, icon,
    iconFilled = filled, iconRotation = rotation, iconSize = iconSize, enabled = enabled,
    contentDescription = contentDescription, contentColor = contentColor,
)

/** A text link styled like BaseLink: medium weight, underlined, muted until pressed. */
@Composable
fun TextLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val colors = AppTheme.colors
    val color by animateColorAsState(if (pressed) colors.onGhost else colors.onGhostMuted, Motion.hover(), label = "link")
    Text(
        text,
        modifier.clickable(interaction, null, role = Role.Button, onClick = onClick),
        color = color,
        style = AppText.base.copy(textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline),
        fontWeight = FontWeight.Medium,
    )
}
