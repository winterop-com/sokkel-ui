import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Tailwind's merge, told the text sizes the tokens add, so a size such as `text-page` is not taken
 * for a color and dropped beside `text-muted-foreground`.
 */
const merge = extendTailwindMerge({
    extend: { classGroups: { 'font-size': [{ text: ['title', 'page', 'stat', 'display', 'graph-small', 'graph-title'] }] } },
})

/** Join class names, later ones winning over earlier ones that set the same thing. */
export function cn(...inputs: ClassValue[]): string {
    return merge(clsx(inputs))
}
