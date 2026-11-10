import type { Scheme } from '../lib/appearance'
import { Segmented } from './Segmented'

export type { Scheme } from '../lib/appearance'

export interface SchemeChoiceWords {
    /** What the group is called, for a screen reader. */
    scheme: string
    system: string
    light: string
    dark: string
}

const WORDS: SchemeChoiceWords = { scheme: 'Scheme', system: 'System', light: 'Light', dark: 'Dark' }

/** The schemes in the order offered when not given: the default, following the device, first. */
export const SCHEMES_OFFERED: readonly Scheme[] = ['system', 'light', 'dark']

export interface SchemeChoiceProps {
    value: Scheme
    onValueChange: (value: Scheme) => void
    /** The schemes offered, in their order; system, light and dark when not given. */
    schemes?: readonly Scheme[]
    /** Stretches the control to its container. */
    fill?: boolean
    className?: string
    words?: Partial<SchemeChoiceWords>
}

/**
 * Light, dark, or following the device, as one segmented control: the scheme row of an app's
 * settings, beside `ThemeCards` for the theme. System comes first because it is the look before
 * anything is chosen, then light and dark. It holds no state; `onValueChange` answers with the
 * scheme chosen, which `useAppearance` or `useScheme` keeps and wears.
 */
export function SchemeChoice({
    value,
    onValueChange,
    schemes = SCHEMES_OFFERED,
    fill = false,
    className,
    words: given,
}: SchemeChoiceProps) {
    const words = { ...WORDS, ...given }
    return (
        <Segmented
            label={words.scheme}
            value={value}
            options={schemes.map((scheme) => ({ value: scheme, label: words[scheme] }))}
            fill={fill}
            onValueChange={onValueChange}
            className={className}
        />
    )
}
