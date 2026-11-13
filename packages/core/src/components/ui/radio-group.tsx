import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import { cn } from '../../lib/cn'

export type RadioGroupProps = RadioGroupPrimitive.Props & { orientation?: 'vertical' | 'horizontal' }

/** The choices one under the other, or with `horizontal` side by side, flowing onto more lines where the row runs out of room. */
function RadioGroup({ className, orientation = 'vertical', ...props }: RadioGroupProps) {
    return (
        <RadioGroupPrimitive
            data-slot="radio-group"
            className={cn('w-full', orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'grid gap-2', className)}
            {...props}
        />
    )
}

export type RadioGroupItemProps = RadioPrimitive.Root.Props

function RadioGroupItem({ className, ...props }: RadioGroupItemProps) {
    return (
        <RadioPrimitive.Root
            data-slot="radio-group-item"
            className={cn(
                'group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-checked:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-3 aria-invalid:focus-visible:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:focus-visible:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary',
                className,
            )}
            {...props}
        >
            <RadioPrimitive.Indicator data-slot="radio-group-indicator" className="flex size-4 items-center justify-center">
                <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
            </RadioPrimitive.Indicator>
        </RadioPrimitive.Root>
    )
}

export { RadioGroup, RadioGroupItem }
