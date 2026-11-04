import { twMerge } from 'tailwind-merge'

/** Join class names, later ones winning over earlier ones that set the same thing. */
export function cn(...parts: (string | false | null | undefined)[]): string {
    return twMerge(parts.filter(Boolean).join(' '))
}
