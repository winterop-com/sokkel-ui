import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'
import { KIND_CHIP, type KindColor } from '../../lib/kind'

const badgeVariants = cva(
    'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-chip border border-transparent px-1.5 py-0.5 text-badge whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
    {
        variants: {
            variant: {
                default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
                secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
                destructive:
                    'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
                outline: 'border-border text-foreground [a]:hover:bg-hover [a]:hover:text-muted-foreground',
                ghost: 'hover:bg-hover hover:text-muted-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
)

/**
 * A short value as a chip. `kind` draws it in one of the kind colors, a wash edged faintly in the
 * color with its ink, for a categorical value a reader learns to tell apart at a glance: what sort
 * of form a card is, which domain a code belongs to. The same value wears the same color wherever
 * it is shown.
 */
function Badge({
    className,
    variant = 'default',
    kind,
    render,
    ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { kind?: KindColor }) {
    return useRender({
        defaultTagName: 'span',
        props: mergeProps<'span'>(
            {
                className: cn(badgeVariants({ variant }), kind !== undefined && KIND_CHIP[kind], className),
            },
            props,
        ),
        render,
        state: {
            slot: 'badge',
            variant,
        },
    })
}

export { Badge, badgeVariants }
