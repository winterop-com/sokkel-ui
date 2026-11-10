import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { Check } from 'lucide-react'

import { THEMES, type ThemeOption } from '../lib/appearance'
import { cn } from '../lib/cn'

export type { ThemeOption } from '../lib/appearance'

export interface ThemeCardsWords {
    /** What the group is called, for a screen reader. */
    theme: string
}

const WORDS: ThemeCardsWords = { theme: 'Theme' }

export interface ThemeCardsProps {
    /** The chosen theme, by the name `data-theme` takes. */
    value: string
    onValueChange: (value: string) => void
    /** The themes offered; every theme in the tokens when not given. */
    themes?: readonly ThemeOption[]
    className?: string
    words?: Partial<ThemeCardsWords>
}

/**
 * The themes as cards to choose one from, each a small page drawn in its own theme: its background,
 * a card on it with its border, a line of text in its foreground and one in its muted text, and its
 * brand, with the theme's name under it. Each card wears its theme's real tokens with
 * `data-theme-scope`, in the scheme the page wears, so a theme that changes surfaces and lines
 * shows them as plainly as one that changes the accent.
 *
 * It is a radio group: the arrow keys move between the cards and choose, Tab enters at the chosen
 * one, and the chosen card is ringed and checked. It holds no state; `onValueChange` answers with
 * the theme chosen. Beside `SchemeChoice` it makes the two settings rows of an app's look.
 */
export function ThemeCards({ value, onValueChange, themes = THEMES, className, words: given }: ThemeCardsProps) {
    const words = { ...WORDS, ...given }
    return (
        <RadioGroupPrimitive
            data-slot="theme-cards"
            aria-label={words.theme}
            value={value}
            onValueChange={(next) => onValueChange(next as string)}
            className={cn('grid w-full grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2', className)}
        >
            {themes.map((theme) => (
                <ThemeCard key={theme.value} theme={theme} chosen={theme.value === value} />
            ))}
        </RadioGroupPrimitive>
    )
}

function ThemeCard({ theme, chosen }: { theme: ThemeOption; chosen: boolean }) {
    return (
        <RadioPrimitive.Root
            value={theme.value}
            data-slot="theme-card"
            className={cn(
                'flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-surface border text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                chosen ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-border-strong',
            )}
        >
            <Sample theme={theme.value} />
            <span
                className={cn(
                    'flex min-w-0 items-center gap-1.5 px-2 py-1.5 text-xs',
                    chosen ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
            >
                <span className="min-w-0 flex-1 truncate">{theme.label}</span>
                {chosen && <Check aria-hidden className="size-3.5 shrink-0 text-primary" />}
            </span>
        </RadioPrimitive.Root>
    )
}

/** A small page in `theme`: its background, a bordered card on it with two lines of text, and its brand. */
function Sample({ theme }: { theme: string }) {
    return (
        <span
            aria-hidden
            data-slot="theme-card-sample"
            data-theme-scope={theme}
            className="flex h-16 flex-col border-b border-border bg-background p-2 text-foreground"
        >
            <span className="flex min-h-0 flex-1 flex-col gap-1 rounded-[calc(var(--radius)*0.75)] border border-border bg-card p-1.5">
                <span className="h-1.5 w-3/4 shrink-0 rounded-full bg-foreground" />
                <span className="h-1 w-1/2 shrink-0 rounded-full bg-muted-foreground" />
                <span className="mt-auto flex items-center gap-1">
                    <span className="h-2 w-5 shrink-0 rounded-[calc(var(--radius)*0.5)] bg-primary" />
                    <span className="h-px min-w-0 flex-1 bg-border-strong" />
                </span>
            </span>
        </span>
    )
}
