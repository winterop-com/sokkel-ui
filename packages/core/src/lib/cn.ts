import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Tailwind's merge, told the text sizes and type roles the tokens add, so a size such as `text-page` is not taken
 * for a color and dropped beside `text-muted-foreground`, and the spacings they add, so a later `min-w-*`
 * overrides `min-w-finger`. So too the focus and invalid rings' widths and offset (`outline-focus` is a width
 * beside `outline-ring`, a color), the disabled opacity, the layers, and the motion's durations and curve.
 */
const merge = extendTailwindMerge({
    extend: {
        theme: { spacing: ['finger'] },
        classGroups: {
            'outline-w': [{ outline: ['focus'] }],
            'outline-offset': [{ 'outline-offset': ['focus'] }],
            'ring-w': [{ ring: ['focus', 'invalid'] }],
            opacity: [{ opacity: ['disabled'] }],
            z: [{ z: ['drawer', 'dialog', 'popover', 'toast'] }],
            duration: [{ duration: ['fast', 'base'] }],
            ease: [{ ease: ['motion'] }],
            'font-size': [
                {
                    text: [
                        'title',
                        'page',
                        'stat',
                        'display',
                        'graph-small',
                        'graph-title',
                        'page-title',
                        'detail-title',
                        'section-title',
                        'head',
                        'body',
                        'action',
                        'label',
                        'help',
                        'badge',
                        'statistic',
                        'media-title',
                    ],
                },
            ],
        },
    },
})

/** Join class names, later ones winning over earlier ones that set the same thing. */
export function cn(...inputs: ClassValue[]): string {
    return merge(clsx(inputs))
}
