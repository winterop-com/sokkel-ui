import { useScheme } from '../hooks/use-scheme'
import type { Scheme } from '../lib/appearance'
import { ThemeToggle } from './ThemeToggle'

/**
 * The light and dark switch wired to `useScheme`: it shows the scheme the document wears, and a
 * press chooses the other one and keeps it. Until pressed, the scheme follows the system, or
 * `fallback` when given (the same one given to `useAppearance`).
 */
export function SchemeToggle({ fallback, words }: { fallback?: Scheme; words?: { toLight: string; toDark: string } }) {
    const { resolved, setScheme } = useScheme(fallback)
    return <ThemeToggle dark={resolved === 'dark'} onToggle={() => setScheme(resolved === 'dark' ? 'light' : 'dark')} words={words} />
}
