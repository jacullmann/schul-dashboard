package app.schuldashboard.ui.design

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius

private val CardTitle = AppText.sm.copy(lineHeight = (14 * 1.2).sp)
private val CardDescription = AppText.xs.copy(lineHeight = (12 * 1.35).sp)

/**
 * SettingToggleCard: a 24dp-rounded card naming a setting, whose whole surface flips the
 * toggle on its right.
 */
@Composable
fun ToggleCard(
    title: String,
    description: String?,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val background by animateColorAsState(
        if (pressed && enabled) colors.surfaceHighlight else colors.surface, tween(200, easing = Motion.EaseOut), label = "bg",
    )
    val shape = RoundedCornerShape(Radius.xl2)
    Row(
        modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else 0.6f)
            .clip(shape)
            .background(background)
            .border(1.dp, colors.ghostBorder, shape)
            .toggleable(checked, interaction, null, enabled, Role.Switch, onCheckedChange)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = CardTitle, fontWeight = FontWeight.SemiBold, color = colors.onGhost)
            description?.let { Text(it, style = CardDescription, color = colors.onGhostMuted) }
        }
        Toggle(checked, null, enabled = enabled)
    }
}

/**
 * One option of GroupTypeRadioGroup: a card that outlines itself in the action colour when
 * chosen, with a round check in its corner that fills like the checkbox.
 */
@Composable
fun ChoiceCard(
    title: String,
    description: String?,
    selected: Boolean,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val background by animateColorAsState(
        if (pressed && enabled) colors.surfaceHighlight else colors.surface, tween(200, easing = Motion.EaseOut), label = "bg",
    )
    val border by animateColorAsState(if (selected) colors.action else colors.ghostBorder, tween(200, easing = Motion.EaseOut), label = "border")
    val shape = RoundedCornerShape(Radius.xl2)
    Box(
        modifier
            .fillMaxWidth()
            .alpha(if (enabled) 1f else 0.6f)
            .clip(shape)
            .background(background)
            .border(if (selected) 2.dp else 1.dp, border, shape)
            .selectable(selected, interaction, null, enabled, Role.RadioButton, onSelect),
    ) {
        Column(Modifier.padding(start = 16.dp, top = 16.dp, bottom = 16.dp, end = 40.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = CardTitle, fontWeight = FontWeight.SemiBold, color = colors.onGhost)
            description?.let { Text(it, style = CardDescription, color = colors.onGhostMuted) }
        }
        // Concentric with the card's corner: its radius, less the border, less half the dot.
        Box(Modifier.align(Alignment.TopEnd).padding(13.dp)) {
            Checkbox(selected, { onSelect() }, round = true, enabled = enabled)
        }
    }
}
