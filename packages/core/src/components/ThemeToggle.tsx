import { Moon, Sun } from 'lucide-react'

import { IconButton } from './IconButton'
import { useWords, type WordsPart } from '../lib/words'

/** The words a theme toggle says. */
export interface ThemeToggleWords {
    toLight: string
    toDark: string
}

export const THEME_TOGGLE_WORDS: ThemeToggleWords = {
    toLight: 'Switch to light',
    toDark: 'Switch to dark',
}

/** Where a catalog holds a theme toggle's words. */
export const THEME_TOGGLE_PART: WordsPart<ThemeToggleWords> = { id: 'themeToggle', words: THEME_TOGGLE_WORDS }

export interface ThemeToggleProps {
    dark: boolean
    onToggle: () => void
    words?: Partial<ThemeToggleWords>
}

/**
 * The light and dark switch for a top bar: the icon shows the scheme in use, and the name and
 * tooltip say what a press does.
 */
export function ThemeToggle({ dark, onToggle, words: given }: ThemeToggleProps) {
    const words = useWords(THEME_TOGGLE_PART, given)
    const label = dark ? words.toLight : words.toDark
    return (
        <IconButton label={label} side="bottom" onClick={onToggle}>
            {dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
        </IconButton>
    )
}
