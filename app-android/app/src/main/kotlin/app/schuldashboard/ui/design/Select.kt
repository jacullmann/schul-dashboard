package app.schuldashboard.ui.design

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.Motion

/**
 * BaseSelect in its form style: an input-shaped button whose chevron turns while the options
 * sheet is open. [options] are (value, label); [selected] is a value, or null for none.
 */
@Composable
fun Dropdown(
    label: String,
    options: List<Pair<String, String>>,
    selected: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    var open by remember { mutableStateOf(false) }
    val chevron by animateFloatAsState(if (open) 180f else 0f, tween(200, easing = Motion.EaseInOut), label = "chevron")
    AppButton(
        { open = true },
        modifier,
        variant = ButtonVariant.Input,
        icon = Lucide.ChevronDown,
        iconTrailing = true,
        iconRotation = chevron,
        enabled = enabled,
        text = options.firstOrNull { it.first == selected }?.second ?: stringResource(R.string.select_placeholder),
    )
    Menu(open, { open = false }, title = label.ifEmpty { null }) {
        options.forEach { (value, text) ->
            MenuButton(text, { onSelect(value); open = false }, selected = value == selected)
        }
    }
}

