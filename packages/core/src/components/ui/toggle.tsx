import { Toggle as TogglePrimitive } from '@base-ui/react/toggle'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'
import { INVALID_EDGE } from '../../lib/issue-edge'

const toggleVariants = cva(
    `group/toggle inline-flex items-center justify-center gap-1 rounded-control text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-muted data-[state=on]:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 ${INVALID_EDGE}`,
    {
        variants: {
            variant: {
                default: 'bg-transparent',
                outline: 'border border-input bg-transparent hover:bg-hover',
            },
            size: {
                default:
                    'h-(--density-control) min-w-(--density-control) px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 max-md:min-h-finger max-md:min-w-finger',
                sm: "h-(--density-control-sm) min-w-(--density-control-sm) rounded-[min(var(--control-radius),12px)] px-2.5 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 max-md:min-h-finger max-md:min-w-finger [&_svg:not([class*='size-'])]:size-3.5",
                lg: 'h-(--density-control-lg) min-w-(--density-control-lg) px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 max-md:min-h-finger max-md:min-w-finger',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

export type ToggleProps = TogglePrimitive.Props & VariantProps<typeof toggleVariants>

function Toggle({ className, variant = 'default', size = 'default', ...props }: ToggleProps) {
    return <TogglePrimitive data-slot="toggle" className={cn(toggleVariants({ variant, size, className }))} {...props} />
}

export { Toggle, toggleVariants }
