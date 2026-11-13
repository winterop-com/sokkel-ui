import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'

import { cn } from '../../lib/utils'
import { returnFocusOnKeyboard } from '../../lib/focus'
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from 'lucide-react'

export type SelectProps<Value, Multiple extends boolean | undefined = false> = SelectPrimitive.Root.Props<Value, Multiple>

const Select = SelectPrimitive.Root

export type SelectGroupProps = SelectPrimitive.Group.Props

function SelectGroup({ className, ...props }: SelectGroupProps) {
    return <SelectPrimitive.Group data-slot="select-group" className={cn('scroll-my-1 p-1', className)} {...props} />
}

export type SelectValueProps = SelectPrimitive.Value.Props

function SelectValue({ className, ...props }: SelectValueProps) {
    return <SelectPrimitive.Value data-slot="select-value" className={cn('flex flex-1 text-left', className)} {...props} />
}

export type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
    size?: 'sm' | 'default'
    variant?: 'field' | 'quiet'
    /**
     * The options' labels the select keeps room for: it is as wide as the widest of them, whichever
     * is chosen, so it holds one width as the choice changes rather than taking a width set by hand.
     */
    widest?: readonly React.ReactNode[]
}

/**
 * The control that shows the chosen value and opens the list. `field` draws it as a form field;
 * `quiet` draws it as a ghost button, for a value picked in a bar or beside a heading, such as a
 * model in a composer or the order of a list. It is as wide as the chosen value, or with `widest`
 * as the widest of the labels it is given.
 */
function SelectTrigger({ className, size = 'default', variant = 'field', widest, children, ...props }: SelectTriggerProps) {
    return (
        <SelectPrimitive.Trigger
            data-slot="select-trigger"
            data-size={size}
            data-variant={variant}
            className={cn(
                "flex w-fit items-center justify-between gap-1.5 rounded-control border border-input bg-field py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--control-radius),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 max-md:min-h-finger dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                variant === 'quiet' &&
                    'border-transparent bg-transparent pr-1.5 pl-2 font-medium hover:bg-hover focus-visible:border-transparent data-popup-open:bg-hover',
                className,
            )}
            {...props}
        >
            {widest === undefined ? (
                children
            ) : (
                // The value and every label share one cell, the labels unseen and flat, so the cell is as wide as the widest.
                <span
                    data-slot="select-sizer"
                    className="grid min-w-0 flex-1 *:col-start-1 *:row-start-1 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5"
                >
                    {children}
                    {widest.map((label, index) => (
                        <span key={index} aria-hidden className="invisible h-0 overflow-hidden whitespace-nowrap">
                            {label}
                        </span>
                    ))}
                </span>
            )}
            <SelectPrimitive.Icon render={<ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />} />
        </SelectPrimitive.Trigger>
    )
}

export type SelectContentProps = SelectPrimitive.Popup.Props &
    Pick<SelectPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset' | 'alignItemWithTrigger'>

function SelectContent({
    className,
    children,
    side = 'bottom',
    sideOffset = 4,
    align = 'center',
    alignOffset = 0,
    alignItemWithTrigger = true,
    ...props
}: SelectContentProps) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
                side={side}
                sideOffset={sideOffset}
                align={align}
                alignOffset={alignOffset}
                alignItemWithTrigger={alignItemWithTrigger}
                className="isolate z-50"
            >
                <SelectPrimitive.Popup
                    data-slot="select-content"
                    data-align-trigger={alignItemWithTrigger}
                    className={cn(
                        'relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-surface bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
                        className,
                    )}
                    finalFocus={returnFocusOnKeyboard}
                    {...props}
                >
                    <SelectScrollUpButton />
                    <SelectPrimitive.List>{children}</SelectPrimitive.List>
                    <SelectScrollDownButton />
                </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
    )
}

export type SelectLabelProps = SelectPrimitive.GroupLabel.Props

function SelectLabel({ className, ...props }: SelectLabelProps) {
    return (
        <SelectPrimitive.GroupLabel
            data-slot="select-label"
            className={cn('px-1.5 py-1 text-xs text-muted-foreground', className)}
            {...props}
        />
    )
}

export type SelectItemProps = SelectPrimitive.Item.Props & {
    /** A quiet fact about the option, such as the value it would inherit; the chosen value never shows it. */
    detail?: React.ReactNode
    /** Where the detail goes: at the row's end, before the check, or on a second line under the label. */
    detailPlacement?: 'end' | 'below'
}

function SelectItem({ className, children, detail, detailPlacement = 'end', ...props }: SelectItemProps) {
    const below = detail !== undefined && detailPlacement === 'below'
    const text = (
        <SelectPrimitive.ItemText className={cn('flex flex-1 shrink-0 gap-2 whitespace-nowrap', below && 'min-w-0')}>
            {children}
        </SelectPrimitive.ItemText>
    )
    return (
        <SelectPrimitive.Item
            data-slot="select-item"
            className={cn(
                "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className,
            )}
            {...props}
        >
            {below ? (
                <div data-slot="select-item-lines" className="flex min-w-0 flex-1 flex-col">
                    {text}
                    <div className="text-xs whitespace-normal text-muted-foreground">{detail}</div>
                </div>
            ) : (
                text
            )}
            {detail !== undefined && !below && <span className="shrink-0 pl-2 text-xs text-muted-foreground">{detail}</span>}
            <SelectPrimitive.ItemIndicator
                render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
            >
                <CheckIcon className="pointer-events-none" />
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    )
}

export type SelectSeparatorProps = SelectPrimitive.Separator.Props

function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
    return (
        <SelectPrimitive.Separator
            data-slot="select-separator"
            className={cn('pointer-events-none -mx-1 my-1 h-px bg-border', className)}
            {...props}
        />
    )
}

export type SelectScrollUpButtonProps = React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>

function SelectScrollUpButton({ className, ...props }: SelectScrollUpButtonProps) {
    return (
        <SelectPrimitive.ScrollUpArrow
            data-slot="select-scroll-up-button"
            className={cn(
                "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <ChevronUpIcon />
        </SelectPrimitive.ScrollUpArrow>
    )
}

export type SelectScrollDownButtonProps = React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>

function SelectScrollDownButton({ className, ...props }: SelectScrollDownButtonProps) {
    return (
        <SelectPrimitive.ScrollDownArrow
            data-slot="select-scroll-down-button"
            className={cn(
                "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}
        >
            <ChevronDownIcon />
        </SelectPrimitive.ScrollDownArrow>
    )
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
}
