import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

import { Separator } from './separator'

const buttonGroupVariants = cva(
    "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-control [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
    {
        variants: {
            orientation: {
                horizontal:
                    '*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-control! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0',
                vertical:
                    'flex-col *:data-slot:justify-start *:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-control! [&>[data-slot][data-button-size^=icon]]:justify-center [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
            },
        },
        defaultVariants: {
            orientation: 'horizontal',
        },
    },
)

export type ButtonGroupProps = React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>

function ButtonGroup({ className, orientation, ...props }: ButtonGroupProps) {
    return (
        <div
            role="group"
            data-slot="button-group"
            data-orientation={orientation}
            className={cn(buttonGroupVariants({ orientation }), className)}
            {...props}
        />
    )
}

export type ButtonGroupTextProps = useRender.ComponentProps<'div'>

function ButtonGroupText({ className, render, ...props }: ButtonGroupTextProps) {
    return useRender({
        defaultTagName: 'div',
        props: mergeProps<'div'>(
            {
                className: cn(
                    "flex items-center gap-2 rounded-control border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
                    className,
                ),
            },
            props,
        ),
        render,
        state: {
            slot: 'button-group-text',
        },
    })
}

export type ButtonGroupSeparatorProps = React.ComponentProps<typeof Separator>

function ButtonGroupSeparator({ className, orientation = 'vertical', ...props }: ButtonGroupSeparatorProps) {
    return (
        <Separator
            data-slot="button-group-separator"
            orientation={orientation}
            className={cn(
                'relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto',
                className,
            )}
            {...props}
        />
    )
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants }
