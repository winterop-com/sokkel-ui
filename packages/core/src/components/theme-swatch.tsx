export interface ThemeSwatchProps {
    /** The theme the swatch is drawn in, or null for an empty dashed box. */
    theme: string | null
}

/**
 * A theme's background with its text and accent on it, drawn in that theme whatever the page wears:
 * the lead before a theme's name in the theme picker and in a select field's options. With no theme
 * (`null`), among options that have one, it is an empty dashed box, so the names still line up.
 */
export function ThemeSwatch({ theme }: ThemeSwatchProps) {
    if (theme === null)
        return <span aria-hidden className="h-4 w-7 shrink-0 rounded-[calc(var(--radius)*0.5)] border border-dashed border-border-strong" />
    return (
        <span
            aria-hidden
            data-theme-scope={theme}
            className="flex h-4 w-7 shrink-0 items-center justify-center gap-0.5 rounded-[calc(var(--radius)*0.5)] border border-border bg-background"
        >
            <span className="size-1.5 rounded-full bg-foreground" />
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="size-1.5 rounded-full bg-chart-3" />
        </span>
    )
}
