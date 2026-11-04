import { Moon, Sun } from 'lucide-react'

import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

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
        <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onToggle} />}>
                {dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    )
}
