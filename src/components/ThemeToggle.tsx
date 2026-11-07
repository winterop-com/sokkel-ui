import { Moon, Sun } from 'lucide-react'

import { IconButton } from './IconButton'

/**
 * The light and dark switch for a top bar: the icon shows the scheme in use, and the name and
 * tooltip say what a press does.
 */
export function ThemeToggle({
    dark,
    onToggle,
    words = { toLight: 'Switch to light', toDark: 'Switch to dark' },
}: {
    dark: boolean
    onToggle: () => void
    words?: { toLight: string; toDark: string }
}) {
    const label = dark ? words.toLight : words.toDark
    return (
        <IconButton label={label} side="bottom" onClick={onToggle}>
            {dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
        </IconButton>
    )
}
